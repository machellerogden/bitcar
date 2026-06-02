import path from 'node:path';
import chalk from 'chalk';
import fs from './lib/fs.js';
import prompt from './lib/prompt.js';
import output from './lib/output.js';

const HOME = process.env.HOME;

export default async function setup() {
    const answers = {};

    answers.alias = await prompt.input({
        message: 'Enter the bash command name you would like to use for bitcar:',
        default: 'bit'
    });

    answers.workspaceDir = await prompt.input({
        message: 'Enter a directory for the bitcar workspace:',
        default: path.normalize(HOME + '/repos')
    });

    answers.drivers = await prompt.checkbox({
        message: 'Which services to use with bitcar:',
        choices: [
            { name: 'GitHub', value: 'github' },
            { name: 'Bitbucket Server (deprecated, untested)', value: 'bitbucket-server' },
            { name: 'Gitlab', value: 'gitlab' }
        ]
    });

    if (answers.drivers.includes('github')) {
        answers.addGithubPrivateAccess = await prompt.confirm({
            message: 'Do you want to access your private repos on github?',
            default: true
        });
        answers.githubCloneUrl = await prompt.select({
            message: 'Would you like to use https or ssh for cloning github repos?',
            choices: [
                { name: 'ssh', value: 'ssh' },
                { name: 'https', value: 'https' }
            ]
        });
        if (answers.addGithubPrivateAccess) {
            answers.githubAccessToken = await prompt.input({
                message: 'Please enter your github.com private access token (generate one at https://github.com/settings/tokens/new):'
            });
        }
        answers.addOtherGithubUsernames = await prompt.confirm({
            message: 'Would you like to track public repos from specific Github users?',
            default: false
        });
        if (answers.addOtherGithubUsernames) {
            answers.githubUsernames = await prompt.input({
                message: 'Please type the github usernames which you want bitcar to track (comma separated, no spaces):'
            });
        }
    }

    if (answers.drivers.includes('bitbucket-server')) {
        answers.bitbucketServerHost = await prompt.input({
            message: 'Please enter your Bitbucket Server domain (NOTE: deprecated/untested; no support for bitbucket.org):'
        });
    }

    if (answers.drivers.includes('gitlab')) {
        answers.addGitlabPrivateToken = await prompt.confirm({
            message: 'Do you want to access your private repos on gitlab?',
            default: true
        });
        if (answers.addGitlabPrivateToken) {
            answers.gitlabPrivateToken = await prompt.input({
                message: 'Please enter your gitlab.com private token (generate one at https://gitlab.com/-/profile/personal_access_tokens):'
            });
        }
        answers.gitlabGroups = await prompt.input({
            message: 'Please type the gitlab group ids which you want bitcar to track (comma separated, no spaces):'
        });
    }

    answers.editorCmd = await prompt.input({
        message: 'Please enter the terminal command you\'d like to use for viewing/edit files:',
        default: 'vim'
    });

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

    if (answers.drivers.includes('github')) {
        const githubConfig = { type: 'github', host: 'github.com', accessToken: answers.githubAccessToken };
        if (answers.githubCloneUrl) {
            githubConfig.cloneUrl = answers.githubCloneUrl;
        }
        if (answers.githubUsernames) {
            githubConfig.usernames = answers.githubUsernames.split(',');
        }
        configContent.drivers.push(githubConfig);
    }

    if (answers.drivers.includes('bitbucket-server')) {
        configContent.drivers.push({ type: 'bitbucket-server', host: answers.bitbucketServerHost });
    }

    if (answers.drivers.includes('gitlab')) {
        const gitlabConfig = { type: 'gitlab', host: 'gitlab.com', privateToken: answers.gitlabPrivateToken };
        if (answers.gitlabGroups) {
            gitlabConfig.groups = answers.gitlabGroups.split(',');
        }
        configContent.drivers.push(gitlabConfig);
    }

    const dotfiles = path.join(import.meta.dirname, 'dotfiles');

    fs.writeJSON(path.normalize(HOME + '/.bitcar/config'), configContent);
    fs.copyTpl(path.join(dotfiles, 'cli.sh'), path.normalize(HOME + '/.bitcar/cli.sh'), answers);
    fs.copyTpl(path.join(dotfiles, 'completions.sh'), path.normalize(HOME + '/.bitcar/completions.sh'), answers);
    fs.copy(path.join(dotfiles, 'strip_codes'), path.normalize(HOME + '/.bitcar/strip_codes'));

    for (const rcFile of ['.bash_profile', '.zshrc']) {
        const rcPath = path.normalize(HOME + '/' + rcFile);
        if (fs.exists(rcPath)) {
            fs.copy(rcPath, rcPath + '.bkup');
            const updated = cleanProfile(fs.read(rcPath)) + profileContent;
            fs.write(rcPath, updated);
        }
    }

    output.log('');
    output.log('Bitcar setup was successful!');
    output.log('');
    output.log(chalk.bold.inverse('Enter `. ~/.bash_profile` (or `. ~/.zshrc` if in zsh) and hit enter, or start a new terminal for changes to take effect.'));
    output.log('');
    output.log(chalk.underline('Please note you MUST use the command name you chose during setup (`' + answers.alias + '`) for the tool to work.'));
    output.log(chalk.underline('Except for the setup command, DO NOT use the `bitcar` command directly'));
}

function cleanProfile(profile) {
    return profile.replace(/\n# begin bitcar[\s\S]+# end bitcar/gm, '');
}
