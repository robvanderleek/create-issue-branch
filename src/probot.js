const Sentry = require('@sentry/node')
const Config = require('./config')
const context = require('./context')
const github = require('./github')

module.exports = app => {
  app.log('App was loaded')
  configureSentry(app)
  logMemoryUsage(app)
  app.on('issues.assigned', async ctx => {
    await issueAssigned(app, ctx)
  })
  app.on('issue_comment.created', async ctx => {
    await commentCreated(app, ctx)
  })
  app.on('pull_request.closed', async ctx => {
    await pullRequestClosed(app, ctx)
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
  if (config && Config.isModeAuto(config)) {
    const branchName = await github.getBranchNameFromIssue(ctx, config)
    await github.createIssueBranch(app, ctx, branchName, config)
    logMemoryUsage(app)
  }
}

async function commentCreated (app, ctx) {
  const body = ctx.payload.comment.body
  if (Config.isChatOpsCommand(body)) {
    app.log('ChatOps command received')
    const config = await Config.load(ctx)
    if (config && Config.isModeChatOps(config)) {
      const commandArgument = Config.getChatOpsCommandArgument(body)
      let branchName
      if (commandArgument) {
        branchName = await github.getBranchName(ctx, config, commandArgument)
      } else {
        branchName = await github.getBranchNameFromIssue(ctx, config)
      }
      await github.createIssueBranch(app, ctx, branchName, config)
      logMemoryUsage(app)
    }
  }
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
        const issueForBranch = await ctx.github.issues.get({ owner: owner, repo: repo, issue_number: issueNumber })
        if (issueForBranch) {
          await ctx.github.issues.update({ owner: owner, repo: repo, issue_number: issueNumber, state: 'closed' })
        }
      }
    }
  }
}
