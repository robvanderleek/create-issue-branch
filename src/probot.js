const Sentry = require('@sentry/node')
const Config = require('./config')
const context = require('./context')
const github = require('./github')
const utils = require('./utils')
const stats = require('../static/stats.json')

module.exports = ({ app, getRouter }) => {
  app.log('App was loaded')
  addStatsRoute(getRouter)
  configureSentry(app)
  logMemoryUsage(app)
  app.on('issues.assigned', async ctx => {
    await issueAssigned(app, ctx)
  })
  app.on('issue_comment.created', async ctx => {
    const comment = ctx.payload.comment.body
    await commentCreated(app, ctx, comment)
  })
  app.on('pull_request.closed', async ctx => {
    await pullRequestClosed(app, ctx)
  })
  app.on('issues.opened', async ctx => {
    const comment = ctx.payload.issue.body
    await commentCreated(app, ctx, comment)
  })
}

function addStatsRoute (getRouter) {
  const router = getRouter('/probot')
  router.get('/stats', (req, res) => {
    res.send(stats)
  })
}

function configureSentry (app) {
  if (process.env.SENTRY_DSN) {
    app.log('Setting up Sentry.io logging...')
    Sentry.init({ dsn: process.env.SENTRY_DSN })
  } else {
    app.log('Skipping Sentry.io setup')
  }
}

function logMemoryUsage (app) {
  app.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Mb')
}

async function issueAssigned (app, ctx) {
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
  const shouldCreatePR = Config.shouldOpenPR(config) && utils.isRunningInGitHubActions()
  if (shouldCreatePR) {
    const assignee = context.getAssignee(ctx)
    app.log(`Creating pull request for user ${assignee}`)
    await github.createPR(app, ctx, config, assignee, branchName)
  }
  logMemoryUsage(app)
}

async function commentCreated (app, ctx, comment) {
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
  const shouldCreatePR = Config.shouldOpenPR(config) && utils.isRunningInGitHubActions()
  if (shouldCreatePR) {
    const sender = context.getSender(ctx)
    app.log(`Creating pull request for user ${sender}`)
    await github.createPR(app, ctx, config, sender, branchName)
  }
  logMemoryUsage(app)
}

async function pullRequestClosed (app, ctx) {
  if (ctx.payload.pull_request.merged === true) {
    const config = await Config.load(ctx)
    if (config && Config.autoCloseIssue(config)) {
      const owner = context.getRepoOwner(ctx)
      const repo = context.getRepoName(ctx)
      const branchName = ctx.payload.pull_request.head.ref
      const issueNumber = github.getIssueNumberFromBranchName(branchName)
      if (issueNumber) {
        const issueForBranch = await ctx.octokit.issues.get({ owner: owner, repo: repo, issue_number: issueNumber })
        if (issueForBranch) {
          await ctx.octokit.issues.update({ owner: owner, repo: repo, issue_number: issueNumber, state: 'closed' })
        }
      }
    }
  }
}
