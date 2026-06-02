import _ from 'lodash';
import config from './config.js';
import drivers from '../drivers/index.js';

export default function createRepo(searchTerm) {
    if (searchTerm.startsWith('github.com')) {
        const githubConfig = _.find(config.get().drivers, { type: 'github' });
        return drivers.github.createRepo(githubConfig, {
            name: searchTerm.split('/').pop()
        });
    }
    return Promise.reject(new Error('create only supports github.com'));
}
