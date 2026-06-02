import path from 'node:path';
import _ from 'lodash';
import fs from './fs.js';
import config from './config.js';
import drivers from '../drivers/index.js';
import output from './output.js';

const CACHE_PATH = path.normalize(process.env.HOME + '/.bitcar/cache.json');

export default async function getSourceData(forceRefresh = false) {
    const rc = config.get();
    if (fs.exists(CACHE_PATH) && !forceRefresh) {
        return fs.readJSON(CACHE_PATH);
    }

    output.log('Loading cache...');
    const selected = _.pick(drivers, _.map(rc.drivers, (v) => v.type));

    const entries = await Promise.all(
        _.map(selected, async (driver, key) => {
            const repos = _.flow(_.flattenDeep, _.compact)(await driver.getConfiguredRepos(rc));
            const host = _.find(rc.drivers, { type: key }).host;
            return [host, _.uniqBy(repos, 'name')];
        })
    );

    const sourceData = _.fromPairs(entries);
    fs.writeJSON(CACHE_PATH, sourceData);
    output.log('Cache set successfully');
    return sourceData;
}
