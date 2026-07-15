const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packagePath = path.join(__dirname, '..', 'package.json');
const level = process.argv[2] || 'patch';

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const [major, minor, patch] = packageJson.version.split('.').map(Number);

let newVersion;
switch (level) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

packageJson.version = newVersion;
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

try {
  execSync(`git add package.json`, { stdio: 'pipe' });
  execSync(`git commit -m "chore: bump version to v${newVersion}"`, { stdio: 'pipe' });
  execSync(`git tag v${newVersion}`, { stdio: 'pipe' });
  console.log(`Version bumped to v${newVersion} (tag created)`);
} catch (error) {
  console.error('Git operations failed:', error.message);
  process.exit(1);
}
