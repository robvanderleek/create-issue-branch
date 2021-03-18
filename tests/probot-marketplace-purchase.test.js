const helpers = require('./test-helpers')
const marketplacePurchasePayload = require('./test-fixtures/marketplace_purchase.json')
const marketplaceCancellationPayload = require('./test-fixtures/marketplace_cancellation.json')
const marketplaceDowngradePayload = require('./test-fixtures/marketplace_downgrade.json')

let probot

beforeAll(() => {
  helpers.initNock()
})

beforeEach(() => {
  probot = helpers.initProbot()
})

test('handle marketplace purchase', async () => {
  await probot.receive({ name: 'marketplace_purchase', payload: marketplacePurchasePayload })
})

test('handle marketplace cancellation', async () => {
  await probot.receive({ name: 'marketplace_purchase', payload: marketplaceCancellationPayload })
})

test('handle marketplace downgrade', async () => {
  await probot.receive({ name: 'marketplace_purchase', payload: marketplaceDowngradePayload })
})
