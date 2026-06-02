import path from 'node:path';
import _ from 'lodash';
import { readdirp } from 'readdirp';
import fs from './fs.js';
import { getWorkspaceDir } from './workspaceDir.js';
import config from './config.js';
import output from './output.js';

const CACHE_PATH = path.normalize(process.env.HOME + '/.bitcar/cache.json');

export default async function syncExisting() {
    output.log('Attempting to sync existing workspace with cache...');
    const workspaceDir = getWorkspaceDir();
    const cache = fs.readJSON(CACHE_PATH);
    const rc = config.get();
    const hosts = _.map(rc.drivers, 'host');
    const paths = _.map(hosts, (host) => path.join(workspaceDir, host));

    function resultFilter(fullPath) {
        return _.some(paths, (p) => new RegExp('^' + _.escapeRegExp(p) + '.+\\/.+').test(fullPath));
    }

    let entries = [];
    for await (const entry of readdirp(workspaceDir, { type: 'directories', depth: 2 })) {
        if (resultFilter(entry.fullPath)) {
            const resultArr = entry.fullPath.split(path.sep);
            const host = resultArr[resultArr.length - 3];
            const name = _.takeRight(resultArr, 2).join(path.sep);
            entries.push({ host, name });
        }
    }

    const grouped = _.reduce(entries, (acc, entry) => {
        if (!acc[entry.host]) acc[entry.host] = [];
        acc[entry.host].push({ name: entry.name });
        return acc;
    }, {});

    const sourceData = _.reduce(_.union(_.keys(grouped), _.keys(cache)), (kacc, key) => {
        kacc[key] = _.reduce(_.union(_.map(cache[key], 'name'), _.map(grouped[key], 'name')), (eacc, name) => {
            eacc.push(_.assign({}, _.find(grouped[key], { name }), _.find(cache[key], { name })));
            return eacc;
        }, []);
        return kacc;
    }, {});

    sourceData['github.com'] = _.map(sourceData['github.com'] || [], (repo) => {
        if (!repo.clone) repo.clone = 'https://github.com/' + repo.name + '.git';
        if (!repo.html) repo.html = 'https://github.com/' + repo.name;
        return repo;
    });

    fs.writeJSON(CACHE_PATH, sourceData);
    output.log('Cache set successfully');
    return sourceData;
}
