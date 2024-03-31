import {Probot} from "probot";
import issueOpenedPayload from "./test-fixtures/issues.opened.json";
import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import pullRequestClosedPayload from "./test-fixtures/pull_request.closed.json";
import marketplaceFreePlan from "./test-fixtures/marketplace_free_plan.json";
import {
    initNock,
    initProbot,
    issueAssignedWithLabelsPayload,
    nockCommentCreated,
    nockCommit,
    nockCommitTreeSha,
    nockConfig,
    nockCreateBranch,
    nockCreatePR,
    nockEmptyConfig,
    nockExistingBranch,
    nockMarketplacePlan,
    nockNonExistingBranch,
    nockUpdateBranch,
    privateOrganizationRepoPayload
} from "./test-helpers";

const nock = require('nock')
const utils = require('../src/utils')
let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('creates a branch when an issue is assigned', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockEmptyConfig()
    nockCommentCreated()
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
})

test('do not create a branch when it already exists', async () => {
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockEmptyConfig()
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeFalsy()
})

test('do not warn about existing branches in auto mode', async () => {
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockConfig('mode: auto\nsilent: false')
    let commentEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', () => {
            commentEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(commentEndpointCalled).toBeFalsy()
})

test('create short branch when configured that way', async () => {
    nockNonExistingBranch('issue-1')
    nockExistingBranch('master', '12345678')
    nockConfig('branchName: short')
    nockCommentCreated()
    let createEndpointCalled = false
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(branchRef).toBe('refs/heads/issue-1')
})

test('source branch is default branch by, well, default', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('dev', 'abcd1234')
    nockCommentCreated()
    nockEmptyConfig()
    let sourceSha = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            sourceSha = body.sha
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(sourceSha).toBe('12345678')
})

test('create branch with custom issue name', async () => {
    nockNonExistingBranch('foo-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockCommentCreated()
    // eslint-disable-next-line no-template-curly-in-string
    nockConfig('branchName: \'foo-${issue.number}-${issue.title}\'')
    let createEndpointCalled = false
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(branchRef).toBe('refs/heads/foo-1-Test_issue')
})

test('create branch with custom name containing event initiator', async () => {
    nockNonExistingBranch('robvanderleek-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockCommentCreated()
    // eslint-disable-next-line no-template-curly-in-string
    nockConfig('branchName: \'${sender.login}-${issue.number}-${issue.title}\'')
    let createEndpointCalled = false
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(branchRef).toBe('refs/heads/robvanderleek-1-Test_issue')
})

test('create branch with custom short issue name', async () => {
    nockNonExistingBranch('foo-1')
    nockExistingBranch('master', '12345678')
    nockCommentCreated()
    // eslint-disable-next-line no-template-curly-in-string
    nockConfig('branchName: \'foo-${issue.number}\'')
    let createEndpointCalled = false
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(branchRef).toBe('refs/heads/foo-1')
})

test('create branch with GitLab-like issue name', async () => {
    nockNonExistingBranch('1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockCommentCreated()
    // eslint-disable-next-line no-template-curly-in-string
    nockConfig('branchName: \'${issue.number}-${issue.title}\'')
    let createEndpointCalled = false
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(branchRef).toBe('refs/heads/1-Test_issue')
})

test('close issue after merge', async () => {
    nockConfig('autoCloseIssue: true')

    nock('https://api.github.com')
        .get('/repos/robvanderleek/create-issue-branch/issues/111')
        .reply(200)

    let state = ''
    nock('https://api.github.com')
        .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body: any) => {
            state = body.state
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'pull_request', payload: pullRequestClosedPayload as any})
    expect(state).toBe('closed')
})

test('do not close issue after PR close (without merge)', async () => {
    nockConfig('autoCloseIssue: true')

    nock('https://api.github.com')
        .get('/repos/robvanderleek/create-issue-branch/issues/111')
        .reply(200)

    let state = ''
    nock('https://api.github.com')
        .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body: any) => {
            state = body.state
            return true
        })
        .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(pullRequestClosedPayload))
    payloadCopy.pull_request.merged = false
    await probot.receive({id: '', name: 'pull_request', payload: payloadCopy})
    expect(state).toBe('')
})

test('create branch with slash in branch name', async () => {
    nockNonExistingBranch('bug/1/Test_issue')
    nockExistingBranch('master', '12345678')
    nockCommentCreated()
    nockConfig(// eslint-disable-next-line no-template-curly-in-string
        'branchName: \'${issue.number}/${issue.title}\'\n' + //
        'branches:\n' + //
        '  - label: bug\n' + //
        '    prefix: bug/\n')
    let branchRef = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', (body: any) => {
            branchRef = body.ref
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(branchRef).toBe('refs/heads/bug/1/Test_issue')
})

test('custom message in comment', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('commentMessage: \'hello world\'')
    nockCreateBranch()
    let comment = ''
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data: any) => {
            comment = data.body
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(comment).toBe('hello world')
})

test('custom message with placeholder substitution in comment', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    // eslint-disable-next-line no-template-curly-in-string
    nockConfig('commentMessage: \'hello branch for issue ${issue.number}\'')
    nockCreateBranch()
    let comment = ''
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data: any) => {
            comment = data.body
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueAssignedWithLabelsPayload('bug', 'enhancement')})

    expect(comment).toBe('hello branch for issue 1')
})

test('Buy Pro message in comment for subscriptions activated after Pro plan introduction', async () => {
    if (utils.isRunningInGitHubActions()) { // Test fails in GitHub Actions due to application logic
        return
    }
    nockNonExistingBranch('issue-1-Test_issue')
    nockEmptyConfig()
    const marketplaceFreePlanCopy = JSON.parse(JSON.stringify(marketplaceFreePlan))
    marketplaceFreePlanCopy.marketplace_purchase.updated_at = '2021-04-08T19:51:53Z'
    nockMarketplacePlan(marketplaceFreePlanCopy)
    let comment = ''
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data: any) => {
            comment = data.body
            return true
        })
        .reply(200)

    const ctx = {
        name: 'issues', payload: privateOrganizationRepoPayload(issueAssignedPayload)
    }

    await probot.receive(ctx as any)

    expect(comment).toBeDefined()
    expect(comment.toLowerCase().indexOf('buy')).toBeGreaterThan(0)
})

test('open a pull request when mode is immediate', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: immediate\nopenPR: true')
    nockCreateBranch()
    nockCommentCreated()
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockCommitTreeSha('87654321', '12344321')
    nockCommit()
    nockUpdateBranch('issue-1-Test_issue')
    nockCreatePR()

    await probot.receive({id: '', name: 'issues', payload: issueOpenedPayload as any})
})
