const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')

async function handle (app, ctx, comment) {
  if (Config.isChatOpsCommand(comment)) {
    await chatOpsCommandGiven(app, ctx, comment)
  }
}

async function chatOpsCommandGiven (app, ctx, comment) {
  app.log('ChatOps command received')
  const config = await Config.load(ctx)
  if (!Config.isModeChatOps(config)) {
    app.log('Received ChatOps command but current mode is not `chatops`, exiting')
    return
  }
  if (github.skipBranchCreationForIssue(ctx, config)) {
    app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
    return
  }
  let branchName
  if (Config.isExperimentalBranchNameArgument(config)) {
    const commandArgument = Config.getChatOpsCommandArgument(comment)
    if (commandArgument) {
      branchName = await github.getBranchName(ctx, config, commandArgument)
    } else {
      branchName = await github.getBranchNameFromIssue(ctx, config)
    }
  } else {
    branchName = await github.getBranchNameFromIssue(ctx, config)
  }
  await github.createIssueBranch(app, ctx, branchName, config)
  const shouldCreatePR = Config.shouldOpenPR(config)
  if (shouldCreatePR) {
    const sender = context.getSender(ctx)
    app.log(`Creating pull request for user ${sender}`)
    await github.createPR(app, ctx, config, sender, branchName)
  }
  utils.logMemoryUsage(app)
}

module.exports = {
  handle: handle
}
