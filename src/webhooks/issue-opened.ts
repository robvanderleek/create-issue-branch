import {Context, Probot} from "probot";
import {isChatOpsCommand, isModeImmediate, loadConfig, shouldOpenPR} from "../config";
import context from "./../context";
import core from "@actions/core";
import {Config} from "../entities/Config";
import {chatOpsCommandGiven} from "./comment-created";
import github from "./../github";
import utils from "./../utils";

export async function handle(app: Probot, ctx: Context<any>, comment: string) {
    const config = await loadConfig(ctx);
    if (config) {
        if (isModeImmediate(config)) {
            await issueOpened(app, ctx, config);
        } else if (isChatOpsCommand(comment)) {
            await chatOpsCommandGiven(app, ctx, config, comment);
        }
    }
}

async function issueOpened(app: Probot, ctx: Context<any>, config: Config) {
    if (github.skipForIssue(ctx, config)) {
        app.log(`Skipping run for issue: ${context.getIssueTitle(ctx)}`)
        return
    }
    let branchName
    if (github.skipBranchCreationForIssue(ctx, config)) {
        app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`)
        branchName = await github.getSourceBranch(ctx, config)
    } else {
        branchName = await github.getBranchNameFromIssue(ctx, config)
        if (await github.branchExists(ctx, branchName)) {
            app.log('Could not create branch as it already exists')
            if (utils.isRunningInGitHubActions()) {
                core.setOutput('branchName', branchName)
            }
            return
        }
        await github.createIssueBranch(app, ctx, branchName, config)
    }
    const shouldCreatePR = shouldOpenPR(config);
    if (shouldCreatePR) {
        const assignee = context.getSender(ctx);
        app.log(`Creating pull request for user ${assignee}`);
        await github.createPr(app, ctx, config, assignee, branchName);
    }
}