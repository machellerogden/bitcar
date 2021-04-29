'use strict';
const _ = require('lodash');
const axios = require('axios');
const Promise = require('bluebird');

module.exports =  {
    getConfiguredRepos
};

function getConfiguredRepos(config) {
    const gitlabConfig = _.find(config.drivers, { type: 'gitlab' });
    if (gitlabConfig) {
        const { privateToken, groups } = gitlabConfig;
        return Promise.reduce(groups, (acc, groupId) =>
            axios.request({
                url: `https://gitlab.com/api/v4/groups/${groupId}/projects`,
                headers: { 'PRIVATE-TOKEN': privateToken }
            }).then((res) => [
                ...acc,
                ...res.data.map(v => ({
                    name: v.path_with_namespace,
                    clone: v.ssh_url_to_repo,
                    html: v._links.self
                }))
            ]), []);
    } else {
        return Promise.resolve([]);
    }
}
