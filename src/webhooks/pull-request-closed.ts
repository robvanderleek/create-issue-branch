import {Context, Probot} from "probot";
import {loadConfig} from "../config.ts";
import {getRepoName, getRepoOwnerLogin} from "../context.ts";
import {getIssueNumberFromBranchName} from "../github.ts";

export async function pullRequestClosed(_: Probot, ctx: Context<any>) {
    if (ctx.payload.pull_request.merged === true) {
        const config = await loadConfig(ctx);
        if (config && config.autoCloseIssue) {
            const branchName = ctx.payload.pull_request.head.ref
            const issueNumber = getIssueNumberFromBranchName(branchName);
            if (issueNumber) {
                const owner = getRepoOwnerLogin(ctx);
                const repo = getRepoName(ctx);
                await closeIssue(ctx, owner, repo, issueNumber);
            }
        }
    }
}

async function closeIssue(ctx: Context<any>, owner: string, repo: string, issueNumber: number) {
    try {
        const issueForBranch = await ctx.octokit.issues.get({
            owner: owner,
            repo: repo,
            issue_number: issueNumber
        });
        if (issueForBranch) {
            await ctx.octokit.issues.update({
                owner: owner,
                repo: repo,
                issue_number: issueNumber,
                state: 'closed'
            } as any);
        }
    } catch (e) {
        return;
    }
}