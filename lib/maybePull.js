'use strict';
const fs = require('fs');
const path = require('path');
const Promise = require('bluebird');
const workspaceDir = require('./workspaceDir');
const gitFactory = require('./gitFactory');
const output = require('./output');

module.exports = maybePull;

function maybePull(sourceResult) {
    if (fs.existsSync(sourceResult.repoDir)) {
        return new Promise((resolve) => {
            let git = gitFactory.getInstance(sourceResult.repoDir);
            return git.checkout(sourceResult.default_branch || 'master', (checkoutErr) => {
                output.error(checkoutErr);
                return git.pull('origin', sourceResult.default_branch || 'master', { '--rebase': true }, (pullErr, data) => {
                    output.error(pullErr);
                    return resolve(sourceResult);
                });
            });
        });
    } else {
        return Promise.resolve(sourceResult);
    }
}
