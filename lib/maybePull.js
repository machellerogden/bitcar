import fs from 'node:fs';
import gitFactory from './gitFactory.js';
import output from './output.js';

export default async function maybePull(sourceResult) {
    if (!fs.existsSync(sourceResult.repoDir)) {
        return sourceResult;
    }
    const git = gitFactory.getInstance(sourceResult.repoDir);
    const branch = sourceResult.default_branch || 'master';
    try {
        await git.checkout(branch);
        await git.pull('origin', branch, { '--rebase': 'true' });
    } catch (err) {
        output.error(err.message || err);
    }
    return sourceResult;
}
