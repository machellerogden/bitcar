import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bitcar-test-'));

process.env.HOME = tmp;
process.env.BITCAR_WORKSPACE_DIR = path.join(tmp, 'workspace');

fs.mkdirSync(path.join(tmp, '.bitcar'), { recursive: true });
fs.copyFileSync(
    path.join(here, 'fixtures', 'cache.json'),
    path.join(tmp, '.bitcar', 'cache.json')
);
