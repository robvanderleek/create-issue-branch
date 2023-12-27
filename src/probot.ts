import {Probot} from "probot";
import {ApplicationFunctionOptions} from "probot/lib/types";
import express from "express";

const Sentry = require('@sentry/node')
const utils = require('./utils')
const PullRequest = require('./webhooks/pull-request')
const PullRequestClosed = require('./webhooks/pull-request-closed')
const IssueAssigned = require('./webhooks/issue-assigned')
const IssueOpened = require('./webhooks/issue-opened')
const CommentCreated = require('./webhooks/comment-created')
const MarketplacePurchase = require('./webhooks/marketplace-purchase')
const {version} = require('./version')
const {listAppSubscriptions} = require('./plans')
const IssueLabeled = require('./webhooks/issue-labeled')

module.exports = (app: Probot, {getRouter}: ApplicationFunctionOptions) => {
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
    app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.labeled', 'pull_request.unlabeled'],
        async ctx => {
            await PullRequest.handle(app, ctx)
        })
    app.on('issues.opened', async ctx => {
        const comment = ctx.payload.issue.body
        await IssueOpened.handle(app, ctx, comment)
    })
    app.on(['issues.labeled', 'issues.unlabeled'], async ctx => {
        await IssueLabeled.handle(app, ctx)
    })
    app.on(['marketplace_purchase.purchased', 'marketplace_purchase.changed', 'marketplace_purchase.cancelled',
        'marketplace_purchase.pending_change'], async ctx => {
        await MarketplacePurchase.handle(app, ctx)
    })
    app.onAny(async (ctx: any) => {
        app.log(`Received webhook event: ${ctx.name}.${ctx.payload.action}`)
    })
}

function addStatsRoute(getRouter: (path?: string) => express.Router) {
    const router = getRouter('/probot')
    router.get('/stats', (req, res) => {
        res.redirect('https://raw.githubusercontent.com/robvanderleek/create-issue-branch/main/static/stats.json')
    })
}

async function addPlansRoute(app: Probot, getRouter: (path?: string) => express.Router) {
    const router = getRouter('/probot')
    router.get('/plans', async (_, res) => {
        const subscriptions = listAppSubscriptions(app)
        res.json(subscriptions)
    })
}

function configureSentry(app: Probot) {
    if (process.env.SENTRY_DSN) {
        app.log('Setting up Sentry.io logging...')
        Sentry.init({dsn: process.env.SENTRY_DSN, attachStacktrace: true})
    } else {
        app.log('Skipping Sentry.io setup')
    }
}
