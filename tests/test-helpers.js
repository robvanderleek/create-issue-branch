const nock = require('nock')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const commentCreatedPayload = require('./test-fixtures/issue_comment.created.json')
const myProbotApp = require('../src/probot')
const { Probot, ProbotOctokit } = require('probot')

function issueAssignedWithLabelsPayload (...labels) {
  return payloadWithLabels(issueAssignedPayload, labels)
}

function commentCreatedWithLabelsPayload (...labels) {
  return payloadWithLabels(commentCreatedPayload, labels)
}

function payloadWithLabels (payload, labels) {
  const issueCopy = JSON.parse(JSON.stringify(payload))
  labels.forEach(l => issueCopy.issue.labels.push({ name: l }))
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
    .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yml')
    .reply(404)
    .get('/repos/robvanderleek/.github/contents/.github%2Fissue-branch.yml')
    .reply(404)
    .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yaml')
    .reply(404)
    .get('/repos/robvanderleek/.github/contents/.github%2Fissue-branch.yaml')
    .reply(404)
}

function nockConfig (yamlConfig) {
  nock('https://api.github.com')
    .persist()
    .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yml')
    .reply(200, yamlConfig)
}

function nockExistingBranch (name, sha) {
  nock('https://api.github.com')
    .get(`/repos/robvanderleek/create-issue-branch/git/refs/heads%2F${encodeURIComponent(name)}`)
    .reply(200, { object: { sha: sha } })
}

function nockNonExistingBranch (name) {
  nock('https://api.github.com')
    .get(`/repos/robvanderleek/create-issue-branch/git/refs/heads%2F${encodeURIComponent(name)}`)
    .reply(404)
}

function nockBranchCreatedComment () {
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues/1/comments')
    .reply(200)
}

function nockCreateBranch () {
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs')
    .reply(200)
}

function getDefaultContext () {
  return {
    payload: {
      repository: {
        owner: {
          login: 'robvanderleek'
        }, //
        name: 'create-issue-branch', //
        default_branch: 'master'
      }, //
      issue: { number: 1, title: 'Hello world' }
    }, //
    octokit: {
      pulls: {
        create: () => {}
      }, //
      git: {
        getCommit: () => ({ data: { tree: { sha: '1234abcd' } } }),
        createCommit: () => ({ data: { sha: 'abcd1234' } }),
        createRef: () => {},
        updateRef: () => {}
      }, //
      issues: {
        createComment: () => {}
      }
    }, //
    issue: () => {}
  }
}

function initNock () {
  nock.disableNetConnect()
  const logRequest = (r) => console.log(`No match: ${r.path}, method: ${r.method}, host: ${r.options.host}`)
  nock.emitter.on('no match', req => { logRequest(req) })
}

function initProbot () {
  const result = new Probot({
    id: 1, //
    githubToken: 'test', // Disable throttling & retrying requests for easier testing
    Octokit: ProbotOctokit.defaults({
      retry: { enabled: false }, throttle: { enabled: false }
    })
  })
  const app = result.load(myProbotApp)
  app.app = {
    getInstallationAccessToken: () => Promise.resolve('test')
  }
  nock.cleanAll()
  jest.setTimeout(10000)
  nockAccessToken()
  return result
}

module.exports = {
  issueAssignedWithLabelsPayload: issueAssignedWithLabelsPayload,
  commentCreatedWithLabelsPayload: commentCreatedWithLabelsPayload,
  nockAccessToken: nockAccessToken,
  nockEmptyConfig: nockEmptyConfig,
  nockConfig: nockConfig,
  nockExistingBranch: nockExistingBranch,
  nockNonExistingBranch: nockNonExistingBranch,
  nockBranchCreatedComment: nockBranchCreatedComment,
  nockCreateBranch: nockCreateBranch,
  getDefaultContext: getDefaultContext,
  initNock: initNock,
  initProbot: initProbot
}
