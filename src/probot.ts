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
import {MongoDbService} from "./services/MongoDbService";
import {WebhookEvent} from "./entities/WebhookEvent";
import {issueClosed} from "./webhooks/issue-closed";


export default (app: Probot, {getRouter}: ApplicationFunctionOptions) => {
    const buildDate = gitDate.toISOString().substring(0, 10);
    app.log.info(`Create Issue Branch, version: ${version}, revison: ${gitSha.substring(0, 8)}, built on: ${buildDate}`);
    if (getRouter) {
        addPlansRoute(app, getRouter);
    } else if (!isRunningInGitHubActions()) {
        app.log.info('Custom routes not available!')
    }
    configureSentry(app);
    logMemoryUsage(app);
    setupEventHandlers(app);
}

function setupEventHandlers(app: Probot) {
    app.on('issues.assigned', async ctx => {
        await issueAssigned(app, ctx);
    });
    app.on('issues.closed', async ctx => {
        await issueClosed(app, ctx);
    });
    app.on('issue_comment.created', async ctx => {
        const comment = ctx.payload.comment.body;
        await commentCreated(app, ctx, comment);
    });
    app.on('pull_request.closed', async ctx => {
        try {
            await pullRequestClosed(app, ctx);
        } catch (e) {
            if (e instanceof Error) {
                if (e.message.startsWith('Although you appear to have the correct')) {
                    app.log.info(`Error can not be prevented: ${e.message}`);
                    return;
                }
            }
            throw e;
        }
    });
    app.on(['pull_request.opened', 'pull_request.reopened', 'pull_request.labeled', 'pull_request.unlabeled'],
        async ctx => {
            try {
                await pullRequest(app, ctx);
            } catch (e) {
                if (e instanceof Error) {
                    if (e.message.startsWith('Although you appear to have the correct')) {
                        app.log.info(`Error can not be prevented: ${e.message}`);
                        return;
                    }
                }
                throw e;
            }
        })
    app.on('issues.opened', async ctx => {
        const comment = ctx.payload.issue.body;
        await issueOpened(app, ctx, comment);
    });
    app.on(['issues.labeled', 'issues.unlabeled'], async ctx => {
        await issueLabeled(app, ctx);
    });
    app.on(['marketplace_purchase.purchased', 'marketplace_purchase.changed', 'marketplace_purchase.cancelled',
        'marketplace_purchase.pending_change'], async ctx => {
        await marketplacePurchase(app, ctx);
    });
    app.onAny(async (ctx: any) => {
        app.log.info(`Received webhook event: ${ctx.name}.${ctx.payload.action}`)
        await insertEventIntoDatabase(app, ctx);
    });
}

async function insertEventIntoDatabase(app: Probot, ctx: any) {
    const repository = ctx.payload.repository;
    if (!repository) {
        return;
    }
    const webhookEvent: WebhookEvent = {
        timestamp: new Date(),
        name: ctx.name,
        action: ctx.payload.action,
        owner: repository.owner.login,
        repo: repository.name
    }
    const connectionString = process.env.CREATE_ISSUE_BRANCH_MONGODB;
    if (!connectionString) {
        app.log.info('Environment variable CREATE_ISSUE_BRANCH_MONGODB not set, skipping database insert');
    } else {
        const dbService = new MongoDbService(connectionString);
        app.log.info(`Inserting event into database: ${JSON.stringify(webhookEvent)}`);
        await dbService.storeEvent(webhookEvent);
        dbService.disconnect();
    }
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
        app.log.info('Setting up Sentry.io logging...')
        Sentry.init({dsn: process.env.SENTRY_DSN, attachStacktrace: true});
    } else {
        app.log.info('Skipping Sentry.io setup')
    }
}
