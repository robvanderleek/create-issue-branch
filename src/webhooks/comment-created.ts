import {Context, Probot} from "probot";
import {Config} from "../entities/Config";
import context from "./../context";
import github from "./../github";
import utils from "./../utils";
import {
    getChatOpsCommandArgument,
    isChatOpsCommand,
    isExperimentalBranchNameArgument,
    isModeChatOps,
    loadConfig, shouldOpenPR
} from "../config";

export async function commentCreated(app: Probot, ctx: Context<any>, comment: string) {
    if (isChatOpsCommand(comment)) {
        const config = await loadConfig(ctx);
        if (config) {
            await chatOpsCommandGiven(app, ctx, config, comment);
        }
    }
}

async function getBranchName(ctx: Context<any>, config: Config, comment: string) {
    if (isExperimentalBranchNameArgument(config)) {
        const commandArgument = getChatOpsCommandArgument(comment);
        if (commandArgument) {
            return await github.getBranchName(ctx, config, commandArgument);
        } else {
            return await github.getBranchNameFromIssue(ctx, config);
        }
    } else {
        return await github.getBranchNameFromIssue(ctx, config);
    }
}

export async function chatOpsCommandGiven(app: Probot, ctx: Context<any>, config: Config, comment: string) {
    app.log.debug('ChatOps command received');
    if (!isModeChatOps(config)) {
        app.log('Received ChatOps command but current mode is not `chatops`');
    }
    if (github.skipForIssue(ctx, config)) {
        app.log(`Skipping run for issue: ${context.getIssueTitle(ctx)}`);
        return;
    }
    let branchName
    if (github.skipBranchCreationForIssue(ctx, config)) {
        app.log(`Skipping branch creation for issue: ${context.getIssueTitle(ctx)}`);
        branchName = await github.getSourceBranch(ctx, config);
    } else {
        branchName = await getBranchName(ctx, config, comment);
        if (await github.branchExists(ctx, branchName)) {
            app.log('Could not create branch as it already exists');
            await github.addComment(ctx, config, 'Branch already exists');
            return
        }
        await github.createIssueBranch(app, ctx, branchName, config)
    }
    const shouldCreatePR = shouldOpenPR(config);
    if (shouldCreatePR) {
        const sender = context.getSender(ctx);
        app.log(`Creating pull request for user ${sender}`);
        await github.createPr(app, ctx, config, sender, branchName);
    }
    utils.logMemoryUsage(app)
}