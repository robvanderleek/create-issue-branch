const nock = require('nock')
const helpers = require('./test-helpers')
const myProbotApp = require('../src/probot')
const { Probot, ProbotOctokit } = require('probot')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const commentCreatedPayload = require('./test-fixtures/issue_comment.created.json')
const pullRequestClosedPayload = require('./test-fixtures/pull_request.closed.json')

nock.disableNetConnect()

let probot

beforeAll(() => {
  const logRequest = (r) => console.log(`No match: ${r.path}, method: ${r.method}, host: ${r.options.host}`)
  nock.emitter.on('no match', req => { logRequest(req) })
})

beforeEach(() => {
  probot = new Probot({
    id: 1, //
    githubToken: 'test', // Disable throttling & retrying requests for easier testing
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false }, throttle: { enabled: false }
    })
  })
  const app = probot.load(myProbotApp)
  app.app = {
    getInstallationAccessToken: () => Promise.resolve('test')
  }
  nock.cleanAll()
  jest.setTimeout(10000)
  helpers.nockAccessToken()
})

test('creates a branch when an issue is assigned', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockEmptyConfig()
  helpers.nockBranchCreatedComment()
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
})

test('do not create a branch when it already exists', async () => {
  helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
  helpers.nockEmptyConfig()
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeFalsy()
})

test('do not warn about existing branches in auto mode', async () => {
  helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
  helpers.nockConfig('mode: auto\nsilent: false')
  let commentEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', () => {
      commentEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(commentEndpointCalled).toBeFalsy()
})

test('create short branch when configured that way', async () => {
  helpers.nockNonExistingBranch('issue-1')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockConfig('branchName: short')
  helpers.nockBranchCreatedComment()
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/issue-1')
})

test('source branch is default branch by, well, default', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  helpers.nockEmptyConfig()
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(sourceSha).toBe('12345678')
})

describe('ChatOps mode', () => {
  test('creates a branch when a chatops command is given', async () => {
    helpers.nockNonExistingBranch('issue-1-Test_issue')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockConfig('mode: chatops')
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

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [issue-1-Test_issue](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Test_issue) created!')
  })

  test('do nothing when a chatops command is given and mode is not chatops', async () => {
    helpers.nockConfig('mode: auto')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeFalsy()
  })

  test('creates a branch when a chatops command is given, no comment', async () => {
    helpers.nockNonExistingBranch('issue-1-Test_issue')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockConfig('mode: chatops\nsilent: true')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeTruthy()
  })

  test('ignore chatops command if not at start of line', async () => {
    helpers.nockConfig('mode: chatops')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = 'This command: /cib'
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeFalsy()
  })

  test('chatops command with title argument', async () => {
    helpers.nockNonExistingBranch('issue-1-Simple_NPE_fix')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
    helpers.nockConfig('mode: chatops\nexperimental:\n  branchNameArgument: true')
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
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [issue-1-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Simple_NPE_fix) created!')
  })

  test('chatops command with title argument and custom branch name', async () => {
    helpers.nockNonExistingBranch('1-foo-Simple_NPE_fix')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
    helpers.nockConfig( // eslint-disable-next-line no-template-curly-in-string
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
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [1-foo-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/1-foo-Simple_NPE_fix) created!')
  })

  test('warn about existing branches', async () => {
    helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
    helpers.nockConfig('mode: chatops')
    let commentEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
        commentEndpointCalled = true
        body = data.body
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(commentEndpointCalled).toBeTruthy()
    expect(body).toBe('Branch already exists')
  })
})

test('create branch with custom issue name', async () => {
  helpers.nockNonExistingBranch('foo-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockBranchCreatedComment()
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'foo-${issue.number}-${issue.title}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/foo-1-Test_issue')
})

test('create branch with custom name containing event initiator', async () => {
  helpers.nockNonExistingBranch('robvanderleek-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockBranchCreatedComment()
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'${sender.login}-${issue.number}-${issue.title}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/robvanderleek-1-Test_issue')
})

test('create branch with custom short issue name', async () => {
  helpers.nockNonExistingBranch('foo-1')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockBranchCreatedComment()
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'foo-${issue.number}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/foo-1')
})

test('create branch with GitLab-like issue name', async () => {
  helpers.nockNonExistingBranch('1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockBranchCreatedComment()
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'${issue.number}-${issue.title}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/1-Test_issue')
})

test('close issue after merge', async () => {
  helpers.nockConfig('autoCloseIssue: true')

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/issues/111')
    .reply(200)

  let state = ''
  nock('https://api.github.com')
    .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body) => {
      state = body.state
      return true
    })
    .reply(200)

  await probot.receive({ name: 'pull_request', payload: pullRequestClosedPayload })
  expect(state).toBe('closed')
})

test('do not close issue after PR close (without merge)', async () => {
  helpers.nockConfig('autoCloseIssue: true')

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/issues/111')
    .reply(200)

  let state = ''
  nock('https://api.github.com')
    .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body) => {
      state = body.state
      return true
    })
    .reply(200)

  const payloadCopy = JSON.parse(JSON.stringify(pullRequestClosedPayload))
  payloadCopy.pull_request.merged = false
  await probot.receive({ name: 'pull_request', payload: payloadCopy })
  expect(state).toBe('')
})

test('create branch with slash in branch name', async () => {
  helpers.nockNonExistingBranch('bug/1/Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockBranchCreatedComment()
  helpers.nockConfig(// eslint-disable-next-line no-template-curly-in-string
    'branchName: \'${issue.number}/${issue.title}\'\n' + //
    'branches:\n' + //
    '  - label: bug\n' + //
    '    prefix: bug/\n')
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })

  expect(branchRef).toBe('refs/heads/bug/1/Test_issue')
})
