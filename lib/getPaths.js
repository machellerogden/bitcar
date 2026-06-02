import _ from 'lodash';
import path from 'node:path';

export default function getPaths(sourceData) {
    let names = [];
    _.forIn(sourceData, (repos, sourceName) => {
        _.forEach(repos, (repo) => {
            names.push(path.normalize(sourceName + '/' + repo.name));
        });
    });
    return names;
}
