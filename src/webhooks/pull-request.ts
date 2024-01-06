import github from "../github";
import {Context, Probot} from "probot";
import {loadConfig} from "../config";
import {getRepoName, getRepoOwnerLogin} from "../context";

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
        const issueNumber = github.getIssueNumberFromBranchName(branchName)
        if (issueNumber) {
            const owner = getRepoOwnerLogin(ctx)
            const repo = getRepoName(ctx)
            const {data: issue} = await ctx.octokit.issues.get({owner: owner, repo: repo, issue_number: issueNumber})
            if (issue) {
                // @ts-ignore
                const labels = issue.labels.concat(pr.labels).map(l => l.name);
                await github.updatePrTitle(app, ctx, config, pr, issue.title, labels);
            }
        }
    }
    if (config.autoLinkIssue) {
        const pr = ctx.payload.pull_request;
        const branchName = pr.head.ref;
        const issueNumber = github.getIssueNumberFromBranchName(branchName);
        if (issueNumber) {
            const body = pr.body;
            const linkText = `closes #${issueNumber}`;
            if (!body) {
                await github.updatePrBody(app, ctx, config, pr, linkText);
            } else if (!body.includes(`closes #${issueNumber}`)) {
                const updatedBody = body.length === 0 ? linkText : `${body}\n${linkText}`;
                await github.updatePrBody(app, ctx, config, pr, updatedBody);
            }
        }
    }
}