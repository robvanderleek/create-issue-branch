import {Probot} from "probot";
import {ApplicationFunctionOptions} from "probot/lib/types";
import express from "express";
import {issueAssigned} from "./webhooks/issue-assigned";
import {issueLabeled} from "./webhooks/issue-labeled";
import {issueOpened} from "./webhooks/issue-opened";
import {listAppSubscriptions} from "./plans";
import * as Sentry from "@sentry/node";
import {commentCreated} from "./webhooks/comment-created";
import {marketplacePurchase} from "./webhooks/marketplace-purchase";
import {pullRequest} from "./webhooks/pull-request";
import {pullRequestClosed} from "./webhooks/pull-request-closed";
import {gitDate, gitSha, version} from "./version";
import {isRunningInGitHubActions, logMemoryUsage} from "./utils";

export default (app: Probot, {getRouter}: ApplicationFunctionOptions) => {
    const buildDate = gitDate.toISOString().substring(0, 10);
    app.log(`Create Issue Branch, version: ${version}, revison: ${gitSha.substring(0, 8)}, built on: ${buildDate}`);
    if (getRouter) {
        addStatsRoute(getRouter)
        addPlansRoute(app, getRouter)
    } else if (!isRunningInGitHubActions()) {
        app.log('Custom routes not available!')
    }
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
    app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.labeled', 'pull_request.unlabeled'],
        async ctx => {
            await pullRequest(app, ctx)
        })
    app.on('issues.opened', async ctx => {
        const comment = ctx.payload.issue.body;
        await issueOpened(app, ctx, comment);
    })
    app.on(['issues.labeled', 'issues.unlabeled'], async ctx => {
        await issueLabeled(app, ctx);
    })
    app.on(['marketplace_purchase.purchased', 'marketplace_purchase.changed', 'marketplace_purchase.cancelled',
        'marketplace_purchase.pending_change'], async ctx => {
        await marketplacePurchase(app, ctx);
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
        Sentry.init({dsn: process.env.SENTRY_DSN, attachStacktrace: true});
    } else {
        app.log('Skipping Sentry.io setup')
    }
}
