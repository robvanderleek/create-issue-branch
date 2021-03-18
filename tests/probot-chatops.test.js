const nock = require('nock')
const helpers = require('./test-helpers')
const commentCreatedPayload = require('./test-fixtures/issue_comment.created.json')
const issueCreatedPayload = require('./test-fixtures/issues.opened.json')

let probot

beforeAll(() => {
  helpers.initNock()
})

beforeEach(() => {
  probot = helpers.initProbot()
})

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

test('creates a branch when a chatops command is given when issue is created', async () => {
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

  await probot.receive({ name: 'issues', payload: issueCreatedPayload })

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

test('do not create a branch for issue labels that are configured to be skipped', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  const ymlConfig = `mode: chatops\nbranches:
  - label: question
    skip: true`
  helpers.nockConfig(ymlConfig)
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issue_comment', payload: helpers.commentCreatedWithLabelsPayload('question') })

  expect(createEndpointCalled).toBeFalsy()
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
