const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')

async function handle (app, ctx, comment) {
  if (Config.isChatOpsCommand(comment)) {
    const config = await Config.load(ctx)
    await chatOpsCommandGiven(app, ctx, config, comment)
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

async function chatOpsCommandGiven (app, ctx, config, comment) {
  app.log.debug('ChatOps command received')
  if (!Config.isModeChatOps(config)) {
    app.log('Received ChatOps command but current mode is not `chatops`')
  }
  if (github.skipForIssue(ctx, config)) {
    app.log(`Skipping run for issue: ${context.getIssueTitle(ctx)}`)
    return
  }
  let branchName
  if (github.skipBranchCreationForIssue(ctx, config)) {
    app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
    branchName = await github.getSourceBranch(ctx, config)
  } else {
    branchName = await getBranchName(ctx, config, comment)
    if (await github.branchExists(ctx, branchName)) {
      app.log('Could not create branch as it already exists')
      await github.addComment(ctx, config, 'Branch already exists')
      return
    }
    await github.createIssueBranch(app, ctx, branchName, config)
  }
  const shouldCreatePR = Config.shouldOpenPR(config)
  if (shouldCreatePR) {
    const sender = context.getSender(ctx)
    app.log(`Creating pull request for user ${sender}`)
    await github.createPr(app, ctx, config, sender, branchName)
  }
  utils.logMemoryUsage(app)
}

module.exports = {
  handle: handle,
  chatOpsCommandGiven: chatOpsCommandGiven
}
