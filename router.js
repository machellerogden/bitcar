import _ from 'lodash';
import path from 'node:path';
import pkg from './package.json' with { type: 'json' };
import output from './lib/output.js';
import getSearchTerm from './lib/getSearchTerm.js';
import mapToHandler from './lib/mapToHandler.js';
import syncExisting from './lib/syncExisting.js';
import getSourceData from './lib/getSourceData.js';
import getSourceResult from './lib/getSourceResult.js';
import getPaths from './lib/getPaths.js';
import maybeClone from './lib/maybeClone.js';
import maybePull from './lib/maybePull.js';
import createRepo from './lib/createRepo.js';
import openInBrowser from './lib/openInBrowser.js';
import status from './lib/status.js';
import prompt from './lib/prompt.js';

export default async function router(options) {
    const searchTerm = getSearchTerm(options);

    if (options.version) {
        output.log(pkg.version);
        return;
    }

    if (options.setup) {
        const setup = (await import('./setup.js')).default;
        return setup();
    }

    if (options['sync-existing']) {
        return syncExisting();
    }

    if (options['create']) {
        return createRepo(searchTerm);
    }

    if (options.refresh) {
        return getSourceData(true);
    }

    const sourceData = await getSourceData();
    const results = getPaths(sourceData).filter((v) => new RegExp(searchTerm, 'i').test(v));

    if (options.completions) {
        results.forEach((result) => output.log(_.tail(result.split(path.sep)).join(path.sep)));
        return;
    }

    if (results.length && options['clone-all']) {
        return mapToHandler({
            results,
            confirmMessage: 'Are you sure you want clone all of the above?',
            errorMessage: 'Clone all aborted',
            handler: maybeClone
        });
    }

    if (results.length && options['pull-all']) {
        return mapToHandler({
            results,
            confirmMessage: 'Are you sure you want pull all of the above?',
            errorMessage: 'Pull all aborted',
            handler: (r) => maybeClone(r).then(maybePull)
        });
    }

    if (results.length && options['status-all']) {
        return mapToHandler({
            results,
            confirmMessage: 'Are you sure you want check status on all of the above?',
            errorMessage: 'Status all aborted',
            handler: status
        });
    }

    let result;
    if (results.length > 1) {
        const choice = await prompt.select({
            message: 'search results',
            choices: results.map((r) => ({ name: r, value: r }))
        });
        result = await getSourceResult(choice);
    } else if (results.length) {
        result = await getSourceResult(results[0]);
    } else {
        throw new Error('No results.');
    }

    if (options.open) {
        result = await openInBrowser(result);
    }

    return maybeClone(result);
}
