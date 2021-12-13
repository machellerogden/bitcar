'use strict';
const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const router = require('../router');
const fs = require('../lib/fs');
const inquirer = require('inquirer');
const path = require('path');
const gitFactory = require('../lib/gitFactory');
const browser = require('../lib/browser');
const output = require('../lib/output');
const config = require('../lib/config');
const drivers = require('../drivers');
const axios = require('axios');

// store cache fixture in mem-fs
const CACHE_PATH = path.normalize(process.env.HOME + '/.bitcar/cache.json');
fs.writeJSON(CACHE_PATH, require('./fixtures/cache.json'), null, 4);

const schemas = require('./schemas');
const mocks = require('./mocks');


describe('the bitcar router', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        sandbox.stub(gitFactory, 'getInstance', () => {
            return mocks.git;
        });
        sandbox.stub(browser, 'open', mocks.open);
        sandbox.stub(fs, 'commit', (cb) => cb());
        sandbox.stub(inquirer, 'prompt', (options) => {
            const setupPromptValidation = schemas.setupPrompt.validate(options);
            if (!setupPromptValidation.error) return Promise.resolve(mocks.setupAnswers);
            const resultsPromptValidation = schemas.resultsPrompt.validate(options);
            if (!resultsPromptValidation.error) return Promise.resolve(mocks.resultAnswers);
            const credentialsPromptValidation = schemas.credentialsPrompt.validate(options);
            if (!credentialsPromptValidation.error) return Promise.resolve(mocks.credentialsAnswers);
            return Promise.reject();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('when called with version option', () => {
        it('should console log version and exit 0', () => {
            sandbox.stub(output, 'log');
            return router({ _: [ ], version: true }).then(() => {
                expect(output.log).to.have.been.calledWithMatch(sinon.match(/\d+\.\d+\.\d+/));
            });
        });
    });
    describe('when called with search term', () => {
        describe('with no other options', () => {
            describe('for existing entry', () => {
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ 'bitcar' ] })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
                it('should find existing entry for the search term in the cache - chassisjs', () => {
                    return router({ _: [ 'chassisjs' ] })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
            });
            describe('for non-existant entry', () => {
                it('should reject with "No results." for non-existant entry for the search term in the cache - doesnotexist', () => {
                    return expect(router({ _: [ 'doesnotexist' ] })).to.eventually.be.rejectedWith('No results.');
                });
            });
        });
    });
    describe('open option', () => {
        describe('with a search term', () => {
            describe('for existing entry', () => {
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], open: 'bitcar' })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
                it('should open a browser corresponding for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], open: 'bitcar' })
                        .then((result) => {
                            expect(browser.open).to.have.been.calledWith('https://github.com/carsdotcom/bitcar');
                        });
                });
                it('regardless of order, should open a browser corresponding for the search term in the cache - bitcar', () => {
                    return router({ _: [ 'bitcar' ], open: true })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
                it('regardless of order, should open a browser corresponding for the search term in the cache - bitcar', () => {
                    return router({ _: [ 'bitcar' ], open: true })
                        .then((result) => {
                            expect(browser.open).to.have.been.calledWith('https://github.com/carsdotcom/bitcar');
                        });
                });
            });
            describe('for non-existant entry', () => {
                it('should exit non-zero with a message of "No results."', () => {
                    return expect(router({ _: [ 'doesnotexist' ] })).to.eventually.be.rejectedWith('No results.');
                });
            });
        });
        describe('without a search term', () => {
            describe('when current working directory corresponds to an entry in the cache', () => {
                beforeEach(() => {
                        sandbox.stub(process, 'cwd', () => '/Users/macheller-ogden/repos/github.com/carsdotcom/bitcar');
                });
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], open: true })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
                it('should open a browser corresponding to the current directory - bitcar', () => {
                    return router({ _: [ ], open: true })
                        .then((result) => {
                            expect(browser.open).to.have.been.calledWith('https://github.com/carsdotcom/bitcar');
                        });
                });
            });
            describe('when current working directory does not correspond to an entry in the cache', () => {
                it('should exit non-zero with a message of "No results."', () => {
                    return router({ _: [ ], open: true })
                        .then((result) => {
                            expect(browser.open).to.have.been.calledWith('https://github.com/carsdotcom/bitcar');
                        })
                        .catch((err)=> {
                            expect(err.message).to.contain('No results');
                        });
                });
            });
        });
    });
    describe('edit option', () => {
        describe('with a search term', () => {
            describe('for existing entry', () => {
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], edit: 'bitcar' })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
                it('regardless of order, find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ 'bitcar' ], edit: true })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
            });
            describe('for non-existant entry', () => {
                it('should exit non-zero with a message of "No results."', () => {
                    return expect(router({ _: [ 'doesnotexist' ], edit: true })).to.eventually.be.rejectedWith('No results.');
                });
            });
        });
        describe('without a search term', () => {
            describe('when current working directory corresponds to an entry in the cache', () => {
                beforeEach(() => {
                        sandbox.stub(process, 'cwd', () => '/Users/macheller-ogden/repos/github.com/carsdotcom/bitcar');
                });
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], edit: true })
                        .then((result) => {
                            const resultValidation = schemas.result.validate(result);
                            expect(resultValidation.error).to.be.a('null');
                        });
                });
            });
        });
    });
    describe('completions option', () => {
        beforeEach(() => {
            sandbox.stub(output, 'log');
        });
        describe('with a search term', () => {
            describe('for existing entry', () => {
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], completions: 'bitcar' })
                        .then((results) => {
                            const resultsValidation = schemas.results.validate(results);
                            expect(resultsValidation.error).to.be.a('null');
                        });
                });
                it('regardless of order, find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ 'bitcar' ], completions: true })
                        .then((results) => {
                            const resultsValidation = schemas.results.validate(results);
                            expect(resultsValidation.error).to.be.a('null');
                        });
                });
            });
            describe('for non-existant entry', () => {
                it('should exit non-zero with a message of "No results."', () => {
                    return expect(router({ _: [ 'doesnotexist' ], completions: true })).to.eventually.eql([]);
                });
            });
        });
        describe('without a search term', () => {
            describe('when current working directory corresponds to an entry in the cache', () => {
                it('should find existing entry for the search term in the cache - bitcar', () => {
                    return router({ _: [ ], completions: true })
                        .then((results) => {
                            const resultsValidation = schemas.results.validate(results);
                            expect(resultsValidation.error).to.be.a('null');
                        });
                });
            });
        });
    });
    describe('refresh option', () => {
        beforeEach(() => {
            sandbox.stub(output, 'log');
        });
        it('should call each configured driver', () => {
            sandbox.stub(drivers['bitbucket-server'], 'getConfiguredRepos', () => Promise.resolve([]));
            sandbox.stub(drivers['gitlab'], 'getConfiguredRepos', () => Promise.resolve([]));
            sandbox.stub(drivers.github, 'getConfiguredRepos', () => Promise.resolve([]));
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(drivers['bitbucket-server'].getConfiguredRepos).to.have.been.called;
                    expect(drivers['gitlab'].getConfiguredRepos).to.have.been.called;
                    expect(drivers.github.getConfiguredRepos).to.have.been.called;
                })
                .catch(()=> { });
        });
    });
    describe('create option', () => {
        beforeEach(() => {
            sandbox.stub(output, 'log');
        });
        describe('when the given repo name starts with github.com', () => {
            it('should call the createRepo method on the github driver', () => {
                sandbox.stub(drivers.github, 'createRepo', () => Promise.resolve([]));
                return router({ _: [ ], create: 'github.com/foo/bar' })
                    .then(() => {
                        expect(drivers.github.createRepo).to.have.been.called;
                    });
            });
        });
    });
    describe('bitbucket-server driver', () => {
        beforeEach(() => {
            sandbox.stub(output, 'log');
            sandbox.stub(axios, 'request', () => Promise.resolve(mocks.bitbucketServerResponse));
            sandbox.stub(drivers.github, 'getConfiguredRepos', () => Promise.resolve([]));
        });
        it('should call axios request', () => {
            sandbox.stub(config, 'get', () => mocks.config);
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(axios.request).to.have.been.called;
                });
        });
        it('shouldn\'t make any requests if there is no config', () => {
            sandbox.stub(config, 'get', () => mocks.configWithoutBitbucketServer);
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(axios.request).not.to.have.been.called;
                });
        });
    });
    describe('github driver', () => {
        beforeEach(() => {
            sandbox.stub(output, 'log');
            sandbox.stub(axios, 'get', () => Promise.resolve(mocks.githubResponse));
            sandbox.stub(drivers['bitbucket-server'], 'getConfiguredRepos', () => Promise.resolve([]));
        });
        it('should call axios request', () => {
            sandbox.stub(config, 'get', () => mocks.config);
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(axios.get).to.have.been.called;
                });
        });
        it('should make requests for any usernames given in config', () => {
            sandbox.stub(config, 'get', () => mocks.configWithUsernames);
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(axios.get).to.have.been.called;
                });
        });
        it('shouldn\'t make any requests if there is no config', () => {
            sandbox.stub(config, 'get', () => mocks.configWithoutGithub);
            return router({ _: [ ], refresh: true })
                .then(() => {
                    expect(axios.get).not.to.have.been.called;
                });
        });
    });
});

