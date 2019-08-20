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
})

function nockAccessToken () {
  nock('https://api.github.com')
    .post('/app/installations/1296032/access_tokens')
    .reply(200, { token: 'test' })
}

function nockEmptyConfig () {
  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yml')
    .reply(404)
}

function nockConfig (base64Yaml) {
  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yml')
    .reply(200, { content: base64Yaml, encoding: 'base64' })
}

function nockExistingBranch (name, sha) {
  nock('https://api.github.com')
    .get(`/repos/robvanderleek/create-issue-branch/git/refs/heads/${name}`)
    .reply(200, { object: { sha: sha } })
}

test('creates a branch when an issue is assigned', async () => {
  nockAccessToken()
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
  nockAccessToken()
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
  nockAccessToken()
  nockExistingBranch('master', 123456789)
  nockConfig('YnJhbmNoTmFtZTogc2hvcnQK') // echo "branchName: short" | base64
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

test('get full branch name from issue title', () => {
  expect(myProbotApp.getFullBranchNameFromIssue(1, 'Hello world')).toBe('issue-1-Hello_world')
  expect(myProbotApp.getFullBranchNameFromIssue(2, 'Test issue...')).toBe('issue-2-Test_issue')
})

test('get branch name from issue', async () => {
  let ctx = { config: () => ({ branchName: 'tiny' }) }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, 12, 'Hello world')).toBe('i12')

  ctx = { config: () => ({ branchName: 'short' }) }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, 12, 'Hello world')).toBe('issue-12')

  ctx = { config: () => ({ branchName: 'full' }) }
  expect(await myProbotApp.getBranchNameFromIssue(ctx, 12, 'Hello world')).toBe('issue-12-Hello_world')
})
