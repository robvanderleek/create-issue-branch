const Config = require('./../config')
const { chatOpsCommandGiven } = require('./comment-created')
const { issueAssigned } = require('./issue-assigned')

async function handle (app, ctx, comment) {
  const config = await Config.load(ctx)
  if (Config.isModeImmediate(config)) {
    await issueAssigned(app, ctx, config)
  } else if (Config.isChatOpsCommand(comment)) {
    await chatOpsCommandGiven(app, ctx, config, comment)
  }
}

module.exports = {
  handle: handle
}
