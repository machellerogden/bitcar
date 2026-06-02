import _ from 'lodash';
import http from '../../lib/http.js';
import prompt from '../../lib/prompt.js';
import output from '../../lib/output.js';

export default { getConfiguredRepos };

// NOTE: The Bitbucket Server driver is DEPRECATED and UNTESTED. It is retained for
// backwards compatibility only and receives no active maintenance. Use at your own
// risk. See README for details.

async function getConfiguredRepos(config) {
    const bitbucketConfig = _.find(config.drivers, { type: 'bitbucket-server' });
    if (!bitbucketConfig || !bitbucketConfig.host) return [];

    output.error('WARNING: the bitbucket-server driver is deprecated and untested.');

    const host = bitbucketConfig.host;
    const username = await prompt.input({ message: `${host} username:` });
    const password = await prompt.password({ message: `${host} password:` });
    const auth = { username, password };

    const projectsRes = await http.request({
        url: `https://${host}/rest/api/1.0/projects/?limit=10000`,
        auth
    });
    const projects = _.map(projectsRes.data.values, (v) => v.key.toLowerCase());

    let repos = [];
    for (const project of projects) {
        const res = await http.request({
            url: `https://${host}/rest/api/1.0/projects/${project}/repos?limit=10000`,
            auth
        });
        repos = repos.concat(_.map(res.data.values, (v) => ({
            name: project + '/' + v.name,
            clone: _.find(v.links.clone, { name: 'http' }).href,
            html: v.links.self[0].href
        })));
    }
    return repos;
}
