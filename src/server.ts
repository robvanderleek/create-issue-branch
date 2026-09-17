import Express from "express";
import {createNodeMiddleware, createProbot} from "probot";
import app from "./probot.ts";
import * as path from "node:path";
import pino from "pino";
import {existsSync} from "node:fs";
import {listAppSubscriptions} from "./plans.ts";
import {message} from "./discord.ts";

const express = Express();

if (existsSync('.env')) {
    process.loadEnvFile();
}

const transport = pino.transport({
    level: process.env.LOG_LEVEL || 'debug',
    target: 'pino-pretty',
    options: {
        colorize: false,
        sync: true
    }
});

const probot = createProbot({
    env: {
        APP_ID: process.env.APP_ID,
        PRIVATE_KEY: process.env.PRIVATE_KEY,
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    },
    defaults: {
        log: pino(transport)
    }
});

async function configureWebhook() {
    const middleware = await createNodeMiddleware(app, {
        webhooksPath: "/api/github/webhooks",
        probot
    });
    express.use(middleware);
}

function configurePlans() {
    express.get("/plans", async (_, res) => {
        const octokit = await probot.auth();
        const subscriptions = await listAppSubscriptions(octokit);
        await message(subscriptions)
        res.status(200).json({result: 'OK'})
    });
}

await configureWebhook();

express.use(Express.json());
express.use(Express.static(path.join(import.meta.dirname, '..', 'public')));
configurePlans();

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const host = process.env.HOST || '0.0.0.0';
express.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port}`);
});