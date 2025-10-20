import nock from "nock";
import {
    initNock,
    initProbot,
    issueAssignedWithLabelsPayload,
    nockCreateComment,
    nockConfig,
    nockEmptyConfig,
    nockExistingBranch,
    nockGlobalConfig,
    nockNonExistingBranch
} from "./test-helpers";
import {Probot} from "probot";
import issueAssignedPayload from "./test-fixtures/issues.assigned.json";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('source branch can be configured based on issue label', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcd1234')
})

test('source branch can be configured based on multiple issue labels', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('docs', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: 
    - enhancement
    - docs
    name: docs
  - label: enhancement
    name: dev`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement', 'docs')})

    expect(sourceSha).toBe('abcd1234')
})

test('do not create a branch for issue labels that are configured to be skipped', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    const ymlConfig = `branches:
  - label: question
    skip: true`
    nockConfig(ymlConfig)
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('question')})

    expect(createEndpointCalled).toBeFalsy()
})

test('source branch can be configured based on issue label with wildcard pattern', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: ?nhance*
    name: dev`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcd1234')
})

test('source branch based on catch-all fallthrough', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('bug', 'abcd1234')
    nockExistingBranch('issues', 'fghi5678')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: bug
    name: bug
  - label: '*'
    name: issues`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(sourceSha).toBe('fghi5678')
})

test('source branch based on label where configuration contains catch-all fallthrough', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('enhancement', 'abcd1234')
    nockExistingBranch('issues', 'fghi5678')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: enhancement
  - label: '*'
    name: issues`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcd1234')
})

test('if configured source branch does not exist use default branch', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockNonExistingBranch('dev')
    nockExistingBranch('master', '12345678')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('12345678')
})

test('use configured default branch', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('dev', 'abcdef01')
    nockExistingBranch('master', '12345678')
    const ymlConfig = 'silent: true\ndefaultBranch: dev'
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcdef01')
})

test('if multiple issue labels match configuration use first match', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
    nockConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(sourceSha).toBe('abcd1234')
})

test('configuration with label branch and prefix', async () => {
    nockNonExistingBranch('feature/issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: dev
    prefix: feature/`
    nockConfig(ymlConfig)
    let sourceSha = ''
    let targetRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            targetRef = body.ref
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(sourceSha).toBe('abcd1234')
    expect(targetRef).toBe('refs/heads/feature/issue-1-Test_issue')
})

test('issue #322 configuration', async () => {
    nockNonExistingBranch('feature/issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: 'type | bug'
    prefix: bug/
  - label: 'type | feature'
    prefix: feature/`
    nockConfig(ymlConfig)
    let targetRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            targetRef = body.ref
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('type | feature')})

    expect(targetRef).toBe('refs/heads/feature/issue-1-Test_issue')
})

test('configuration with label field missing', async () => {
    const ymlConfig = `branches:
  - name: dev
    prefix: feature/`
    nockConfig(ymlConfig)

    nock('https://api.github.com')
        .get('/search/issues')
        .query(true)
        .reply(200, {items: []})

    let issueTitle = ''
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues', body => {
            issueTitle = body.title
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('configuration with invalid YAML', async () => {
    const ymlConfig = `branches:
  - label: Type: Feature
    prefix: feature/`
    nockConfig(ymlConfig)

    nock('https://api.github.com')
        .get('/search/issues')
        .query(true)
        .reply(200, {items: []})

    let issueTitle = ''
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues', body => {
            issueTitle = body.title
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})
    expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('support .yaml extension for configuration file', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCreateComment()
    const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
    nock('https://api.github.com')
        .persist()
        .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yaml')
        .reply(200, ymlConfig)
    nockEmptyConfig()
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcd1234')
})

test('support global configuration file in user/org .github repo', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('dev', 'abcdef01')
    nockExistingBranch('master', '12345678')
    const ymlConfig = 'silent: true\ndefaultBranch: dev'
    nockGlobalConfig(ymlConfig)
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('enhancement')})

    expect(sourceSha).toBe('abcdef01')
})
