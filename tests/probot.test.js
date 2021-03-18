const nock = require('nock')
const helpers = require('./test-helpers')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const pullRequestClosedPayload = require('./test-fixtures/pull_request.closed.json')

let probot

beforeAll(() => {
  helpers.initNock()
})

beforeEach(() => {
  probot = helpers.initProbot()
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

test('custom message in comment', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockConfig('commentMessage: \'hello world\'')
  helpers.nockCreateBranch()
  let comment = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
      comment = data.body
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })

  expect(comment).toBe('hello world')
})

test('custom message with placeholder substitution in comment', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('commentMessage: \'hello branch for issue ${issue.number}\'')
  helpers.nockCreateBranch()
  let comment = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
      comment = data.body
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })

  expect(comment).toBe('hello branch for issue 1')
})
