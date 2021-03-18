const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')

async function handle (app, ctx) {
  app.log('Issue was assigned')
  const config = await Config.load(ctx)
  if (!Config.isModeAuto(config)) {
    return
  }
  if (github.skipBranchCreationForIssue(ctx, config)) {
    app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
    return
  }
  const branchName = await github.getBranchNameFromIssue(ctx, config)
  await github.createIssueBranch(app, ctx, branchName, config)
  const shouldCreatePR = Config.shouldOpenPR(config)
  if (shouldCreatePR) {
    const assignee = context.getAssignee(ctx)
    app.log(`Creating pull request for user ${assignee}`)
    await github.createPR(app, ctx, config, assignee, branchName)
  }
  utils.logMemoryUsage(app)
}

module.exports = {
  handle: handle
}
