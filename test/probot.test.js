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
})

test('creates a branch when an issue is assigned', async () => {
  nock('https://api.github.com')
    .post('/app/installations/1296032/access_tokens')
    .reply(200, { token: 'test' })

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/git/refs/heads/master')
    .reply(200, { object: { sha: 123456789 } })

  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
})

test('do not create a branch when it already exists', async () => {
  nock('https://api.github.com')
    .post('/app/installations/1296032/access_tokens')
    .reply(200, { token: 'test' })

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/git/refs/heads/issue-1-Test_issue')
    .reply(200, { object: { sha: 987654321 } })

  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeFalsy()
})

test('get branch name from issue title', () => {
  expect(myProbotApp.getBranchNameFromIssue(1, 'Hello world')).toBe('issue-1-Hello_world')
  expect(myProbotApp.getBranchNameFromIssue(2, 'Test issue...')).toBe('issue-2-Test_issue')
})
