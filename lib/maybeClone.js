import fs from 'node:fs';
import { getWorkspaceDir } from './workspaceDir.js';
import output from './output.js';
import gitFactory from './gitFactory.js';

let git;

export default async function maybeClone(sourceResult) {
    if (!git) {
        git = gitFactory.getInstance(getWorkspaceDir());
    }
    if (!fs.existsSync(sourceResult.repoDir)) {
        try {
            await git.clone(sourceResult.clone, sourceResult.repoDir);
        } catch (err) {
            output.error(err.message || err);
        }
    }
    return sourceResult;
}
