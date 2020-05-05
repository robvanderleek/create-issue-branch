const Sentry = require('@sentry/node')
const Config = require('./config')
const context = require('./context')
const github = require('./github')

module.exports = app => {
  app.log('App was loaded')

  if (process.env.SENTRY_DSN) {
    app.log('Setting up Sentry.io logging...')
    Sentry.init({ dsn: process.env.SENTRY_DSN })
  } else {
    app.log('Skipping Sentry.io setup')
  }

  console.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Gb')

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const config = await Config.load(ctx)
    if (config && Config.isModeAuto(config)) {
      await github.createIssueBranch(app, ctx, config)
    }
    console.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Gb')
  })
  app.on('issue_comment.created', async ctx => {
    if (Config.isChatOpsCommand(ctx.payload.comment.body)) {
      app.log('ChatOps command received')
      const config = await Config.load(ctx)
      if (config && Config.isModeChatOps(config)) {
        await github.createIssueBranch(app, ctx, config)
      }
    }
    console.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Gb')
  })
  app.on('pull_request.closed', async ctx => {
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
    console.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Gb')
  })
  app.on('*', async ctx => {
    console.log('Received event: ' + ctx.event + ', action: ' + ctx.payload.action)
    console.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Gb')
  })
}
