const issueLabeledPayload = require('../test-fixtures/issues.labeled.json')
const testHelpers = require('../test-helpers')

let probot

beforeAll(() => {
  testHelpers.initNock()
})

beforeEach(() => {
  probot = testHelpers.initProbot()
})

test('do nothing if not configured', async () => {
  testHelpers.nockEmptyConfig()

  await probot.receive({ name: 'issues', payload: issueLabeledPayload })
})

test('prefix PR title', async () => {
  testHelpers.nockConfig('conventionalPrTitles: true')
  testHelpers.nockPulls('issue-44-New_issue', [{ number: 45, title: 'New issue', labels: [] }])
  testHelpers.nockUpdatePull(45)
  const updatePr = jest.fn()
  probot.state.octokit.pulls.update = updatePr

  await probot.receive({ name: 'issues', payload: issueLabeledPayload })

  expect(updatePr).toHaveBeenCalledWith({
    pull_number: 45, title: 'fix: 🐛 New issue', owner: 'robvanderleek', repo: 'create-issue-branch'
  })
})

test('prefix PR title semver-no-gitmoji style', async () => {
  testHelpers.nockConfig('conventionalPrTitles: true\nconventionalStyle: semver-no-gitmoji')
  testHelpers.nockPulls('issue-44-New_issue', [{ number: 45, title: 'New issue', labels: [] }])
  testHelpers.nockUpdatePull(45)
  const updatePr = jest.fn()
  probot.state.octokit.pulls.update = updatePr

  await probot.receive({ name: 'issues', payload: issueLabeledPayload })

  expect(updatePr).toHaveBeenCalledWith({
    pull_number: 45, title: 'fix: New issue', owner: 'robvanderleek', repo: 'create-issue-branch'
  })
})
