import {Context, Probot} from "probot";
import context from "../context";
import github from "../github";
import {loadConfig} from "../config";

export async function issueLabeled(app: Probot, ctx: Context<any>) {
    const action = ctx.payload.action;
    app.log.debug(`Issue was ${action}`);
    const config = await loadConfig(ctx);
    if (config && config.conventionalPrTitles) {
        const owner = context.getRepoOwnerLogin(ctx);
        const repo = context.getRepoName(ctx);
        const issueTitle = context.getIssueTitle(ctx);
        const branchName = await github.getBranchNameFromIssue(ctx, config);
        const {data: pull} = await ctx.octokit.pulls.list({owner: owner, repo: repo, head: `${owner}:${branchName}`});
        if (pull && pull.length === 1) {
            const labels = ctx.payload.issue.labels.concat(pull[0].labels).map((l: { name: string }) => l.name);
            await github.updatePrTitle(app, ctx, config, pull[0], issueTitle, labels);
        }
    }
}