const { createProbot } = require('probot')
const app = require('../probot')

const probot = createProbot()
const loadingApp = probot.load(app)

exports.handler = async function (event, _) {
  try {
    await loadingApp
    const eventName = event.headers['X-GitHub-Event'] || event.headers['x-github-event']
    const payload = JSON.parse(event.body)
    await probot.webhooks.verifyAndReceive({
      id: event.headers['X-GitHub-Delivery'] || event.headers['x-github-delivery'],
      name: eventName,
      signature: event.headers['X-Hub-Signature-256'] || event.headers['x-hub-signature-256'],
      payload: payload
    })
    return {
      statusCode: 200, body: '{"ok":true}'
    }
  } catch (error) {
    probot.log.error(error)
    return {
      statusCode: error.status || 500, error: 'ooops'
    }
  }
}
