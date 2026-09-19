const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'app.js',
  'package.json',
  'Dockerfile',
  'docker-compose.yml',
  'routes',
  'views'
];

for (const file of requiredFiles) {
  assert.ok(
    fs.existsSync(path.join(root, file)),
    `Required project item is missing: ${file}`
  );
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
);

assert.strictEqual(packageJson.name, 'goof', 'Unexpected package name');
assert.ok(
  packageJson.scripts && packageJson.scripts.start,
  'The start script is missing'
);

console.log(
  'Smoke test passed: project structure, package metadata and start command are present.'
);
