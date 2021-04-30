#!/usr/bin/env node
'use strict';
const fs = require('./lib/fs');
const path = require('path');
const inquirer = require('inquirer');
const os = require('os');
const chalk = require('chalk');
const output = require('./lib/output');

module.exports = setup;

function setup() {
    return inquirer.prompt([
        {
            type: 'input',
            name: 'alias',
            message: 'Enter the bash command name you would like to use for bitcar:',
            default: 'bit'
        },
        {
            type: 'input',
            name: 'workspaceDir',
            message: 'Enter a directory for the bitcar workspace:',
            default: path.normalize(process.env.HOME + '/repos')
        },
        {
            type: 'checkbox',
            name: 'drivers',
            message: 'Which services to use with bitcar:',
            choices: [
                {
                    name: 'GitHub',
                    value: 'github'
                },
                {
                    name: 'Bitbucket Server',
                    value: 'bitbucket-server'
                },
                {
                    name: 'Gitlab',
                    value: 'gitlab'
                }
            ]

        },
        {
            type: 'confirm',
            name: 'addGithubPrivateAccess',
            message: 'Do you want to access your private repos on github?',
            default: true,
            when: (answers) => answers.drivers.indexOf('github') >= 0
        },
        {
            type: 'list',
            name: 'githubCloneUrl',
            message: 'Would you like to use https or ssh for cloning github repos?',
            choices: [
                'ssh',
                'https'
            ],
            when: (answers) => answers.drivers.indexOf('github') >= 0
        },
        {
            type: 'input',
            name: 'githubAccessToken',
            message: 'Please enter your github.com private access token (generate one at https://github.com/settings/tokens/new):',
            when: (answers) => answers.addGithubPrivateAccess
        },
        {
            type: 'confirm',
            name: 'addOtherGithubUsernames',
            message: 'Would you like to track public repos from specific Github users?',
            default: false,
            when: (answers) => answers.drivers.indexOf('github') >= 0
        },
        {
            type: 'input',
            name: 'githubUsernames',
            message: 'Please type the github usernames which you want bitcar to track (comma separated, no spaces):',
            when: (answers) => answers.addOtherGithubUsernames
        },
        {
            type: 'input',
            name: 'bitbucketServerHost',
            message: 'Please enter your Bitbucket Server domain (NOTE: there is no support for bitbucket.org at this time):',
            when: (answers) => answers.drivers.indexOf('bitbucket-server') >= 0
        },
        {
            type: 'confirm',
            name: 'addGitlabPrivateToken',
            message: 'Do you want to access your private repos on gitlab?',
            default: true,
            when: (answers) => answers.drivers.indexOf('gitlab') >= 0
        },
        {
            type: 'input',
            name: 'gitlabPrivateToken',
            message: 'Please enter your gitlab.com private token (generate one at https://gitlab.com/-/profile/personal_access_tokens):',
            when: (answers) => answers.addGitlabPrivateToken
        },
        {
            type: 'input',
            name: 'gitlabGroups',
            message: 'Please type the gitlab group ids which you want bitcar to track (comma separated, no spaces):',
            when: (answers) => answers.drivers.indexOf('gitlab') >= 0
        },
        {
            type: 'input',
            name: 'editorCmd',
            message: 'Please enter the terminal command you\'d like to use for viewing/edit files:',
            default: 'vim',
        }
    ]).then((answers) => {
        return new Promise((resolve, reject) => {
            const path = require('path');

            const profileContent = `
# begin bitcar
export BITCAR_WORKSPACE_DIR="${answers.workspaceDir}"
export BITCAR_EDITOR_CMD="${answers.editorCmd}"
source $HOME/.bitcar/cli.sh
source $HOME/.bitcar/completions.sh
# end bitcar`;
            const configContent = {
                alias: answers.alias,
                drivers: []
            };

            if (answers.drivers.indexOf('github') >= 0) {
                let githubConfig = { type: 'github', host: 'github.com', accessToken: answers.githubAccessToken };
                if (answers.githubCloneUrl) {
                    githubConfig.cloneUrl = answers.githubCloneUrl;
                }
                if (answers.githubUsernames) {
                    githubConfig.usernames = answers.githubUsernames.split(',');
                }
                configContent.drivers.push(githubConfig);
            }

            if (answers.drivers.indexOf('bitbucket-server') >= 0) {
                configContent.drivers.push({ type: 'bitbucket-server', host: answers.bitbucketServerHost });
            }

            if (answers.drivers.indexOf('gitlab') >= 0) {
                let gitlabConfig = { type: 'gitlab', host: 'gitlab.com', privateToken: answers.gitlabPrivateToken };
                if (answers.gitlabGroups) {
                    gitlabConfig.groups = answers.gitlabGroups.split(',');
                }
                configContent.drivers.push(gitlabConfig);
            }

            const mkdirp = require('mkdirp');
            mkdirp.sync(path.normalize(process.env.HOME + '/.bitcar'));
            fs.writeJSON(path.normalize(process.env.HOME + '/.bitcar/config'), configContent, null, 4);
            fs.copyTpl(path.normalize(__dirname + '/dotfiles/cli.sh'), path.normalize(process.env.HOME + '/.bitcar/cli.sh'), answers);
            fs.copyTpl(path.normalize(__dirname + '/dotfiles/completions.sh'), path.normalize(process.env.HOME + '/.bitcar/completions.sh'), answers);
            fs.copy(path.normalize(__dirname + '/dotfiles/strip_codes'), path.normalize(process.env.HOME + '/.bitcar/strip_codes'));

            if (fs.exists(path.normalize(process.env.HOME + '/.bash_profile'))) {
                fs.copy(path.normalize(process.env.HOME + '/.bash_profile'), path.normalize(process.env.HOME + '/.bash_profile.bkup'));
                let profile = fs.read(path.normalize(process.env.HOME + '/.bash_profile'));
                let updatedProfile = cleanProfile(profile) + profileContent;
                fs.write(path.normalize(process.env.HOME + '/.bash_profile'), updatedProfile);
            }

            if (fs.exists(path.normalize(process.env.HOME + '/.zshrc'))) {
                fs.copy(path.normalize(process.env.HOME + '/.zshrc'), path.normalize(process.env.HOME + '/.zshrc.bkup'));
                let profile = fs.read(path.normalize(process.env.HOME + '/.zshrc'));
                let updatedProfile = cleanProfile(profile) + profileContent;
                fs.write(path.normalize(process.env.HOME + '/.zshrc'), updatedProfile);
            }

            return fs.commit(function (err) {
                if (err) return reject(err);
                output.log('');
                output.log('Bitcar setup was successful!');
                output.log('');
                output.log(chalk.bold.inverse('Enter `. ~/.bash_profile` (or `. ~/.zshrc` if in zsh) and hit enter, or start a new terminal for changes to take effect.'));
                output.log('');
                output.log(chalk.underline('Please note you MUST use the command name you chose during setup (`' + answers.alias + '`) for the tool to work.'));
                output.log(chalk.underline('Except for the setup command, DO NOT use the `bitcar` command directly'));
                return resolve();
            });
        });
    });
}

function cleanProfile(profile) {
    return profile.replace(/\n# begin bitcar[\s\S]+# end bitcar/gm, '');
}
