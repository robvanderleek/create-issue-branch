const Sentry = require('@sentry/node')
const utils = require('./utils')
const stats = require('../static/stats.json')
const PullRequestClosed = require('./webhooks/pull-request-closed')
const IssueAssigned = require('./webhooks/issue-assigned')
const CommentCreated = require('./webhooks/comment-created')
const MarketplacePurchase = require('./webhooks/marketplace-purchase')

module.exports = ({ app, getRouter }) => {
  app.log('App was loaded')
  addStatsRoute(getRouter)
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
  app.on(['marketplace_purchase.purchased', 'marketplace_purchase.changed', 'marketplace_purchase.cancelled'],
    async ctx => {
      await MarketplacePurchase.handle(app, ctx)
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
