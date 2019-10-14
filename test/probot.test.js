const nock = require('nock')
const myProbotApp = require('../probot')
const { Probot } = require('probot')
const issueAssignedPayload = require('./fixtures/issues.assigned')

nock.disableNetConnect()

let probot

beforeEach(() => {
  probot = new Probot({})
  const app = probot.load(myProbotApp)

  app.app = () => 'test'
  nock.cleanAll()
  jest.setTimeout(10000)
  nockAccessToken()
})

function issueAssignedWithSingleLabelPayload () {
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

function issueAssignedWithMultipleLabelsPayload () {
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

test('creates a branch when an issue is assigned', async () => {
  nockExistingBranch('master', 123456789)
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
  nockExistingBranch('issue-1-Test_issue', 987654321)
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
  nockExistingBranch('master', 123456789)
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
  nockExistingBranch('master', '123456789')
  nockExistingBranch('dev', 'abcde1234')
  nockEmptyConfig()
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(sourceSha).toBe('123456789')
})

test('source branch can be configured based on issue label', async () => {
  nockExistingBranch('master', '123456789')
  nockExistingBranch('dev', 'abcde1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithSingleLabelPayload() })

  expect(sourceSha).toBe('abcde1234')
})

test('if configured source branch does not exist use default branch', async () => {
  nockExistingBranch('master', '123456789')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithSingleLabelPayload() })

  expect(sourceSha).toBe('123456789')
})

test('if multiple issue labels match configuration use first match', async () => {
  nockExistingBranch('master', '123456789')
  nockExistingBranch('dev', 'abcde1234')
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

  await probot.receive({ name: 'issues', payload: issueAssignedWithMultipleLabelsPayload() })

  expect(sourceSha).toBe('abcde1234')
})

test('get full branch name from issue title', () => {
  expect(myProbotApp.getFullBranchNameFromIssue(1, 'Hello world')).toBe('issue-1-Hello_world')
  expect(myProbotApp.getFullBranchNameFromIssue(2, 'Test issue...')).toBe('issue-2-Test_issue')
})

test('get branch name from issue', async () => {
  const ctx = { payload: { issue: { number: 12, title: 'Hello world' } } }
  let config = { branchName: 'tiny' }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, config)).toBe('i12')

  config = { branchName: 'short' }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, config)).toBe('issue-12')

  config = { branchName: 'full' }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, config)).toBe('issue-12-Hello_world')
})

test('get branch configuration for issue', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const branchConfig = myProbotApp.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeDefined()
  expect(branchConfig.prefix).toBe('feature/')
})

test('issue has no branch configuration', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'bug' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const branchConfig = myProbotApp.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeUndefined()
})

test('get issue branch prefix', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const prefix = myProbotApp.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('feature/')
})

test('get issue branch prefix for issue that has no branch configuration', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'bug' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const prefix = myProbotApp.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('')
})

test('interpolate string with object field expression', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = myProbotApp.interpolate('hello ${hello}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = myProbotApp.interpolate('hello ${outer.inner}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with undefined object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = myProbotApp.interpolate('hello ${inner.outer}', o)
  expect(result).toBe('hello undefined')
})

test('interpolate string with issue assigned payload', () => {
  // eslint-disable-next-line no-template-curly-in-string
  const result = myProbotApp.interpolate('Creator ${issue.user.login}, repo: ${repository.name}', issueAssignedPayload)
  expect(result).toBe('Creator robvanderleek, repo: create-issue-branch')
})

test('get issue branch prefix with context expression interpolation', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }], user: { login: 'robvanderleek' } } } }
  // eslint-disable-next-line no-template-curly-in-string
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/${issue.user.login}/' }] }
  const prefix = myProbotApp.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('feature/robvanderleek/')
})

test('get branch name from issue with only branch prefix configured', async () => {
  const ctx = { payload: { issue: { number: 12, title: 'Hello world', labels: [{ name: 'enhancement' }] } } }
  const config = { branchName: 'short', branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, config)).toBe('feature/issue-12')
})

test('handle branch already exist', async () => {
  const ctx = {
    github: {
      gitdata: {
        createRef: () => {
          const error = { message: 'Oops, branch already exists' }
          throw error
        }
      }
    }
  }
  const log = { warn: jest.fn() }

  await myProbotApp.createBranch(ctx, 'robvanderleek', 'create-issue-branch', 'issue-1', '1234abcd', log)

  expect(log.warn).toBeCalled()
})
