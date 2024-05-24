import {Context, Probot} from "probot";
import {loadConfig} from "../config";
import {getRepoName, getRepoOwnerLogin} from "../context";
import {getIssueNumberFromBranchName, updatePrBody, updatePrTitle} from "../github";
import {Config} from "../entities/Config";


export async function pullRequest(app: Probot, ctx: Context<any>) {
    const action = ctx.payload.action
    app.log.debug(`Pull-Request was ${action}`)
    const config = await loadConfig(ctx);
    if (!config) {
        return;
    }
    if (config.conventionalPrTitles) {
        const pr = ctx.payload.pull_request
        const branchName = pr.head.ref
        const issueNumber = getIssueNumberFromBranchName(branchName)
        if (issueNumber) {
            await updatePullRequestTitle(ctx, issueNumber, pr, app, config);
        }
    }
    if (config.autoLinkIssue) {
        const pr = ctx.payload.pull_request;
        const branchName = pr.head.ref;
        const issueNumber = getIssueNumberFromBranchName(branchName);
        if (issueNumber) {
            await updatePullRequestBody(ctx, issueNumber, pr, app, config);
        }
    }
}

async function updatePullRequestTitle(ctx: Context<any>, issueNumber: number, pr: any, app: Probot, config: Config) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    try {
        const {data: issue} = await ctx.octokit.issues.get({owner: owner, repo: repo, issue_number: issueNumber})
        if (issue) {
            // @ts-ignore
            const labels = issue.labels.concat(pr.labels).map(l => l.name);
            await updatePrTitle(app, ctx, config, pr, issue.title, labels);
        }
    } catch (e) {
        app.log.info(`Error updating PR title: ${e}`);
    }
}

async function updatePullRequestBody(ctx: Context<any>, issueNumber: number, pr: any, app: Probot, config: Config) {
    const body = pr.body;
    const linkText = `closes #${issueNumber}`;
    if (!body) {
        await updatePrBody(app, ctx, config, pr, linkText);
    } else if (!body.includes(`closes #${issueNumber}`)) {
        const updatedBody = body.length === 0 ? linkText : `${body}\n${linkText}`;
        await updatePrBody(app, ctx, config, pr, updatedBody);
    }
}