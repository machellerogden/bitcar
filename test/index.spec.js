import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import nodeFs from 'node:fs';

import router from '../router.js';
import config from '../lib/config.js';
import drivers from '../drivers/index.js';
import http from '../lib/http.js';
import prompt from '../lib/prompt.js';
import browser from '../lib/browser.js';
import gitFactory from '../lib/gitFactory.js';
import output from '../lib/output.js';

const FIXTURE = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures', 'cache.json');
const CACHE_PATH = path.join(process.env.HOME, '.bitcar', 'cache.json');

const configWithGithub = {
    drivers: [{ type: 'github', host: 'github.com', accessToken: 'token' }]
};
const configWithUsernames = {
    drivers: [{ type: 'github', host: 'github.com', accessToken: 'token', usernames: ['google'] }]
};
const configWithoutGithub = {
    drivers: [{ type: 'bitbucket-server', host: 'git.example.com' }]
};
const configGithubAndBitbucket = {
    drivers: [
        { type: 'github', host: 'github.com', accessToken: 'token' },
        { type: 'bitbucket-server', host: 'git.example.com' }
    ]
};
const configAllThree = {
    drivers: [
        { type: 'github', host: 'github.com', accessToken: 'token' },
        { type: 'bitbucket-server', host: 'git.example.com' },
        { type: 'gitlab', host: 'gitlab.com', privateToken: 'token', groups: ['1'] }
    ]
};

describe('the bitcar router', () => {
    beforeEach(() => {
        // restore cache fixture before each test (refresh tests overwrite it)
        nodeFs.copyFileSync(FIXTURE, CACHE_PATH);
        vi.spyOn(output, 'log').mockImplementation(() => {});
        vi.spyOn(output, 'error').mockImplementation(() => {});
        vi.spyOn(browser, 'open').mockResolvedValue(undefined);
        vi.spyOn(gitFactory, 'getInstance').mockReturnValue({
            clone: vi.fn().mockResolvedValue(undefined)
        });
        vi.spyOn(prompt, 'input').mockResolvedValue('foo');
        vi.spyOn(prompt, 'password').mockResolvedValue('bar');
        vi.spyOn(prompt, 'select').mockImplementation(({ choices }) => Promise.resolve(choices[0].value));
        vi.spyOn(prompt, 'confirm').mockResolvedValue(true);
        vi.spyOn(http, 'get').mockResolvedValue({ status: 200, data: [], headers: new Headers() });
        vi.spyOn(http, 'request').mockResolvedValue({ status: 200, data: { values: [] }, headers: new Headers() });
        vi.spyOn(http, 'post').mockResolvedValue({ status: 201, data: {} });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('when called with version option', () => {
        it('logs a semver version', async () => {
            await router({ _: [], version: true });
            expect(output.log).toHaveBeenCalledWith(expect.stringMatching(/\d+\.\d+\.\d+/));
        });
    });

    describe('when called with search term', () => {
        it('resolves a source result for an existing entry', async () => {
            const result = await router({ _: ['bitcar'] });
            expect(result).toMatchObject({ name: 'machellerogden/bitcar' });
            expect(result.repoDir).toContain('github.com');
        });

        it('resolves for another existing entry - dotfiles', async () => {
            const result = await router({ _: ['dotfiles'] });
            expect(result).toMatchObject({ name: 'machellerogden/dotfiles' });
        });

        it('rejects with "No results." for a missing entry', async () => {
            await expect(router({ _: ['doesnotexist'] })).rejects.toThrow('No results.');
        });

        it('treats regex metacharacters in the term literally', async () => {
            await expect(router({ _: ['bit+car'] })).rejects.toThrow('No results.');
        });
    });

    describe('open option', () => {
        it('opens the browser for the matched repo', async () => {
            await router({ _: [], open: 'bitcar' });
            expect(browser.open).toHaveBeenCalledWith('https://github.com/machellerogden/bitcar');
        });

        it('works regardless of argument order', async () => {
            await router({ _: ['bitcar'], open: true });
            expect(browser.open).toHaveBeenCalledWith('https://github.com/machellerogden/bitcar');
        });

        describe('without a search term', () => {
            it('falls back to the current working directory', async () => {
                vi.spyOn(process, 'cwd').mockReturnValue('/Users/me/repos/github.com/machellerogden/bitcar');
                const result = await router({ _: [], open: true });
                expect(result).toMatchObject({ name: 'machellerogden/bitcar' });
                expect(browser.open).toHaveBeenCalledWith('https://github.com/machellerogden/bitcar');
            });
        });
    });

    describe('edit option', () => {
        it('resolves a source result for an existing entry', async () => {
            const result = await router({ _: [], edit: 'bitcar' });
            expect(result).toMatchObject({ name: 'machellerogden/bitcar' });
        });

        it('rejects with "No results." for a missing entry', async () => {
            await expect(router({ _: ['doesnotexist'], edit: true })).rejects.toThrow('No results.');
        });
    });

    describe('completions option', () => {
        it('logs completion candidates for an existing entry', async () => {
            await router({ _: [], completions: 'bitcar' });
            expect(output.log).toHaveBeenCalledWith('machellerogden/bitcar');
        });

        it('returns an empty list for a missing entry', async () => {
            const results = await router({ _: ['doesnotexist'], completions: true });
            expect(results).toBeUndefined();
            expect(output.log).not.toHaveBeenCalledWith(expect.stringContaining('doesnotexist'));
        });
    });

    describe('refresh option', () => {
        it('calls each configured driver', async () => {
            vi.spyOn(config, 'get').mockReturnValue(configAllThree);
            const bb = vi.spyOn(drivers['bitbucket-server'], 'getConfiguredRepos').mockResolvedValue([]);
            const gl = vi.spyOn(drivers['gitlab'], 'getConfiguredRepos').mockResolvedValue([]);
            const gh = vi.spyOn(drivers['github'], 'getConfiguredRepos').mockResolvedValue([]);
            await router({ _: [], refresh: true });
            expect(bb).toHaveBeenCalled();
            expect(gl).toHaveBeenCalled();
            expect(gh).toHaveBeenCalled();
        });
    });

    describe('create option', () => {
        it('calls createRepo on the github driver for a github.com name', async () => {
            const create = vi.spyOn(drivers.github, 'createRepo').mockResolvedValue({});
            await router({ _: [], create: 'github.com/foo/bar' });
            expect(create).toHaveBeenCalled();
            expect(create.mock.calls[0][1]).toMatchObject({ name: 'bar' });
        });

        it('rejects for a non-github name', async () => {
            await expect(router({ _: [], create: 'gitlab.com/foo/bar' })).rejects.toThrow('github.com');
        });
    });

    describe('bitbucket-server driver', () => {
        it('makes http requests when configured', async () => {
            vi.spyOn(config, 'get').mockReturnValue(configGithubAndBitbucket);
            await router({ _: [], refresh: true });
            expect(http.request).toHaveBeenCalled();
        });

        it('makes no requests when not configured', async () => {
            vi.spyOn(config, 'get').mockReturnValue({ drivers: [] });
            await router({ _: [], refresh: true });
            expect(http.request).not.toHaveBeenCalled();
        });
    });

    describe('github driver', () => {
        it('makes http requests when configured', async () => {
            vi.spyOn(config, 'get').mockReturnValue(configWithGithub);
            await router({ _: [], refresh: true });
            expect(http.get).toHaveBeenCalled();
        });

        it('makes requests for usernames given in config', async () => {
            vi.spyOn(config, 'get').mockReturnValue(configWithUsernames);
            await router({ _: [], refresh: true });
            expect(http.get).toHaveBeenCalled();
        });

        it('makes no requests when github is not configured', async () => {
            vi.spyOn(config, 'get').mockReturnValue(configWithoutGithub);
            await router({ _: [], refresh: true });
            expect(http.get).not.toHaveBeenCalled();
        });
    });
});
