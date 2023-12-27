const Config = require('../config')
const context = require('./../context')
const github = require('./../github')
const utils = require('./../utils')
const core = require('@actions/core')

const {chatOpsCommandGiven} = require('./comment-created')

async function handle(app, ctx, comment) {
    const config = await Config.loadConfig(ctx);
    if (config) {
        if (Config.isModeImmediate(config)) {
            await issueOpened(app, ctx, config);
        } else if (Config.isChatOpsCommand(comment)) {
            await chatOpsCommandGiven(app, ctx, config, comment);
        }
    }
}

async function issueOpened(app, ctx, config) {
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
    const shouldCreatePR = Config.shouldOpenPR(config)
    if (shouldCreatePR) {
        const assignee = context.getSender(ctx)
        app.log(`Creating pull request for user ${assignee}`)
        await github.createPr(app, ctx, config, assignee, branchName)
    }
}

module.exports = {
    handle: handle
}
