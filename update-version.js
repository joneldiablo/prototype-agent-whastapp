const fs = require('fs');
const path = require('path');

const [, , targetPath] = process.argv;

const resolvedPath = path.resolve(__dirname, targetPath ?? 'package.json');

if (!fs.existsSync(resolvedPath)) {
  console.error(`Cannot find package.json at ${resolvedPath}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

const segments = pkg.version.split('.');
const last = segments.pop() ?? '0';
const numericPart = last.split('-')[0];
const base = Number.parseInt(numericPart, 10);
const bumped = Number.isNaN(base) ? 1 : base + 1;
segments.push(String(bumped));

pkg.version = segments.join('.');

fs.writeFileSync(resolvedPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(pkg.version);