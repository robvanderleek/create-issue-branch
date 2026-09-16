import Express from "express";
import {createNodeMiddleware, createProbot} from "probot";
import app from "./probot.ts";
import * as path from "node:path";
import pino from "pino";

const express = Express();

process.loadEnvFile();

async function configureWebhook() {
    const transport = pino.transport({
        level: process.env.LOG_LEVEL || 'debug',
        target: 'pino-pretty',
        options: {
            colorize: false,
            sync: true
        }
    });

    const middleware = await createNodeMiddleware(app, {
        webhooksPath: "/api/github/webhooks",
        probot: createProbot({
            env: {
                APP_ID: process.env.APP_ID,
                PRIVATE_KEY: process.env.PRIVATE_KEY,
                WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
            },
            defaults: {
                log: pino(transport)
            }
        }),
    });

    express.use(middleware);
}

await configureWebhook();
express.use(Express.json());
express.use(Express.static(path.join(import.meta.dirname, '..', 'public')));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const host = process.env.HOST || '0.0.0.0';
express.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port}`);
});