import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['backend', 'public/static', 'scripts', 'tests'];
const files = [];

function collectJavaScriptFiles(directory) {
    for (const entry of readdirSync(directory)) {
        const fullPath = join(directory, entry);
        const stats = statSync(fullPath);

        if (stats.isDirectory()) {
            collectJavaScriptFiles(fullPath);
            continue;
        }

        if (entry.endsWith('.js')) {
            files.push(fullPath);
        }
    }
}

for (const root of roots) {
    collectJavaScriptFiles(root);
}

let failed = false;
for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], {
        stdio: 'inherit'
    });

    if (result.status !== 0) {
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}

console.log(`Checked ${files.length} JavaScript files.`);
