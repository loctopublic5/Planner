// Chạy: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { kiemTra, kiemLenhPlanner, kiemLenhCoder, laFileKeHoach, laThuMucBuild, PLANNER, CODER } from '../scripts/chan-agent.mjs';

const CWD = process.platform === 'win32' ? 'D:\\du-an' : '/du-an';
const goi = (tool_name, tool_input, agent_type = PLANNER) => kiemTra({ agent_type, tool_name, tool_input, cwd: CWD });

test('không đụng tới luồng chính và agent khác', () => {
  assert.equal(goi('Write', { file_path: 'src/a.ts' }, null), null);
  assert.equal(goi('Bash', { command: 'rm -rf src' }, 'coder-agent'), null);
  assert.equal(goi('Bash', { command: 'npm install' }, 'bangiao:reviewer'), null);
});

test('planner chỉ ghi được .bangiao/ke-hoach.md', () => {
  assert.equal(goi('Write', { file_path: '.bangiao/ke-hoach.md' }), null);
  assert.equal(goi('Edit', { file_path: path.join(CWD, '.bangiao', 'ke-hoach.md') }), null);
  assert.equal(goi('Write', { file_path: 'D:/khac/.bangiao/KE-HOACH.md' }), null);
  assert.match(goi('Write', { file_path: 'src/index.ts' }), /chỉ được ghi/);
  assert.match(goi('Edit', { file_path: '.bangiao/thay-doi.md' }), /chỉ được ghi/);
  assert.match(goi('Write', { file_path: 'ke-hoach.md' }), /chỉ được ghi/);
  assert.match(goi('NotebookEdit', { notebook_path: 'a.ipynb' }), /chỉ được ghi/);
});

test('laFileKeHoach từ chối đường dẫn rỗng', () => {
  assert.equal(laFileKeHoach('', CWD), false);
  assert.equal(laFileKeHoach(undefined, CWD), false);
});

const CHO_QUA = [
  'ls -la',
  'cat package.json',
  'grep -rn "a > b" src',
  "grep -rn 'x; rm -rf /' src",
  'git status --short',
  'git log --oneline -20',
  'git -C ../repo diff HEAD~1',
  'git --no-pager show HEAD:src/a.ts',
  'git branch -a',
  'git branch --show-current',
  'git remote -v',
  'git config --get user.name',
  'git stash list',
  'npm test',
  'npm run lint',
  'npm ls react',
  'pnpm test -- --run',
  'yarn test',
  'npx vitest run',
  'pytest -q 2>&1',
  'node --version 2>/dev/null',
  'ls missing 2>nul',
  'Get-ChildItem src | Select-Object -First 5',
  'Get-Content package.json',
  'find . -name "*.ts" -not -path "./node_modules/*"',
  'curl -s https://api.example.com',
  'wget -qO- https://example.com',
  'cat <<EOF\nabc\nEOF',
  'dotnet test',
  'go test ./...',
  'cargo test',
  'python -m pytest',
  'docker ps',
  'tar -tf a.tar',
  'if [ $a -gt 1 ]; then echo ok; fi',
];

for (const lenh of CHO_QUA) {
  test(`planner cho qua: ${lenh.split('\n')[0]}`, () => {
    assert.equal(kiemLenhPlanner(lenh), null);
  });
}

const BI_CHAN = [
  'rm -rf node_modules',
  'mkdir .bangiao',
  'echo x > src/a.ts',
  'echo x >> notes.md',
  'cat a | tee b',
  'ls && rm a',
  "sed -i 's/a/b/' src/a.ts",
  'perl -pi -e "s/a/b/" f',
  'git add .',
  'git commit -m x',
  'git checkout -- .',
  'git reset --hard',
  'git branch -D old',
  'git stash',
  'git -C ../x push',
  'npm install lodash',
  'npm i',
  'pnpm add zod',
  'yarn',
  'yarn add zod',
  'pip install requests',
  'python -m pip install requests',
  'uv add httpx',
  'cargo add serde',
  'go get example.com/x',
  'dotnet add package Newtonsoft.Json',
  'composer require guzzlehttp/guzzle',
  'npx prisma migrate dev',
  'prisma db push',
  'php artisan migrate',
  'python manage.py migrate',
  'alembic upgrade head',
  'Remove-Item -Recurse dist',
  'Set-Content -Path a.txt -Value x',
  'New-Item -ItemType Directory .bangiao',
  'curl -o a.zip https://x',
  'wget https://x/a.zip',
  'find . -name "*.log" -delete',
  'find . -name "*.tmp" -exec rm {} \\;',
  'ls | xargs rm',
  'FOO=1 rm a',
  'sudo apt-get install jq',
  'docker compose up -d',
  'tar -xzf a.tgz',
  '/usr/bin/rm a',
  'echo $(rm a)',
];

for (const lenh of BI_CHAN) {
  test(`planner chặn: ${lenh}`, () => {
    assert.notEqual(kiemLenhPlanner(lenh), null);
  });
}

test('chạy như hook: exit 2 khi chặn, exit 0 khi cho qua hoặc input hỏng', () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'chan-agent.mjs');
  const chay = (input) => spawnSync(process.execPath, [script], { input, encoding: 'utf8' });

  const chan = chay(JSON.stringify({ agent_type: PLANNER, tool_name: 'Bash', tool_input: { command: 'npm install' }, cwd: CWD }));
  assert.equal(chan.status, 2);
  assert.match(chan.stderr, /\[bangiao\]/);

  const qua = chay(JSON.stringify({ agent_type: PLANNER, tool_name: 'Bash', tool_input: { command: 'npm test' }, cwd: CWD }));
  assert.equal(qua.status, 0);

  assert.equal(chay('không phải json').status, 0);
});

// --- Coder ------------------------------------------------------------------

test('coder ghi code bình thường nhưng không được sửa kế hoạch hay .git', () => {
  const coder = (tool, input) => goi(tool, input, CODER);
  assert.equal(coder('Write', { file_path: 'src/todo.js' }), null);
  assert.equal(coder('Edit', { file_path: '.bangiao/thay-doi.md' }), null);
  assert.match(coder('Edit', { file_path: '.bangiao/ke-hoach.md' }), /không được sửa/);
  assert.match(coder('Write', { file_path: '.git/config' }), /\.git/);
});

test('laThuMucBuild chỉ nhận thư mục build tương đối, không wildcard', () => {
  for (const p of ['dist', './dist/', 'packages/web/.next', 'node_modules', String.raw`src\__pycache__`, 'target']) {
    assert.equal(laThuMucBuild(p), true, p);
  }
  for (const p of ['src', '.', '/', '/dist', String.raw`C:\dist`, '~/dist', 'dist/../src', '*', 'dist/*', 'bin', '']) {
    assert.equal(laThuMucBuild(p), false, p);
  }
});

const CODER_CHO_QUA = [
  'npm install zod',
  'pnpm add -D vitest',
  'pip install requests',
  'npm test',
  'npm run build',
  'rm src/cu.js',
  'rm -f src/a.tmp',
  'rm -rf dist',
  'rm -rf node_modules .next coverage',
  'Remove-Item -Recurse -Force dist',
  'rmdir /s /q build',
  'mkdir -p src/utils',
  "sed -i 's/a/b/' src/a.ts",
  'git status',
  'git diff',
  'git add src/a.ts',
  'git stash list',
  'git restore --staged .',
  'git checkout -b tinh-nang-moi',
  'git branch -a',
  'npx prisma migrate dev --name them-truong',
  'npm run db:migrate',
  'grep -rn "DROP TABLE" src',
  'psql -c "SELECT count(*) FROM users"',
  'gh pr view 12',
  'gh run list',
  'docker ps',
  'npx vercel dev',
  'echo x > src/a.txt',
];

for (const lenh of CODER_CHO_QUA) {
  test(`coder cho qua: ${lenh}`, () => {
    assert.equal(kiemLenhCoder(lenh), null);
  });
}

const CODER_BI_CHAN = [
  'rm -rf src',
  'rm -rf .',
  'rm -rf /',
  'rm -rf ~/project',
  'rm -rf *',
  'rm -rf dist src',
  'rm -r ../other',
  'Remove-Item -Recurse -Force src',
  'rmdir /s /q src',
  'find . -name x | xargs rm -rf',
  'git reset --hard',
  'git reset --hard HEAD~1',
  'git clean -fd',
  'git checkout -- .',
  'git checkout .',
  'git checkout -f main',
  'git restore .',
  'git push --force',
  'git push -f origin main',
  'git push --force-with-lease',
  'git push origin +main',
  'git push origin --delete old',
  'git push origin :old',
  'git branch -D old',
  'git branch --delete old',
  'git stash drop',
  'git stash clear',
  'psql -c "DROP TABLE users"',
  'mysql -e "TRUNCATE orders"',
  'sqlite3 app.db "DROP TABLE users;"',
  'dropdb app',
  'npx prisma migrate reset --force',
  'npx prisma db push --accept-data-loss',
  'npx prisma migrate deploy',
  'rails db:drop',
  'RAILS_ENV=production rails db:migrate',
  'php artisan migrate:fresh',
  'NODE_ENV=production npm run migrate',
  'dotnet ef database drop',
  'python manage.py flush',
  'vercel --prod',
  'vercel deploy',
  'netlify deploy --prod',
  'firebase deploy',
  'kubectl apply -f k8s.yaml',
  'terraform apply',
  'npm publish',
  'docker push app:latest',
  'gh pr create --fill',
  'gh release create v1.0.0',
  'aws s3 rm s3://bucket --recursive',
];

for (const lenh of CODER_BI_CHAN) {
  test(`coder chặn: ${lenh}`, () => {
    assert.notEqual(kiemLenhCoder(lenh), null);
  });
}

test('chạy như hook với coder: exit 2 khi lệnh phá hủy', () => {
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'chan-agent.mjs');
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ agent_type: CODER, tool_name: 'Bash', tool_input: { command: 'git reset --hard' }, cwd: CWD }),
    encoding: 'utf8',
  });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /luật thép/);
});
