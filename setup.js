#!/usr/bin/env node
'use strict';
const fs = require('./lib/fs');
const path = require('path');
const inquirer = require('inquirer');
const os = require('os');

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
            name: 'rootDir',
            message: 'Enter the root directory where bitcar should store your repos:',
            default: path.normalize(process.env.HOME + '/bitcar-repos')
        },
        {
            type: 'confirm',
            name: 'addGithub',
            message: 'Would you like to add github support?',
            default: true
        },
        {
            type: 'input',
            name: 'githubUsernames',
            message: 'Please type the github usernames for the repos you want bitcar to track (comma separated, no spaces):',
            default: 'carsdotcom,machellerogden',
            when: (answers) => answers.addGithub
        },
        {
            type: 'confirm',
            name: 'addBitbucketServer',
            message: 'Would you like to add Bitbucket Server support?',
            default: true
        },
        {
            type: 'input',
            name: 'bitbucketHost',
            message: 'Please type the Bitbucket domain which contains repos you want bitcar to track:',
            default: 'git.cars.com',
            when: (answers) => answers.addBitbucketServer
        }
    ]).then((answers) => {
        return new Promise((resolve, reject) => {
            const path = require('path');

            const profileContent = `
# begin bitcar
export BITCAR_ROOT_DIR='${answers.rootDir}'
source $HOME/.bitcar/cli.sh
source $HOME/.bitcar/completions.sh
# end bitcar`
            const configContent = {
                sources: []
            };

            if (answers.addGithub) {
                configContent.sources.push({ type: 'github', host: 'github.com', usernames: answers.githubUsernames.split(',') });
            }

            if (answers.addBitbucketServer) {
                configContent.sources.push({ type: 'bitbucketServer', host: answers.bitbucketHost });
            }

            const mkdirp = require('mkdirp');
            mkdirp.sync(path.normalize(process.env.HOME + '/.bitcar'));
            fs.writeJSON(path.normalize(process.env.HOME + '/.bitcar/config'), configContent, null, 4);
            fs.copyTpl(path.normalize(__dirname + '/dotfiles/cli.sh'), path.normalize(process.env.HOME + '/.bitcar/cli.sh'), answers);
            fs.copyTpl(path.normalize(__dirname + '/dotfiles/completions.sh'), path.normalize(process.env.HOME + '/.bitcar/completions.sh'), answers);
            fs.copy(path.normalize(__dirname + '/dotfiles/strip_codes'), path.normalize(process.env.HOME + '/.bitcar/strip_codes'));
            fs.copy(path.normalize(process.env.HOME + '/.bash_profile'), path.normalize(process.env.HOME + '/.bash_profile.bkup'));
            const bashProfile = fs.read(path.normalize(process.env.HOME + '/.bash_profile'));
            let cleanedProfile = bashProfile.replace(/\n# begin bitcar[\s\S]+# end bitcar/gm, '');
            cleanedProfile = cleanedProfile + profileContent;
            fs.write(path.normalize(process.env.HOME + '/.bash_profile'), cleanedProfile);

            return fs.commit(function (err) {
                if (err) return reject(err)
                console.log('');
                console.log('Bitcar setup was successful!');
                console.log('Enter `. ~/.bash_profile` and hit enter, or start a new terminal for changes to take effect.');
                console.log('Please note you MUST use the alias you chose during setup. Except for the `bitcar --setup` command you just ran, DO NOT use the `bitcar` command directly or the tool will not work.');
                return resolve();
            });
        });
    });
}
