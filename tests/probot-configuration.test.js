const nock = require('nock')
const helpers = require('./test-helpers')
const myProbotApp = require('../src/probot')
const { Probot, ProbotOctokit } = require('probot')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')

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

test('source branch can be configured based on issue label', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement') })

  expect(sourceSha).toBe('abcd1234')
})

test('source branch can be configured based on multiple issue labels', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('docs', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: 
    - enhancement
    - docs
    name: docs
  - label: enhancement
    name: dev`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement', 'docs') })

  expect(sourceSha).toBe('abcd1234')
})

test('do not create a branch for issue labels that are configured to be skipped', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  const ymlConfig = `branches:
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

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('question') })

  expect(createEndpointCalled).toBeFalsy()
})

test('source branch can be configured based on issue label with wildcard pattern', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: ?nhance*
    name: dev`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement') })

  expect(sourceSha).toBe('abcd1234')
})

test('source branch based on catch-all fallthrough', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('bug', 'abcd1234')
  helpers.nockExistingBranch('issues', 'fghi5678')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: bug
    name: bug
  - label: '*'
    name: issues`
  helpers.nockConfig(ymlConfig)
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
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('enhancement', 'abcd1234')
  helpers.nockExistingBranch('issues', 'fghi5678')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: enhancement
  - label: '*'
    name: issues`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement') })

  expect(sourceSha).toBe('abcd1234')
})

test('if configured source branch does not exist use default branch', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockNonExistingBranch('dev')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement') })

  expect(sourceSha).toBe('12345678')
})

test('if multiple issue labels match configuration use first match', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })

  expect(sourceSha).toBe('abcd1234')
})

test('configuration with label branch and prefix', async () => {
  helpers.nockNonExistingBranch('feature/issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
    prefix: feature/`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''
  let targetRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      targetRef = body.ref
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })

  expect(sourceSha).toBe('abcd1234')
  expect(targetRef).toBe('refs/heads/feature/issue-1-Test_issue')
})

test('configuration with label field missing', async () => {
  const ymlConfig = `branches:
  - name: dev
    prefix: feature/`
  helpers.nockConfig(ymlConfig)

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

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })
  expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('configuration with invalid YAML', async () => {
  const ymlConfig = `branches:
  - label: Type: Feature
    prefix: feature/`
  helpers.nockConfig(ymlConfig)

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

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('bug', 'enhancement') })
  expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('support .yaml extension for configuration file', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockBranchCreatedComment()
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  nock('https://api.github.com')
    .persist()
    .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yaml')
    .reply(200, ymlConfig)
  helpers.nockEmptyConfig()
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithLabelsPayload('enhancement') })

  expect(sourceSha).toBe('abcd1234')
})
