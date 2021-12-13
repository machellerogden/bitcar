'use strict';
const _ = require('lodash');
const axios = require('axios');
const Promise = require('bluebird');

module.exports =  {
    getConfiguredRepos
};

async function getProjects(groupId, privateToken, page = 1) {
    let results = [];
    let maxPages = 100;
    while (maxPages-- > 0) {
        const res = await axios.request({
            url: `https://gitlab.com/api/v4/groups/${groupId}/projects?page=${page++}&per_page=100`,
            headers: { 'PRIVATE-TOKEN': privateToken }
        });
        const { data = {}, headers = {} } = res;
        const { 'x-next-page':nextPage } = headers;
        results = [
            ...results,
            ...data.map(v => ({
                name: v.path_with_namespace,
                clone: v.ssh_url_to_repo,
                default_branch: v.default_branch,
                html: v.web_url
            }))
        ];
        if (!nextPage) break;
    }
    return results;
}

function getConfiguredRepos(config) {
    const gitlabConfig = _.find(config.drivers, { type: 'gitlab' });
    if (gitlabConfig) {
        const { privateToken, groups } = gitlabConfig;
        return Promise.reduce(groups, (acc, groupId) => getProjects(groupId, privateToken), []);
    } else {
        return Promise.resolve([]);
    }
}
