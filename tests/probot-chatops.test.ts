import {Probot} from "probot";
import nock from "nock";
import commentCreatedPayload from "./test-fixtures/issue_comment.created.json";
import issueCreatedPayload from "./test-fixtures/issues.opened.json";
import {
    commentCreatedWithLabelsPayload,
    initNock,
    initProbot,
    nockCommentCreated,
    nockCommit,
    nockCommitTreeSha,
    nockConfig,
    nockCreateBranch,
    nockCreatePR,
    nockExistingBranch,
    nockIssueAssignees,
    nockIssueLabels,
    nockNonExistingBranch,
    nockUpdateBranch
} from "./test-helpers";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('creates a branch when a chatops command is given', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: chatops')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
            body = data.body
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
        'Branch [issue-1-Test_issue](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Test_issue) created!')
})

test('creates a branch when a chatops command is given when issue is created', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: chatops')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
            body = data.body
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueCreatedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
        'Branch [issue-1-Test_issue](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Test_issue) created!')
})

test('creates a branch when mode is immediate and an issue is created', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: immediate')
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (_) => {
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issues', payload: issueCreatedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
})

test('create branch anyway when a chatops command is given and mode is not chatops', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: auto')
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', () => {
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
})

test('creates a branch when a chatops command is given, no comment', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: chatops\nsilent: true')
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})

    expect(createEndpointCalled).toBeTruthy()
})

test('do not create a branch for issue labels that are configured to be skipped', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    const ymlConfig = `mode: chatops\nbranches:
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

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedWithLabelsPayload('question')})

    expect(createEndpointCalled).toBeFalsy()
})

test('ignore chatops command if not at start of line', async () => {
    nockConfig('mode: chatops')
    let createEndpointCalled = false

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = 'This command: /cib'
    await probot.receive({id: '', name: 'issue_comment', payload: payloadCopy})

    expect(createEndpointCalled).toBeFalsy()
})

test('chatops command with title argument', async () => {
    nockNonExistingBranch('issue-1-Simple_NPE_fix')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockConfig('mode: chatops\nexperimental:\n  branchNameArgument: true')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
            body = data.body
            return true
        })
        .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = '/cib Simple NPE fix'
    await probot.receive({id: '', name: 'issue_comment', payload: payloadCopy as any})

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
        'Branch [issue-1-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Simple_NPE_fix) created!')
})

test('chatops command with title argument and custom branch name', async () => {
    nockNonExistingBranch('1-foo-Simple_NPE_fix')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockConfig( // eslint-disable-next-line no-template-curly-in-string
        'branchName: \'${issue.number}-foo-${issue.title}\'\nmode: chatops\nexperimental:\n  branchNameArgument: true')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
            createEndpointCalled = true
            return true
        })
        .reply(200)
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
            body = data.body
            return true
        })
        .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = '/cib Simple NPE fix'
    await probot.receive({id: '', name: 'issue_comment', payload: payloadCopy})

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
        'Branch [1-foo-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/1-foo-Simple_NPE_fix) created!')
})

test('warn about existing branches', async () => {
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockConfig('mode: chatops')
    let commentEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
            commentEndpointCalled = true
            body = data.body
            return true
        })
        .reply(200)

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})

    expect(commentEndpointCalled).toBeTruthy()
    expect(body).toBe('Branch already exists')
})

test('open a pull request when a chatops command is given', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: chatops\nopenPR: true')
    nockCreateBranch()
    nockCommentCreated()
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockCommitTreeSha('87654321', '12344321')
    nockCommit()
    nockUpdateBranch('issue-1-Test_issue')
    nockCreatePR()

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})
})

test('open a pull request but do not create a branch for issue with release label', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('release', '98765432')
    let config = ''
    config += 'mode: chatops\n'
    config += 'openPR: true\n'
    config += 'branches:\n'
    config += '- label: "release"\n'
    config += '  name: develop\n'
    config += '  prTarget: release\n'
    config += '  skipBranch: true\n'
    nockConfig(config)
    nockCommentCreated()
    nockExistingBranch('develop', '87654321')
    nockCommitTreeSha('87654321', '12344321')
    nockCommit()
    nockUpdateBranch('develop')
    nockCreatePR()

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedWithLabelsPayload('release') as any})
})

test('open a pull request, copy labels and assignee from issue', async () => {
    nockNonExistingBranch('issue-1-Test_issue')
    nockExistingBranch('master', '12345678')
    nockExistingBranch('master', '12345678')
    nockConfig(`
    mode: chatops
    openPR: true
    silent: true
    copyIssueLabelsToPR: true
    copyIssueAssigneeToPR: true`)
    nockCreateBranch()
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockCommitTreeSha('87654321', '12344321')
    nockCommit()
    nockUpdateBranch('issue-1-Test_issue')
    nockCreatePR()
    nockIssueLabels()
    nockIssueAssignees()

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})
})

test('do not open a pull request when the branch already exists', async () => {
    nockExistingBranch('issue-1-Test_issue', '87654321')
    nockExistingBranch('master', '12345678')
    nockConfig('mode: chatops\nopenPR: true')
    nockCommentCreated()

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any})
})
