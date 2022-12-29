const pullRequestLabeledPayload = require('../test-fixtures/pull_request.labeled.json')
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

  await probot.receive({ name: 'pull_request', payload: pullRequestLabeledPayload })
})

test('prefix PR title', async () => {
  helpers.nockConfig('conventionalPrTitles: true')
  helpers.nockIssue(672, { labels: [] })
  helpers.nockUpdatePull(675)

  await probot.receive({ name: 'pull_request', payload: pullRequestLabeledPayload })
})
