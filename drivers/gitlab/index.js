import _ from 'lodash';
import http from '../../lib/http.js';

export default { getConfiguredRepos };

async function getProjects(groupId, privateToken, page = 1) {
    let results = [];
    let maxPages = 100;
    while (maxPages-- > 0) {
        const res = await http.get(
            `https://gitlab.com/api/v4/groups/${groupId}/projects?page=${page++}&per_page=100`,
            { headers: { 'PRIVATE-TOKEN': privateToken } }
        );
        const data = res.data || [];
        const nextPage = res.headers.get('x-next-page');
        results = [
            ...results,
            ...data.map((v) => ({
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

async function getConfiguredRepos(config) {
    const gitlabConfig = _.find(config.drivers, { type: 'gitlab' });
    if (!gitlabConfig) return [];
    const { privateToken, groups = [] } = gitlabConfig;
    let all = [];
    for (const groupId of groups) {
        all = all.concat(await getProjects(groupId, privateToken));
    }
    return all;
}
