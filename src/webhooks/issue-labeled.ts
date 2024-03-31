import {Context, Probot} from "probot";
import {loadConfig} from "../config";
import {getIssueTitle, getRepoName, getRepoOwnerLogin} from "../context";
import {getBranchNameFromIssue, updatePrTitle} from "../github";

export async function issueLabeled(app: Probot, ctx: Context<any>) {
    const action = ctx.payload.action;
    app.log.debug(`Issue was ${action}`);
    const config = await loadConfig(ctx);
    if (config && config.conventionalPrTitles) {
        const owner = getRepoOwnerLogin(ctx);
        const repo = getRepoName(ctx);
        const issueTitle = getIssueTitle(ctx);
        const branchName = await getBranchNameFromIssue(ctx, config);
        const {data: pull} = await ctx.octokit.pulls.list({owner: owner, repo: repo, head: `${owner}:${branchName}`});
        if (pull && pull.length === 1) {
            const labels = ctx.payload.issue.labels.concat(pull[0].labels).map((l: { name: string }) => l.name);
            await updatePrTitle(app, ctx, config, pull[0], issueTitle, labels);
        }
    }
}