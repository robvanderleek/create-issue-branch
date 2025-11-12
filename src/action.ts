import app from "./probot.ts";

import {run} from '@probot/adapter-github-actions';

// @ts-ignore
run(app).catch((error: any) => {
    console.error(error)
    process.exit(1)
});
