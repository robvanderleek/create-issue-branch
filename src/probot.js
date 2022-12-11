const Sentry = require('@sentry/node')
const utils = require('./utils')
const PullRequestClosed = require('./webhooks/pull-request-closed')
const IssueAssigned = require('./webhooks/issue-assigned')
const CommentCreated = require('./webhooks/comment-created')
const MarketplacePurchase = require('./webhooks/marketplace-purchase')
const { version } = require('./version')
const { listAppSubscriptions } = require('./plans')

module.exports = (app, { getRouter }) => {
  app.log(`Create Issue Branch, revision: ${version.revision}, built on: ${version.date}`)
  if (getRouter) {
    addStatsRoute(getRouter)
    addPlansRoute(app, getRouter)
  } else if (!utils.isRunningInGitHubActions()) {
    app.log('Custom routes not available!')
  }
  configureSentry(app)
  utils.logMemoryUsage(app)
  app.on('issues.assigned', async ctx => {
    await IssueAssigned.handle(app, ctx)
  })
  app.on('issue_comment.created', async ctx => {
    const comment = ctx.payload.comment.body
    await CommentCreated.handle(app, ctx, comment)
  })
  app.on('pull_request.closed', async ctx => {
    await PullRequestClosed.handle(app, ctx)
  })
  app.on('issues.opened', async ctx => {
    const comment = ctx.payload.issue.body
    await CommentCreated.handle(app, ctx, comment)
  })
  app.on(['marketplace_purchase.purchased', 'marketplace_purchase.changed', 'marketplace_purchase.cancelled',
    'marketplace_purchase.pending_change'], async ctx => {
    await MarketplacePurchase.handle(app, ctx)
  })
}

function addStatsRoute (getRouter) {
  const router = getRouter('/probot')
  router.get('/stats', (req, res) => {
    res.redirect('https://raw.githubusercontent.com/robvanderleek/create-issue-branch/main/static/stats.json')
  })
}

async function addPlansRoute (app, getRouter) {
  const router = getRouter('/probot')
  router.get('/plans', async (req, res) => {
    const subscriptions = listAppSubscriptions(app)
    res.json(subscriptions)
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
