const nock = require('nock')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')

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

function issueAssignedWithQuestionLabelPayload () {
  const issueCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
  issueCopy.issue.labels.push({
    id: 2005019682,
    node_id: 'MDU6TGFiZWwyMDA1MDE5Njgy',
    url: 'https://api.github.com/repos/robvanderleek/create-issue-branch/labels/question',
    name: 'question',
    color: 'd876e3',
    default: true,
    description: 'Further information is requested'
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

module.exports = {
  issueAssignedWithEnhancementLabelPayload: issueAssignedWithEnhancementLabelPayload,
  issueAssignedWithQuestionLabelPayload: issueAssignedWithQuestionLabelPayload,
  issueAssignedWithBugAndEnhancementLabelsPayload: issueAssignedWithBugAndEnhancementLabelsPayload,
  nockAccessToken: nockAccessToken,
  nockEmptyConfig: nockEmptyConfig,
  nockConfig: nockConfig,
  nockExistingBranch: nockExistingBranch,
  nockNonExistingBranch: nockNonExistingBranch
}
