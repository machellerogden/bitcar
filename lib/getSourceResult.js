import path from 'node:path';
import _ from 'lodash';
import { getWorkspaceDir } from './workspaceDir.js';
import getSourceData from './getSourceData.js';

export default async function getSourceResult(repoDir) {
    const repoParts = repoDir.split(path.sep);
    const sourceName = repoParts.shift();
    const repoName = repoParts.join(path.sep);
    const sourceData = await getSourceData();
    const sourceResult = _.find(sourceData[sourceName], { name: repoName });
    sourceResult.repoDir = path.join(getWorkspaceDir(), repoDir);
    return sourceResult;
}
