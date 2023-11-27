const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')
const core = require('@actions/core')

async function handle (app, ctx) {
  app.log.debug('Issue was assigned')
  const config = await Config.load(ctx)
  if (!Config.isModeAuto(config)) {
    return
  }
  await issueAssigned(app, ctx, config)
  utils.logMemoryUsage(app)
}

async function issueAssigned (app, ctx, config) {
  if (github.skipForIssue(ctx, config)) {
    app.log(`Skipping run for issue: ${context.getIssueTitle(ctx)}`)
    return
  }
  let branchName
  if (github.skipBranchCreationForIssue(ctx, config)) {
    app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
    branchName = await github.getSourceBranch(ctx, config)
  } else {
    branchName = await github.getBranchNameFromIssue(ctx, config)
    if (await github.branchExists(ctx, branchName)) {
      app.log('Could not create branch as it already exists')
      if (utils.isRunningInGitHubActions()) {
        core.setOutput('branchName', branchName)
      }
      return
    }
    await github.createIssueBranch(app, ctx, branchName, config)
  }
  const shouldCreatePR = Config.shouldOpenPR(config)
  if (shouldCreatePR) {
    const assignee = context.getAssignee(ctx)
    app.log(`Creating pull request for user ${assignee}`)
    await github.createPr(app, ctx, config, assignee, branchName)
  }
}

module.exports = {
  handle: handle,
  issueAssigned: issueAssigned
}
