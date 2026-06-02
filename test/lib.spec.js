import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import nodeFs from 'node:fs';

import http from '../lib/http.js';
import setTarget from '../lib/setTarget.js';
import openInBrowser from '../lib/openInBrowser.js';
import maybeClone from '../lib/maybeClone.js';
import maybePull from '../lib/maybePull.js';
import status from '../lib/status.js';
import syncExisting from '../lib/syncExisting.js';
import browser from '../lib/browser.js';
import gitFactory from '../lib/gitFactory.js';
import config from '../lib/config.js';
import output from '../lib/output.js';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('http', () => {
    function mockFetch(impl) {
        vi.stubGlobal('fetch', vi.fn(impl));
    }

    it('parses JSON responses and exposes headers', async () => {
        mockFetch(async () => ({
            ok: true,
            status: 200,
            headers: new Headers({ link: '<next>; rel="next"' }),
            text: async () => JSON.stringify([{ a: 1 }])
        }));
        const res = await http.get('https://example.com');
        expect(res.data).toEqual([{ a: 1 }]);
        expect(res.headers.get('link')).toContain('rel="next"');
    });

    it('sends Basic auth headers', async () => {
        let captured;
        mockFetch(async (url, init) => {
            captured = init;
            return { ok: true, status: 200, headers: new Headers(), text: async () => '' };
        });
        await http.request({ url: 'https://example.com', auth: { username: 'u', password: 'p' } });
        expect(captured.headers.Authorization).toBe('Basic ' + Buffer.from('u:p').toString('base64'));
    });

    it('serializes a JSON body on POST', async () => {
        let captured;
        mockFetch(async (url, init) => {
            captured = init;
            return { ok: true, status: 201, headers: new Headers(), text: async () => '{}' };
        });
        await http.post('https://example.com', { name: 'x' });
        expect(JSON.parse(captured.body)).toEqual({ name: 'x' });
        expect(captured.headers['Content-Type']).toBe('application/json');
    });

    it('throws on a non-ok response', async () => {
        mockFetch(async () => ({ ok: false, status: 404, headers: new Headers(), text: async () => 'nope' }));
        await expect(http.get('https://example.com')).rejects.toThrow('404');
    });
});

describe('setTarget', () => {
    it('writes the target file and returns the repoDir', () => {
        const repoDir = path.join(process.env.HOME, 'some/repo');
        const result = setTarget({ repoDir });
        expect(result).toBe(repoDir);
        const written = nodeFs.readFileSync(path.join(process.env.HOME, '.bitcar', '.bitcar_target'), 'utf8');
        expect(written).toBe(repoDir);
    });

    it('returns undefined when there is no repoDir', () => {
        expect(setTarget(undefined)).toBeUndefined();
        expect(setTarget({})).toBeUndefined();
    });
});

describe('openInBrowser', () => {
    it('opens the html url and passes the result through', async () => {
        vi.spyOn(browser, 'open').mockResolvedValue(undefined);
        const sourceResult = { html: 'https://example.com', name: 'x' };
        const result = await openInBrowser(sourceResult);
        expect(browser.open).toHaveBeenCalledWith('https://example.com');
        expect(result).toBe(sourceResult);
    });
});

describe('maybeClone / maybePull / status', () => {
    beforeEach(() => {
        vi.spyOn(output, 'log').mockImplementation(() => {});
        vi.spyOn(output, 'error').mockImplementation(() => {});
    });

    it('maybeClone clones when the directory is absent', async () => {
        const clone = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(gitFactory, 'getInstance').mockReturnValue({ clone });
        const repoDir = path.join(process.env.BITCAR_WORKSPACE_DIR, 'github.com/x/absent');
        await maybeClone({ clone: 'git@x', repoDir });
        expect(clone).toHaveBeenCalledWith('git@x', repoDir);
    });

    it('maybeClone skips cloning when the directory exists', async () => {
        const clone = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(gitFactory, 'getInstance').mockReturnValue({ clone });
        const repoDir = path.join(process.env.HOME, 'existing-repo');
        nodeFs.mkdirSync(repoDir, { recursive: true });
        await maybeClone({ clone: 'git@x', repoDir });
        expect(clone).not.toHaveBeenCalled();
    });

    it('maybePull checks out and pulls when the directory exists', async () => {
        const checkout = vi.fn().mockResolvedValue(undefined);
        const pull = vi.fn().mockResolvedValue(undefined);
        vi.spyOn(gitFactory, 'getInstance').mockReturnValue({ checkout, pull });
        const repoDir = path.join(process.env.HOME, 'pull-repo');
        nodeFs.mkdirSync(repoDir, { recursive: true });
        await maybePull({ repoDir, default_branch: 'main' });
        expect(checkout).toHaveBeenCalledWith('main');
        expect(pull).toHaveBeenCalledWith('origin', 'main', { '--rebase': 'true' });
    });

    it('maybePull is a no-op when the directory is absent', async () => {
        const getInstance = vi.spyOn(gitFactory, 'getInstance');
        await maybePull({ repoDir: path.join(process.env.HOME, 'nope') });
        expect(getInstance).not.toHaveBeenCalled();
    });

    it('status reports clean repositories', async () => {
        vi.spyOn(gitFactory, 'getInstance').mockReturnValue({
            status: vi.fn().mockResolvedValue({ isClean: () => true })
        });
        const repoDir = path.join(process.env.HOME, 'status-repo');
        nodeFs.mkdirSync(repoDir, { recursive: true });
        await status({ repoDir, name: 'x' });
        expect(output.log).toHaveBeenCalledWith(expect.stringContaining('clean'));
    });
});

describe('syncExisting', () => {
    beforeEach(() => {
        vi.spyOn(output, 'log').mockImplementation(() => {});
    });

    it('merges existing workspace repos into the cache', async () => {
        vi.spyOn(config, 'get').mockReturnValue({
            drivers: [{ type: 'github', host: 'github.com' }]
        });
        const ws = process.env.BITCAR_WORKSPACE_DIR;
        nodeFs.mkdirSync(path.join(ws, 'github.com', 'someone', 'newrepo'), { recursive: true });
        const result = await syncExisting();
        const names = result['github.com'].map((r) => r.name);
        expect(names).toContain('someone/newrepo');
    });
});
