import _ from 'lodash';
import getSourceResult from './getSourceResult.js';
import output from './output.js';
import prompt from './prompt.js';
import { getWorkspaceDir } from './workspaceDir.js';

export default async function mapToHandler(options) {
    const { results, confirmMessage, errorMessage, handler } = options;
    const repos = await Promise.all(_.map(results, getSourceResult));
    _.each(repos, (r) => output.log(r.name));

    const confirmed = await prompt.confirm({ message: confirmMessage, default: false });
    if (!confirmed) {
        throw new Error(errorMessage);
    }

    for (const repo of repos) {
        await handler(repo);
    }
    return { repoDir: getWorkspaceDir() };
}
