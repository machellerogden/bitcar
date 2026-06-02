import _ from 'lodash';
import path from 'node:path';

export default function getSearchTerm(options) {
    let searchTerm;
    let defaultToCurrent = _.pick(options, [
        'open',
        'edit',
        'create'
    ]);
    let defaultToWild = _.pick(options, [
        'completions',
        'clone-all',
        'pull-all',
        'status-all'
    ]);
    if (options._ && options._[0]) {
        searchTerm = _.escapeRegExp(String(options._[0]));
    } else if (_.keys(defaultToCurrent).length) {
        searchTerm = _.reduce(_.values(defaultToCurrent), (acc, value) => {
            return _.isString(value) ? value : acc;
        }, '^' + _.takeRight(process.cwd().split(path.sep), 3).join(path.sep) + '$');
    } else if (_.keys(defaultToWild).length) {
        searchTerm = _.reduce(_.values(defaultToWild), (acc, value) => {
            return _.isString(value) ? value : acc;
        }, '.*');
    }
    return searchTerm;
}
