const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')

async function handle (app, ctx, comment) {
  if (Config.isChatOpsCommand(comment)) {
    await chatOpsCommandGiven(app, ctx, comment)
  }
}

async function getBranchName (ctx, config, comment) {
  if (Config.isExperimentalBranchNameArgument(config)) {
    const commandArgument = Config.getChatOpsCommandArgument(comment)
    if (commandArgument) {
      return await github.getBranchName(ctx, config, commandArgument)
    } else {
      return await github.getBranchNameFromIssue(ctx, config)
    }
  } else {
    return await github.getBranchNameFromIssue(ctx, config)
  }
}

async function chatOpsCommandGiven (app, ctx, comment) {
  app.log.debug('ChatOps command received')
  const config = await Config.load(ctx)
  if (!Config.isModeChatOps(config)) {
    app.log('Received ChatOps command but current mode is not `chatops`, exiting')
    return
  }
  if (github.skipBranchCreationForIssue(ctx, config)) {
    app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
    return
  }
  const branchName = await getBranchName(ctx, config, comment)
  if (await github.branchExists(ctx, branchName)) {
    app.log('Could not create branch as it already exists')
    await github.addComment(ctx, config, 'Branch already exists')
    return
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
