const issueLabeledPayload = require('../test-fixtures/issues.labeled.json')
const helpers = require('../test-helpers')

let probot

beforeAll(() => {
  helpers.initNock()
})

beforeEach(() => {
  probot = helpers.initProbot()
})

test('do nothing if not configured', async () => {
  helpers.nockEmptyConfig()

  await probot.receive({ name: 'issues', payload: issueLabeledPayload })
})

test('prefix PR title', async () => {
  helpers.nockConfig('conventionalPrTitles: true')
  helpers.nockPulls('issue-44-New_issue', [{ number: 45, title: 'New issue', labels: [] }])
  helpers.nockUpdatePull(45)

  await probot.receive({ name: 'issues', payload: issueLabeledPayload })
})
