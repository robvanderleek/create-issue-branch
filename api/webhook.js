const { createProbot } = require('probot')
const app = require('../src/probot')

const probot = createProbot()
const loadingApp = probot.load(app)

const handler = async function (request, response) {
  try {
    await loadingApp
    const eventName = request.headers['X-GitHub-Event'] || request.headers['x-github-event']
    const payload = JSON.parse(request.body)
    await probot.webhooks.verifyAndReceive({
      id: request.headers['X-GitHub-Delivery'] || request.headers['x-github-delivery'],
      name: eventName,
      signature: request.headers['X-Hub-Signature-256'] || request.headers['x-hub-signature-256'],
      payload: payload
    })
    response.status(200).json({ ok: 'true' })
  } catch (error) {
    probot.log.error(error)
    response.status(error.status || 500, { error: error })
  }
}

module.exports = handler
