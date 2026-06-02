import _ from 'lodash';
import http from '../../lib/http.js';
import output from '../../lib/output.js';

export default {
    createRepo,
    getConfiguredRepos,
    getOwnRepos,
    getReposFromUsernames
};

function defaultHeaders(githubConfig) {
    const headers = {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'bitcar'
    };
    if (githubConfig && githubConfig.accessToken) {
        headers.Authorization = 'Bearer ' + githubConfig.accessToken;
    }
    return headers;
}

function createRepo(githubConfig, options) {
    const url = `https://api.github.com/user/repos`;
    return http.post(url, {
        name: options.name,
        description: 'created by bitcar',
        private: options.private || false
    }, { headers: defaultHeaders(githubConfig) });
}

function getConfiguredRepos(config) {
    const githubConfig = _.find(config.drivers, { type: 'github' });
    let resultPromises = [];
    if (githubConfig && githubConfig.accessToken) {
        resultPromises.push(getOwnRepos(githubConfig));
    }
    if (githubConfig && githubConfig.usernames) {
        resultPromises = resultPromises.concat(getReposFromUsernames(githubConfig));
    }
    if (!resultPromises.length) {
        return Promise.resolve([]);
    }
    return Promise.all(resultPromises);
}

function parseLinkHeader(header) {
    if (!header || header.length === 0) return {};
    const parts = header.split(',');
    return _.reduce(parts, (acc, part) => {
        const section = part.split(';');
        if (section.length !== 2) return acc;
        const url = section[0].replace(/<(.*)>/, '$1').trim();
        const name = section[1].replace(/rel="(.*)"/, '$1').trim();
        acc[name] = url;
        return acc;
    }, {});
}

function mapRepo(githubConfig) {
    return (item) => ({
        name: item.full_name,
        clone: githubConfig.cloneUrl === 'ssh' ? item.ssh_url : item.clone_url,
        default_branch: item.default_branch,
        html: item.html_url
    });
}

async function getPage(url, headers, githubConfig, sources = []) {
    const res = await http.get(url, { headers });
    const all = sources.concat(_.map(res.data, mapRepo(githubConfig)));
    const link = parseLinkHeader(res.headers.get('link'));
    if (link.next) {
        return getPage(link.next, headers, githubConfig, all);
    }
    return all;
}

async function getOwnRepos(githubConfig) {
    const url = `https://api.github.com/user/repos?page=1&per_page=100`;
    try {
        return await getPage(url, defaultHeaders(githubConfig), githubConfig);
    } catch (err) {
        output.error(err.message || err);
        return [];
    }
}

async function getReposFromUsernames(githubConfig) {
    const headers = defaultHeaders(githubConfig);
    const results = await Promise.all(_.map(githubConfig.usernames, async (username) => {
        const url = `https://api.github.com/users/${username}/repos?page=1&per_page=100`;
        try {
            return await getPage(url, headers, githubConfig);
        } catch (err) {
            output.error(err.message || err);
            return [];
        }
    }));
    return _.flatten(results);
}
