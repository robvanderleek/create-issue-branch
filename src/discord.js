const nodeFetch = require('node-fetch')

async function message (s) {
  if (process.env.DISCORD_WEBHOOK_URL) {
    await nodeFetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: s })
    })
  }
}

module.exports = {
  message: message
}
