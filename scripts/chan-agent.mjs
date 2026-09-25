#!/usr/bin/env node
// Hook PreToolUse của plugin bangiao: ràng buộc cứng cho từng agent của dây chuyền.
// Hook chạy cho mọi lệnh gọi công cụ trong phiên, nhưng chỉ can thiệp theo agent_type:
//   - bangiao:planner: chỉ đọc, chỉ được ghi .bangiao/ke-hoach.md.
//   - bangiao:coder:   làm việc bình thường, nhưng không chạy lệnh phá hủy hay không đảo ngược
//                      được (luật thép của coder) và không sửa kế hoạch.
// Luồng chính và các agent khác đi qua nguyên vẹn.
//
// Việc kiểm lệnh shell là heuristic: nó chặn những cách phổ biến, không phải một sandbox.
// Prompt của từng agent vẫn là hàng rào chính.
//
// Chặn: exit 2, lý do ghi ra stderr (Claude Code chuyển lý do này cho agent).
// Mọi lỗi của chính hook (JSON hỏng, thiếu trường) đều cho qua, để hook không làm kẹt phiên.

import { appendFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PLANNER = 'bangiao:planner';
export const CODER = 'bangiao:coder';

const CONG_CU_GHI_FILE = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const CONG_CU_SHELL = new Set(['Bash', 'PowerShell']);

// Lệnh đứng đầu một đoạn mà bản thân nó đã thay đổi file hoặc hệ thống.
const LENH_GHI = new Set([
  'rm', 'rmdir', 'mv', 'cp', 'mkdir', 'touch', 'chmod', 'chown', 'chgrp', 'ln', 'tee',
  'dd', 'truncate', 'shred', 'install', 'patch', 'unzip', 'rsync', 'scp',
  // PowerShell / cmd
  'new-item', 'remove-item', 'set-content', 'add-content', 'out-file', 'copy-item',
  'move-item', 'rename-item', 'clear-content', 'set-itemproperty', 'new-itemproperty',
  'remove-itemproperty', 'expand-archive', 'compress-archive', 'invoke-webrequest',
  'ni', 'ri', 'del', 'erase', 'rd', 'copy', 'move', 'ren', 'md', 'xcopy', 'robocopy',
]);

// Trình quản lý gói: lệnh con nào làm thay đổi dependency hoặc file dự án.
const LENH_CON_GOI = {
  npm: ['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'un', 'update', 'up', 'upgrade',
    'ci', 'link', 'unlink', 'publish', 'dedupe', 'prune', 'init', 'create', 'version', 'pkg'],
  pnpm: ['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'update', 'up', 'upgrade', 'link',
    'unlink', 'publish', 'dedupe', 'prune', 'init', 'create', 'import'],
  yarn: ['install', 'add', 'remove', 'upgrade', 'up', 'link', 'unlink', 'publish', 'init',
    'create', 'dedupe', 'import', 'version'],
  bun: ['install', 'i', 'add', 'remove', 'rm', 'update', 'upgrade', 'link', 'unlink',
    'publish', 'init', 'create', 'pm'],
  pip: ['install', 'uninstall', 'download'],
  pip3: ['install', 'uninstall', 'download'],
  uv: ['add', 'remove', 'sync', 'lock', 'init', 'pip', 'tool', 'venv', 'python'],
  poetry: ['add', 'remove', 'install', 'update', 'lock', 'init', 'new', 'build', 'publish'],
  pipx: ['install', 'uninstall', 'upgrade', 'inject'],
  cargo: ['add', 'remove', 'install', 'uninstall', 'update', 'new', 'init', 'fix', 'fmt', 'publish'],
  go: ['get', 'install', 'mod', 'generate', 'fmt'],
  dotnet: ['add', 'remove', 'new', 'tool', 'workload', 'ef', 'format', 'nuget', 'publish'],
  composer: ['require', 'remove', 'install', 'update', 'create-project', 'init'],
  gem: ['install', 'uninstall', 'update'],
  bundle: ['install', 'update', 'add', 'remove'],
  brew: ['install', 'uninstall', 'upgrade', 'reinstall', 'link', 'unlink'],
  apt: ['install', 'remove', 'purge', 'upgrade'],
  'apt-get': ['install', 'remove', 'purge', 'upgrade', 'dist-upgrade'],
  choco: ['install', 'uninstall', 'upgrade'],
  winget: ['install', 'uninstall', 'upgrade'],
  scoop: ['install', 'uninstall', 'update'],
  docker: ['run', 'rm', 'rmi', 'build', 'compose', 'exec', 'start', 'stop', 'kill', 'push',
    'pull', 'create', 'cp', 'volume', 'network', 'system', 'image', 'container'],
  prisma: ['migrate', 'db', 'generate', 'init'],
  alembic: ['upgrade', 'downgrade', 'revision', 'stamp', 'init'],
};

// Lệnh git chỉ đọc. Mọi lệnh git khác đều bị chặn.
const GIT_CHI_DOC = new Set([
  'status', 'log', 'show', 'diff', 'blame', 'annotate', 'grep', 'ls-files', 'ls-tree',
  'ls-remote', 'rev-parse', 'rev-list', 'describe', 'shortlog', 'cat-file', 'reflog',
  'name-rev', 'merge-base', 'for-each-ref', 'count-objects', 'whatchanged', 'show-ref',
  'show-branch', 'version', 'help', 'check-ignore', 'var',
]);

export function laFileKeHoach(filePath, cwd) {
  if (typeof filePath !== 'string' || filePath === '') return false;
  const tuyetDoi = path.resolve(cwd || process.cwd(), filePath);
  const phan = tuyetDoi.split(/[\\/]+/).filter(Boolean).map((p) => p.toLowerCase());
  return phan.length >= 2 && phan.at(-2) === '.bangiao' && phan.at(-1) === 'ke-hoach.md';
}

// Thay nội dung trong nháy bằng chuỗi rỗng, để ký tự đặc biệt bên trong chuỗi
// (như "a>b" hay 'x; rm') không bị hiểu nhầm là toán tử shell.
function boNoiDungTrongNhay(lenh) {
  return lenh
    .replace(/'[^']*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function coChuyenHuongGhiFile(lenh) {
  const conLai = lenh
    .replace(/\d*>&\s*\d+/g, ' ') // 2>&1
    .replace(/&?\d*>>?\s*(\/dev\/null|nul|\$null)(?=\s|$|[;&|)])/gi, ' ') // > /dev/null, 2>nul, > $null
    .replace(/<<-?\s*\S+/g, ' '); // heredoc đầu vào, không phải ghi
  // `->` và `=>` là cú pháp của ngôn ngữ khác, thường nằm trong chuỗi; `>=` là so sánh.
  return /(^|[^-=<>])>{1,2}(?!=)/.test(conLai);
}

function tachDoan(lenh) {
  return lenh
    .split(/\|\||&&|[;|\n]|\$\(|`|\(|\)/)
    .map((d) => d.trim())
    .filter(Boolean);
}

function tachToken(doan) {
  const token = doan.split(/\s+/).filter(Boolean);
  // Bỏ gán biến môi trường đứng đầu (FOO=1 cmd), sudo/env/call-operator.
  while (token.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(token[0])
    || ['sudo', 'env', '&', 'command', 'exec', 'time', 'nohup'].includes(token[0].toLowerCase()))) {
    token.shift();
  }
  return token;
}

function tenLenh(token) {
  if (!token) return '';
  // /usr/bin/rm, C:\tools\npm.cmd, .\script.ps1 → rm, npm, script
  return path.basename(token.replace(/\\/g, '/')).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, '');
}

function kiemGitPlanner(token) {
  let i = 1;
  // Bỏ tuỳ chọn toàn cục: git -C dir, git -c k=v, git --no-pager
  while (i < token.length && token[i].startsWith('-')) {
    if (token[i] === '-C' || token[i] === '-c') i += 2;
    else i += 1;
  }
  const con = (token[i] || '').toLowerCase();
  const thamSo = token.slice(i + 1);
  if (con === '' || GIT_CHI_DOC.has(con)) return null;
  const chiCoCo = thamSo.every((t) => t.startsWith('-'));
  if (con === 'branch' && chiCoCo && !thamSo.some((t) => /^-(d|D|m|M|c|C|f)$|^--(delete|move|copy|force|set-upstream|unset-upstream|edit-description)/.test(t))) return null;
  if (con === 'tag' && (thamSo.length === 0 || thamSo.every((t) => ['-l', '--list', '-n'].includes(t) || !t.startsWith('-')) && thamSo.some((t) => ['-l', '--list'].includes(t)))) return null;
  if (con === 'remote' && (thamSo.length === 0 || thamSo[0] === '-v' || ['show', 'get-url'].includes(thamSo[0]))) return null;
  if (con === 'config' && thamSo.some((t) => ['--get', '--get-all', '--get-regexp', '--list', '-l'].includes(t))) return null;
  if (con === 'stash' && ['list', 'show'].includes(thamSo[0])) return null;
  if (con === 'worktree' && thamSo[0] === 'list') return null;
  return `git ${con} làm thay đổi repo`;
}

function kiemDoanPlanner(doan) {
  const token = tachToken(doan);
  if (token.length === 0) return null;
  const lenh = tenLenh(token[0]);
  const thamSo = token.slice(1);
  const con = (thamSo.find((t) => !t.startsWith('-')) || '').toLowerCase();

  if (LENH_GHI.has(lenh)) return `lệnh ${lenh} thay đổi file`;
  if ((lenh === 'sed' || lenh === 'perl') && thamSo.some((t) => /^-[a-zA-Z]*i/.test(t) || t.startsWith('--in-place'))) {
    return `${lenh} -i sửa file tại chỗ`;
  }
  if (lenh === 'git') return kiemGitPlanner(token);
  if (lenh === 'yarn' && thamSo.length === 0) return 'yarn (không tham số) cài dependency';
  if (LENH_CON_GOI[lenh]) {
    if (LENH_CON_GOI[lenh].includes(con)) return `${lenh} ${con} thay đổi dependency hoặc môi trường`;
    if (lenh === 'dotnet' && con === 'ef' && /database\s+update|migrations\s+(add|remove)/i.test(doan)) return 'dotnet ef đổi database';
    return null;
  }
  if ((lenh === 'python' || lenh === 'python3' || lenh === 'py') && /-m\s+pip\s+(install|uninstall)/.test(doan)) {
    return 'pip install thay đổi môi trường';
  }
  if (/\bmigrate\b|db:(migrate|push|seed|drop|reset|rollback)|\bdb\s+push\b|database\s+update/i.test(doan)
    && /^(php|rails|rake|bin\/rails|npx|pnpm|yarn|bun|node|knex|sequelize|typeorm|flyway|liquibase|manage\.py|python|python3|dotnet|diesel|sqlx|goose|migrate)$/.test(lenh)) {
    return 'lệnh migration thay đổi database';
  }
  if (lenh === 'curl' && thamSo.some((t) => /^-[a-zA-Z]*[oO]$|^--output|^--remote-name/.test(t))) return 'curl ghi file tải về';
  if (lenh === 'wget' && !thamSo.some((t) => t === '--spider' || /^-q?O-$/.test(t)) && !/-O\s+-(\s|$)/.test(doan)) return 'wget ghi file tải về';
  if (lenh === 'find' && /\s-(delete|exec|execdir|ok)\b/.test(doan)) return 'find -delete/-exec có thể sửa hoặc xoá file';
  if (lenh === 'xargs') return kiemDoanPlanner(thamSo.filter((t) => !t.startsWith('-')).join(' '));
  if (lenh === 'tar' && thamSo.some((t) => /^-?[a-zA-Z]*[xc]/.test(t))) return 'tar giải nén hoặc tạo file';
  return null;
}

export function kiemLenhPlanner(lenh) {
  if (typeof lenh !== 'string' || lenh.trim() === '') return null;
  const sach = boNoiDungTrongNhay(lenh);
  if (coChuyenHuongGhiFile(sach)) return 'chuyển hướng > / >> ghi ra file';
  for (const doan of tachDoan(sach)) {
    const lyDo = kiemDoanPlanner(doan);
    if (lyDo) return lyDo;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Coder: được sửa code, cài gói, chạy test. Chỉ chặn thao tác phá hủy / không đảo ngược được.

// Thư mục sinh ra khi build/cài đặt, xoá đệ quy được vì tạo lại được.
// Không có `bin/`: nhiều repo để script nguồn ở đó.
const THU_MUC_BUILD = new Set([
  'dist', 'build', 'out', '.next', '.nuxt', '.output', '.turbo', '.cache', '.parcel-cache',
  '.svelte-kit', '.vite', '.angular', 'coverage', '.nyc_output', 'node_modules',
  '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache', '.tox', 'target', 'obj',
  'tmp', '.tmp', 'temp',
]);

const LENH_XOA = new Set(['rm', 'remove-item', 'ri', 'del', 'erase', 'rd', 'rmdir']);

export function laThuMucBuild(p) {
  if (typeof p !== 'string' || p === '' || /[*?]/.test(p)) return false;
  const chuan = p.replace(/\\/g, '/').replace(/\/+$/, '');
  if (chuan.startsWith('/') || chuan.startsWith('~') || /^[a-zA-Z]:/.test(chuan)) return false;
  const phan = chuan.split('/').filter((x) => x && x !== '.');
  if (phan.length === 0 || phan.includes('..')) return false;
  return phan.some((x) => THU_MUC_BUILD.has(x.toLowerCase()));
}

function laCoDeQuy(t) {
  return /^-[a-zA-Z]{1,3}$/.test(t) && /r/i.test(t)
    || /^--?recurs/i.test(t)
    || t.toLowerCase() === '/s';
}

function tachGit(token) {
  let i = 1;
  while (i < token.length && token[i].startsWith('-')) {
    if (token[i] === '-C' || token[i] === '-c') i += 2;
    else i += 1;
  }
  return { con: (token[i] || '').toLowerCase(), thamSo: token.slice(i + 1) };
}

function kiemGitCoder(token) {
  const { con, thamSo } = tachGit(token);
  const co = (...ds) => thamSo.some((t) => ds.includes(t));
  if (con === 'reset' && co('--hard', '--merge', '--keep')) return 'git reset --hard xoá thay đổi chưa commit';
  if (con === 'clean' && !co('-n', '--dry-run')) return 'git clean xoá file chưa được theo dõi';
  if (con === 'checkout' && (co('-f', '--force') || thamSo.includes('.'))) return 'git checkout huỷ thay đổi trong thư mục làm việc';
  if (con === 'restore' && thamSo.includes('.') && (!co('--staged', '-S') || co('--worktree', '-W'))) {
    return 'git restore . huỷ thay đổi trong thư mục làm việc';
  }
  if (con === 'push' && thamSo.some((t) => /^(-f|--force|--force-with-lease(=.*)?|--force-if-includes|-d|--delete|--mirror|--prune)$/.test(t)
    || /^\+/.test(t) || /^:/.test(t))) {
    return 'git push ép ghi đè hoặc xoá nhánh trên remote';
  }
  if (con === 'branch' && thamSo.some((t) => /^--delete$|^-[a-zA-Z]*[dD]/.test(t))) return 'git branch xoá nhánh';
  if (con === 'stash' && ['drop', 'clear'].includes(thamSo[0])) return 'git stash drop/clear xoá stash';
  if (con === 'update-ref' && co('-d')) return 'git update-ref -d xoá ref';
  return null;
}

// Công cụ triển khai / phát hành: lệnh con nào gửi thứ gì ra môi trường bên ngoài.
const LENH_TRIEN_KHAI = {
  vercel: ['', 'deploy', 'promote', 'rollback', 'remove', 'rm', 'redeploy', 'alias'],
  netlify: ['deploy'],
  firebase: ['deploy'],
  fly: ['deploy', 'destroy'],
  flyctl: ['deploy', 'destroy'],
  wrangler: ['deploy', 'publish', 'delete'],
  railway: ['up', 'down', 'delete'],
  heroku: ['releases:rollback', 'apps:destroy', 'pg:reset'],
  kubectl: ['apply', 'delete', 'create', 'replace', 'patch', 'scale', 'rollout', 'set', 'drain', 'cordon'],
  helm: ['install', 'upgrade', 'uninstall', 'delete', 'rollback'],
  terraform: ['apply', 'destroy', 'import'],
  tofu: ['apply', 'destroy', 'import'],
  pulumi: ['up', 'destroy'],
  serverless: ['deploy', 'remove'],
  sls: ['deploy', 'remove'],
  eb: ['deploy', 'terminate'],
  twine: ['upload'],
  gh: ['release', 'repo', 'pr', 'issue', 'secret', 'workflow'],
};
const LENH_PHAT_HANH = { npm: ['publish', 'unpublish', 'deprecate'], pnpm: ['publish'], yarn: ['publish', 'npm'], bun: ['publish'], cargo: ['publish', 'yank'], docker: ['push'], dotnet: ['nuget'] };

const CLIENT_DB = /\b(psql|mysql|mariadb|sqlite3|sqlcmd|mongosh|mongo|redis-cli|clickhouse-client|cqlsh)\b/i;
const SQL_PHA_HUY = /\bdrop\s+(database|schema|table|collection)\b|\btruncate\b|\bflushall\b|\bflushdb\b|dropDatabase\s*\(|\bdelete\s+from\s+\w+\s*;?\s*$/im;
const ORM_PHA_HUY = /\bmigrate\s+reset\b|--force-reset|--accept-data-loss|db:(drop|reset|wipe|schema:load|purge)\b|migrate:(fresh|reset|refresh)\b|database\s+drop\b|manage\.py\s+(flush|reset_db)\b|schema:drop\b|migration:revert\b/i;
const CO_MIGRATION = /migrat|db:|database\s+update|upgrade\s+head|\bdb\s+push\b|\bflyway\b|\bliquibase\b/i;
const MOI_TRUONG_PROD = /\bprod(uction)?\b|migrate\s+deploy\b/i;

function kiemDoanCoder(doan) {
  const token = tachToken(doan);
  if (token.length === 0) return null;
  const lenh = tenLenh(token[0]);
  const thamSo = token.slice(1);
  const con = (thamSo.find((t) => !t.startsWith('-')) || '').toLowerCase();

  if (LENH_XOA.has(lenh) && thamSo.some(laCoDeQuy)) {
    const duongDan = thamSo.filter((t) => !t.startsWith('-') && t.toLowerCase() !== '/s' && t.toLowerCase() !== '/q');
    const ngoaiBuild = duongDan.filter((p) => !laThuMucBuild(p));
    if (duongDan.length === 0 || ngoaiBuild.length > 0) {
      return `xoá đệ quy ngoài thư mục build (${ngoaiBuild.join(', ') || 'không rõ đường dẫn'})`;
    }
  }
  if (lenh === 'git') return kiemGitCoder(token);
  if (lenh === 'dropdb') return 'dropdb xoá database';
  if (lenh === 'xargs') {
    // Giữ nguyên cờ của lệnh được xargs chạy (xargs rm -rf), chỉ bỏ cờ của chính xargs.
    const batDau = thamSo.findIndex((t) => !t.startsWith('-'));
    return batDau < 0 ? null : kiemDoanCoder(thamSo.slice(batDau).join(' '));
  }

  if (LENH_TRIEN_KHAI[lenh]) {
    if (lenh === 'gh') {
      const sau = thamSo.filter((t) => !t.startsWith('-')).slice(1, 2)[0] || '';
      const docThoi = ['view', 'list', 'status', 'diff', 'checks', 'download'];
      if (['pr', 'issue', 'release', 'repo', 'secret', 'workflow'].includes(con) && !docThoi.includes(sau)) {
        return `gh ${con} ${sau} thay đổi dữ liệu trên GitHub`;
      }
    } else if (LENH_TRIEN_KHAI[lenh].includes(con) || thamSo.includes('--prod')) {
      return `${lenh} ${con} triển khai hoặc thay đổi môi trường bên ngoài`;
    }
  }
  if (LENH_PHAT_HANH[lenh]?.includes(con)) return `${lenh} ${con} phát hành ra bên ngoài`;
  if (lenh === 'aws' && /\b(deploy|rm|delete-[\w-]+|terminate-[\w-]+|update-function-code|put-[\w-]+)\b/.test(doan)) {
    return 'aws thay đổi tài nguyên cloud';
  }
  return null;
}

export function kiemLenhCoder(lenh) {
  if (typeof lenh !== 'string' || lenh.trim() === '') return null;
  // SQL thường nằm trong nháy (psql -c "DROP TABLE …"), nên kiểm trên lệnh gốc,
  // nhưng chỉ khi có client database để không chặn nhầm grep "DROP TABLE".
  if (CLIENT_DB.test(lenh) && SQL_PHA_HUY.test(lenh)) return 'câu lệnh SQL xoá dữ liệu hoặc cấu trúc database';
  if (ORM_PHA_HUY.test(lenh)) return 'lệnh xoá hoặc làm lại database';
  if (CO_MIGRATION.test(lenh) && MOI_TRUONG_PROD.test(lenh)) return 'migration trên môi trường production';
  for (const doan of tachDoan(boNoiDungTrongNhay(lenh))) {
    const lyDo = kiemDoanCoder(doan);
    if (lyDo) return lyDo;
  }
  return null;
}

function kiemTraCoder(tool, ti, cwd) {
  if (CONG_CU_GHI_FILE.has(tool)) {
    const file = ti.file_path ?? ti.notebook_path ?? ti.path;
    if (laFileKeHoach(file, cwd)) {
      return 'Coder không được sửa .bangiao/ke-hoach.md. Kế hoạch sai hoặc thiếu thì ghi vào '
        + '"Khác với kế hoạch" trong thay-doi.md, trả trạng thái BỊ CHẶN hoặc XONG MỘT PHẦN để planner sửa.';
    }
    if (typeof file === 'string' && file.split(/[\\/]+/).includes('.git')) return 'Coder không được sửa thư mục .git.';
    return null;
  }
  if (CONG_CU_SHELL.has(tool)) {
    const lyDo = kiemLenhCoder(ti.command);
    if (!lyDo) return null;
    return `Lệnh bị chặn theo luật thép của coder: ${lyDo}. Không tìm đường vòng; `
      + 'nếu kế hoạch thật sự cần thao tác này, ghi vào báo cáo như một chỗ lệch cấp 2 để người dùng tự làm.';
  }
  return null;
}

// ---------------------------------------------------------------------------

// Trả về lý do chặn, hoặc null nếu cho qua.
export function kiemTra(input) {
  if (!input) return null;
  const tool = input.tool_name;
  const ti = input.tool_input || {};
  if (input.agent_type === CODER) return kiemTraCoder(tool, ti, input.cwd);
  if (input.agent_type !== PLANNER) return null;

  if (CONG_CU_GHI_FILE.has(tool)) {
    const file = ti.file_path ?? ti.notebook_path ?? ti.path;
    if (laFileKeHoach(file, input.cwd)) return null;
    return `Planner chỉ được ghi .bangiao/ke-hoach.md, không được ghi "${file}". `
      + 'Nếu thấy file này cần sửa, đưa việc đó vào kế hoạch (task cho coder) hoặc vào câu hỏi cho người dùng.';
  }

  if (CONG_CU_SHELL.has(tool)) {
    const lyDo = kiemLenhPlanner(ti.command);
    if (!lyDo) return null;
    return `Planner chỉ được chạy lệnh chỉ đọc; lệnh này bị chặn vì ${lyDo}. `
      + 'Dùng Read/Grep/Glob hoặc một lệnh chỉ đọc để lấy thông tin. Không tìm đường vòng; '
      + 'nếu thật sự cần thao tác này, ghi nó thành task hoặc câu hỏi trong kế hoạch.';
  }
  return null;
}

// Đặt BANGIAO_HOOK_LOG=<đường dẫn file> để ghi mỗi lần hook chạy (gỡ lỗi khi hook
// không chặn như mong đợi, ví dụ agent_type có dạng khác).
function ghiNhatKy(input, lyDo) {
  const file = process.env.BANGIAO_HOOK_LOG;
  if (!file) return;
  try {
    const lenh = input.tool_input?.command ?? input.tool_input?.file_path ?? '';
    appendFileSync(file, `${new Date().toISOString()}\t${input.agent_type ?? '(luồng chính)'}\t${input.tool_name}\t${lyDo ? 'CHẶN' : 'qua'}\t${String(lenh).slice(0, 200)}\n`);
  } catch {
    // Nhật ký chỉ để gỡ lỗi; ghi không được thì bỏ qua.
  }
}

function chay() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.exit(0);
  }
  const lyDo = kiemTra(input);
  ghiNhatKy(input, lyDo);
  if (lyDo) {
    process.stderr.write(`[bangiao] ${lyDo}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  chay();
}
