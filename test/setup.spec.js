import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import _ from 'lodash';

import setup from '../setup.js';
import fs from '../lib/fs.js';
import prompt from '../lib/prompt.js';
import output from '../lib/output.js';

const CONFIG_PATH = path.normalize(process.env.HOME + '/.bitcar/config');

function stubPrompts(driverChoices) {
    vi.spyOn(output, 'log').mockImplementation(() => {});
    vi.spyOn(prompt, 'checkbox').mockResolvedValue(driverChoices);
    vi.spyOn(prompt, 'confirm').mockResolvedValue(false);
    vi.spyOn(prompt, 'select').mockResolvedValue('ssh');
    vi.spyOn(prompt, 'password').mockResolvedValue('secret');
    vi.spyOn(prompt, 'input').mockImplementation(({ message }) => {
        if (/bash command name/.test(message)) return Promise.resolve('bit');
        if (/directory for the bitcar workspace/.test(message)) return Promise.resolve(path.join(process.env.HOME, 'ws'));
        if (/Bitbucket Server domain/.test(message)) return Promise.resolve('git.cars.com');
        if (/viewing\/edit files/.test(message)) return Promise.resolve('vim');
        return Promise.resolve('');
    });
}

describe('the bitcar setup script', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('when only github is selected', () => {
        beforeEach(() => stubPrompts(['github']));

        it('adds github to config', async () => {
            await setup();
            const config = fs.readJSON(CONFIG_PATH);
            expect(config.drivers.length).toBe(1);
            const githubDriver = _.find(config.drivers, { type: 'github' });
            expect(githubDriver).toBeTypeOf('object');
            expect(githubDriver.host).toBe('github.com');
        });
    });

    describe('when only bitbucket server is selected', () => {
        beforeEach(() => stubPrompts(['bitbucket-server']));

        it('adds bitbucket server to config', async () => {
            await setup();
            const config = fs.readJSON(CONFIG_PATH);
            expect(config.drivers.length).toBe(1);
            const driver = _.find(config.drivers, { type: 'bitbucket-server' });
            expect(driver).toBeTypeOf('object');
            expect(driver.host).toBe('git.cars.com');
        });
    });
});
