import path from 'node:path';
import fs from './fs.js';

const TARGET_PATH = path.normalize(process.env.HOME + '/.bitcar/.bitcar_target');

export default function setTarget(sourceResult) {
    if (sourceResult && sourceResult.repoDir) {
        fs.write(TARGET_PATH, sourceResult.repoDir);
        return sourceResult.repoDir;
    }
}
