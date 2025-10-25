import {Context, Probot} from "probot";
import {isChatOpsCommand, isModeImmediate, loadConfig, shouldOpenPR} from "../config.ts";
import core from "@actions/core";
import {Config} from "../entities/Config.ts";
import {chatOpsCommandGiven} from "./comment-created.ts";
import {isRunningInGitHubActions} from "../utils.ts";
import {getIssueTitle, getSender} from "../context.ts";
import {
    branchExists,
    createIssueBranch,
    createPr,
    getBranchNameFromIssue,
    getSourceBranch,
    skipBranchCreationForIssue,
    skipForIssue
} from "../github.ts";

export async function issueOpened(app: Probot, ctx: Context<any>, comment: string | null) {
    const config = await loadConfig(ctx);
    if (config) {
        if (isModeImmediate(config)) {
            await handle(app, ctx, config);
        } else if (comment && isChatOpsCommand(comment)) {
            await chatOpsCommandGiven(app, ctx, config, comment);
        }
    }
}

async function handle(app: Probot, ctx: Context<any>, config: Config) {
    if (skipForIssue(ctx, config)) {
        app.log.info(`Skipping run for issue: ${getIssueTitle(ctx)}`)
        return
    }
    let branchName
    if (skipBranchCreationForIssue(ctx, config)) {
        app.log.info(`Skipping branch creation for issue: ${getIssueTitle(ctx)}`)
        branchName = await getSourceBranch(ctx, config)
    } else {
        branchName = await getBranchNameFromIssue(ctx, config)
        if (await branchExists(ctx, branchName)) {
            app.log.info('Could not create branch as it already exists')
            if (isRunningInGitHubActions()) {
                core.setOutput('branchName', branchName)
            }
            return
        }
        await createIssueBranch(app, ctx, branchName, config)
    }
    const shouldCreatePR = shouldOpenPR(config);
    if (shouldCreatePR) {
        const assignee = getSender(ctx);
        app.log.info(`Creating pull request for user ${assignee}`);
        await createPr(app, ctx, config, assignee, branchName);
    }
}