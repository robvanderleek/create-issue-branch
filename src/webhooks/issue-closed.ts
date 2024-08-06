import {Context, Probot} from "probot";
import {loadConfig} from "../config";
import {logMemoryUsage} from "../utils";
import {Config} from "../entities/Config";
import {branchExists, deleteBranch, getBranchNameFromIssue} from "../github";

export async function issueClosed(app: Probot, ctx: Context<any>) {
    const config = await loadConfig(ctx);
    if (config) {
        if (!config.autoDeleteBranch) {
            return;
        }
        await handle(app, ctx, config);
        logMemoryUsage(app);
    }
}

async function handle(app: Probot, ctx: Context<any>, config: Config) {
    const branchName = await getBranchNameFromIssue(ctx, config)
    if (await branchExists(ctx, branchName)) {
        const result = await deleteBranch(ctx, branchName);
        if (result) {
            app.log.info(`Deleted branch ${branchName}`);
        } else {
            app.log.error(`Failed to delete branch ${branchName}`);
        }
    }
}
