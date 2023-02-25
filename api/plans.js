const { createProbot } = require('probot')
const app = require('../src/probot')
const { listAppSubscriptions } = require('../src/plans')

const probot = createProbot()
const loadingApp = probot.load(app)

const handler = async function (_, response) {
  try {
    await loadingApp
    const subscriptions = await listAppSubscriptions(probot)
    response.status(200).json(subscriptions)
  } catch (error) {
    probot.log.error(error)
    response.status(error.status || 500).json({ error: error })
  }
}

module.exports = handler
