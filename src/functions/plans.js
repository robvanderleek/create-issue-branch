const { createProbot } = require('probot')
const app = require('../probot')
const { listAppSubscriptions } = require('../plans')

const probot = createProbot()
const loadingApp = probot.load(app)

const handler = async function (event, _) {
  try {
    await loadingApp
    const subscriptions = await listAppSubscriptions(probot)
    return {
      statusCode: 200, body: JSON.stringify(subscriptions)
    }
  } catch (error) {
    probot.log.error(error)
    return {
      statusCode: error.status || 500, error: 'Oops'
    }
  }
}

module.exports = {
  handler: handler
}
