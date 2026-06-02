import fs from 'node:fs';
import chalk from 'chalk';
import gitFactory from './gitFactory.js';
import output from './output.js';

export default async function status(sourceResult) {
    if (!fs.existsSync(sourceResult.repoDir)) {
        return sourceResult;
    }
    const git = gitFactory.getInstance(sourceResult.repoDir, false);
    try {
        const result = await git.status();
        output.log(`${sourceResult.name}: ${result.isClean() ? chalk.green('clean') : chalk.red('dirty')}`);
        if (!result.isClean()) {
            output.log(`${JSON.stringify(result, null, 4)}`);
        }
    } catch (err) {
        output.error(err.message || err);
    }
    return sourceResult;
}
