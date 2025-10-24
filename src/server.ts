import app from "./probot.ts";
import {createNodeMiddleware, createProbot, run} from "probot";

// const middleware = await createNodeMiddleware(app, {probot: createProbot()});
run(app);
