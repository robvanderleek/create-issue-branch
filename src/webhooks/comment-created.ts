import {Context, Probot} from "probot";
import {Config} from "../entities/Config";
import {
    getChatOpsCommandArgument,
    isChatOpsCommand,
    isExperimentalBranchNameArgument,
    isModeChatOps,
    loadConfig,
    shouldOpenPR
} from "../config";
import {logMemoryUsage} from "../utils";
import {getIssueTitle, getSender} from "../context";
import {
    addComment,
    branchExists,
    createIssueBranch,
    createPr, getBranchNameFromIssue,
    getSourceBranch,
    skipBranchCreationForIssue,
    skipForIssue,
    getBranchName as githubGetBranchName
} from "../github";

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
            return await githubGetBranchName(ctx, config, commandArgument);
        } else {
            return await getBranchNameFromIssue(ctx, config);
        }
    } else {
        return await getBranchNameFromIssue(ctx, config);
    }
}

export async function chatOpsCommandGiven(app: Probot, ctx: Context<any>, config: Config, comment: string) {
    app.log.debug('ChatOps command received');
    if (!isModeChatOps(config)) {
        app.log('Received ChatOps command but current mode is not `chatops`');
    }
    if (skipForIssue(ctx, config)) {
        app.log(`Skipping run for issue: ${getIssueTitle(ctx)}`);
        return;
    }
    let branchName
    if (skipBranchCreationForIssue(ctx, config)) {
        app.log(`Skipping branch creation for issue: ${getIssueTitle(ctx)}`);
        branchName = await getSourceBranch(ctx, config);
    } else {
        branchName = await getBranchName(ctx, config, comment);
        if (await branchExists(ctx, branchName)) {
            app.log('Could not create branch as it already exists');
            await addComment(ctx, config, 'Branch already exists');
            return
        }
        await createIssueBranch(app, ctx, branchName, config)
    }
    const shouldCreatePR = shouldOpenPR(config);
    if (shouldCreatePR) {
        const sender = getSender(ctx);
        app.log(`Creating pull request for user ${sender}`);
        await createPr(app, ctx, config, sender, branchName);
    }
    logMemoryUsage(app)
}