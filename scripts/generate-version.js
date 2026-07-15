const fs = require('fs');
const path = require('path');

const packagePath = path.join(__dirname, '..', 'package.json');
const outputPath = path.join(__dirname, '..', 'src', 'environments', 'version.ts');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageJson.version;

const content = `// This file is auto-generated during build. Do not edit manually.
export const APP_VERSION = '${version}';
`;

const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, content);
console.log(`Version file generated: ${version}`);
