const nock = require('nock')
const myProbotApp = require('./probot')
const { Probot } = require('probot')
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
  probot = new Probot({})
  const app = probot.load(myProbotApp)
  app.app = {
    getInstallationAccessToken: () => Promise.resolve('test')
  }
  nock.cleanAll()
  jest.setTimeout(10000)
  nockAccessToken()
})

function issueAssignedWithEnhancementLabelPayload () {
  const issueCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
  issueCopy.issue.labels.push({
    id: 1456956805,
    node_id: 'MDU6TGFiZWwxNDU2OTU2ODA1',
    url: 'https://api.github.com/repos/robvanderleek/create-issue-branch/labels/enhancement',
    name: 'enhancement',
    color: 'a2eeef',
    default: true
  })
  return issueCopy
}

function issueAssignedWithBugAndEnhancementLabelsPayload () {
  const issueCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
  issueCopy.issue.labels.push({
    id: 1456956799,
    node_id: 'MDU6TGFiZWwxNDU2OTU2Nzk5',
    url: 'https://api.github.com/repos/robvanderleek/create-issue-branch/labels/bug',
    name: 'bug',
    color: 'd73a4a',
    default: true
  })
  issueCopy.issue.labels.push({
    id: 1456956805,
    node_id: 'MDU6TGFiZWwxNDU2OTU2ODA1',
    url: 'https://api.github.com/repos/robvanderleek/create-issue-branch/labels/enhancement',
    name: 'enhancement',
    color: 'a2eeef',
    default: true
  })
  return issueCopy
}

function nockAccessToken () {
  nock('https://api.github.com')
    .post('/app/installations/1296032/access_tokens')
    .reply(200, { token: 'test' })
}

function nockEmptyConfig () {
  nock('https://api.github.com')
    .persist()
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yml')
    .reply(404)
    .get('/repos/robvanderleek/.github/contents/.github/issue-branch.yml')
    .reply(404)
}

function nockConfig (yamlConfig) {
  const encoding = 'base64'
  nock('https://api.github.com')
    .persist()
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yml')
    .reply(200, { content: Buffer.from(yamlConfig).toString(encoding), encoding: encoding })
}

function nockExistingBranch (name, sha) {
  nock('https://api.github.com')
    .get(`/repos/robvanderleek/create-issue-branch/git/refs/heads/${name}`)
    .reply(200, { object: { sha: sha } })
}

function nockNonExistingBranch (name) {
  nock('https://api.github.com')
    .get(`/repos/robvanderleek/create-issue-branch/git/refs/heads/${name}`)
    .reply(404)
}

test('creates a branch when an issue is assigned', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', 12345678)
  nockEmptyConfig()
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
  nockExistingBranch('issue-1-Test_issue', 87654321)
  nockEmptyConfig()
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

test('create short branch when configured that way', async () => {
  nockNonExistingBranch('issue-1')
  nockExistingBranch('master', 12345678)
  nockConfig('branchName: short')
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
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('dev', 'abcd1234')
  nockEmptyConfig()
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

test('source branch can be configured based on issue label', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('dev', 'abcd1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('source branch can be configured based on issue label with wildcard pattern', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('dev', 'abcd1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('source branch based on catch-all fallthrough', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('bug', 'abcd1234')
  nockExistingBranch('issues', 'fghi5678')
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

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(sourceSha).toBe('fghi5678')
})

test('source branch based on label where configuration contains catch-all fallthrough', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('enhancement', 'abcd1234')
  nockExistingBranch('issues', 'fghi5678')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('if configured source branch does not exist use default branch', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockNonExistingBranch('dev')
  nockExistingBranch('master', '12345678')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('12345678')
})

test('if multiple issue labels match configuration use first match', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('dev', 'abcd1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithBugAndEnhancementLabelsPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('configuration with label branch and prefix', async () => {
  nockNonExistingBranch('feature/issue-1-Test_issue')
  nockExistingBranch('master', '12345678')
  nockExistingBranch('dev', 'abcd1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithBugAndEnhancementLabelsPayload() })

  expect(sourceSha).toBe('abcd1234')
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
    .reply(200, { items: [] })

  let issueTitle = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues', body => {
      issueTitle = body.title
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedWithBugAndEnhancementLabelsPayload() })
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
    .reply(200, { items: [] })

  let issueTitle = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues', body => {
      issueTitle = body.title
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedWithBugAndEnhancementLabelsPayload() })
  expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('creates a branch when a chatops command is given', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', 12345678)
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

  await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(body).toBe(
    'Branch [issue-1-Test_issue](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Test_issue) created!')
})

test('do nothing when a chatops command is given and mode is not chatops', async () => {
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', 12345678)
  nockConfig('mode: auto')
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
  nockNonExistingBranch('issue-1-Test_issue')
  nockExistingBranch('master', 12345678)
  nockConfig('mode: chatops\nsilent: true')
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

test('create branch with custom issue name', async () => {
  nockNonExistingBranch('foo-1-Test_issue')
  nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  nockConfig('branchName: \'foo-${issue.number}-${issue.title}\'')
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

test('create branch with custom short issue name', async () => {
  nockNonExistingBranch('foo-1')
  nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  nockConfig('branchName: \'foo-${issue.number}\'')
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
  nockNonExistingBranch('1-Test_issue')
  nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  nockConfig('branchName: \'${issue.number}-${issue.title}\'')
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
  nockConfig('autoCloseIssue: true')

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
  nockConfig('autoCloseIssue: true')

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
  nockNonExistingBranch('1_Test_issue')
  nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  nockConfig('branchName: \'${issue.number}/${issue.title}\'')
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(branchRef).toBe('refs/heads/1_Test_issue')
})
