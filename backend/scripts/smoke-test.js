const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const projectRoot = path.join(root, '..');

function listJsFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules') return [];
            return listJsFiles(fullPath);
        }
        return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
    });
}

function run(command, args, cwd = root) {
    const executable = command === 'node' ? process.execPath : command;
    const result = spawnSync(executable, args, { cwd, encoding: 'utf8' });
    if (result.status !== 0) {
        process.stdout.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        throw new Error(`${command} ${args.join(' ')} fallo`);
    }
}

for (const file of listJsFiles(path.join(root, 'src')).concat([path.join(root, 'index.js')])) {
    run('node', ['--check', file]);
}

for (const file of listJsFiles(path.join(projectRoot, 'frontend', 'js'))) {
    run('node', ['--check', file]);
}

console.log('Smoke test OK: sintaxis JS backend/frontend valida');
