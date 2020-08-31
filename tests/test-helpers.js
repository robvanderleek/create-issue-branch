const nock = require('nock')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')

function issueAssignedWithLabelsPayload (...labels) {
  const issueCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
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
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yml')
    .reply(404)
    .get('/repos/robvanderleek/.github/contents/.github/issue-branch.yml')
    .reply(404)
    .get('/repos/robvanderleek/create-issue-branch/contents/.github/issue-branch.yaml')
    .reply(404)
    .get('/repos/robvanderleek/.github/contents/.github/issue-branch.yaml')
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

module.exports = {
  issueAssignedWithLabelsPayload: issueAssignedWithLabelsPayload,
  nockAccessToken: nockAccessToken,
  nockEmptyConfig: nockEmptyConfig,
  nockConfig: nockConfig,
  nockExistingBranch: nockExistingBranch,
  nockNonExistingBranch: nockNonExistingBranch
}
