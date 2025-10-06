import app from "./probot.ts";

const {run} = require('@probot/adapter-github-actions');

run(app).catch((error: any) => {
    console.error(error)
    process.exit(1)
});
