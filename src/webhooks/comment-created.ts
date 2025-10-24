import {Context, Probot} from "probot";
import {Config} from "../entities/Config.ts";
import {
    getChatOpsCommandArgument,
    isChatOpsCommand,
    isExperimentalBranchNameArgument,
    isModeChatOps,
    loadConfig,
    shouldOpenPR
} from "../config.ts";
import {logMemoryUsage} from "../utils.ts";
import {getIssueTitle, getSender} from "../context.ts";
import {
    addComment,
    branchExists,
    createIssueBranch,
    createPr,
    getBranchName as githubGetBranchName,
    getBranchNameFromIssue,
    getSourceBranch,
    skipBranchCreationForIssue,
    skipForIssue
} from "../github.ts";

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
        app.log.info('Received ChatOps command but current mode is not `chatops`');
    }
    if (skipForIssue(ctx, config)) {
        app.log.info(`Skipping run for issue: ${getIssueTitle(ctx)}`);
        return;
    }
    let branchName
    if (skipBranchCreationForIssue(ctx, config)) {
        app.log.info(`Skipping branch creation for issue: ${getIssueTitle(ctx)}`);
        branchName = await getSourceBranch(ctx, config);
    } else {
        branchName = await getBranchName(ctx, config, comment);
        if (await branchExists(ctx, branchName)) {
            app.log.info('Could not create branch as it already exists');
            await addComment(ctx, config, 'Branch already exists');
            return
        }
        await createIssueBranch(app, ctx, branchName, config)
    }
    const shouldCreatePR = shouldOpenPR(config);
    if (shouldCreatePR) {
        const sender = getSender(ctx);
        app.log.info(`Creating pull request for user ${sender}`);
        await createPr(app, ctx, config, sender, branchName);
    }
    logMemoryUsage(app)
}