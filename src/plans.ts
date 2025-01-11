import {Context, Probot} from "probot";
import {getRepoOwnerId, getRepoOwnerLogin} from "./context";
import {showFreePlanWarning} from "./config";
import {addComment} from "./github";
import {Config} from "./entities/Config";
import {isRunningInGitHubActions, isRunningInTestEnvironment} from "./utils";

export async function hasValidSubscription(app: Probot, ctx: Context<any>, config: Config) {
    if (isRunningInGitHubActions() || isRunningInTestEnvironment()) {
        return true;
    }
    if (isFreePaidSubscription(app, ctx)) {
        return true;
    }
    if (await isPaidPlan(app, ctx)) {
        return true;
    }
    await displayFreePlanWarning(ctx, config);
    return false;
}

export async function isPaidPlan(app: Probot, ctx: Context<any>) {
    try {
        const login = getRepoOwnerLogin(ctx);
        app.log.info(`Checking Marketplace for organization: https://github.com/${login} ...`);
        const id = getRepoOwnerId(ctx);
        const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({account_id: id});
        const purchase = res.data.marketplace_purchase;
        if (purchase.plan && purchase.plan.price_model === 'FREE') {
            app.log.info('Found Free plan');
            return false;
        } else {
            app.log.info('Found paid 💰 plan');
            return true;
        }
    } catch (error) {
        app.log.info('Marketplace purchase not found');
        return false;
    }
}

export async function displayFreePlanWarning(ctx: Context<any>, config: Config) {
    if (showFreePlanWarning(config)) {
        let freePlanWarning = '';
        freePlanWarning += 'Hi there :wave:\n\n';
        freePlanWarning += 'You are using the free plan of the Create Issue Branch App.\n';
        freePlanWarning += 'Due to its popularity, offering the App for free is becoming too costly for me.\n';
        freePlanWarning += 'The free plan is therefore going to be deprecated on March 1st, 2025.\n\n';
        freePlanWarning += 'If you want to continue using this App, please upgrade to the Developer plan.\n';
        freePlanWarning += 'The Developer plan costs only $1 per month (or $10 yearly).\nYou can upgrade on the ';
        freePlanWarning += '[GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n';
        freePlanWarning += 'If you have any questions reach out to me by ';
        freePlanWarning += '[opening an issue](https://github.com/robvanderleek/create-issue-branch/issues).\n';
        freePlanWarning += 'To disable this message, insert `freePlanWarning: false` in your configuration YAML.\n';
        config.silent = false;
        await addComment(ctx, config, freePlanWarning);
    }
}

export function isFreePaidSubscription(app: Probot, ctx: Context<any>): boolean {
    const login = getRepoOwnerLogin(ctx)
    const logins = ['PWrInSpace', 'KPLRCDBS', 'codemeistre', 'RaspberryPiFoundation', 'astro-pi',
        'LOG680-01-Equipe-09', 'New-AutoMotive', 'EpitechMscPro2020', 'snaphu-msu', 'SerenKodi', 'oyunprotocol',
        'web-illinois', 'PathologyDataScience', 'miranhas-github', 'DHBW-FN', 'lecoindesdevs', 'getcodelimit'];
    const match = logins.find(o => o.toLowerCase() === login.toLowerCase());
    if (match !== undefined) {
        app.log.info('Found free ❤️ paid plan');
        return true;
    } else {
        return false;
    }
}

export async function listAppSubscriptions(app: any) {
    let result = ''
    const plans = (await app.state.octokit.apps.listPlans()).data
    for (const plan of plans) {
        if (plan.price_model === 'FLAT_RATE') {
            const accounts = await app.state.octokit.paginate(app.state.octokit.apps.listAccountsForPlan,
                {per_page: 100, plan_id: plan.id}, (response: any) => response.data)
            result += `Subscriptions for plan: ${plan.name}\n`
            result += '--------------------------------------------------\n'
            result += listFreeTrialAccounts(app, accounts)
            result += '--------------------------------------------------\n'
            result += `Total: ${accounts.length}\n`
        }
    }
    return result
}

function listFreeTrialAccounts(app: Probot, accounts: Array<any>) {
    let result = ''
    for (const account of accounts) {
        const purchase = account.marketplace_purchase
        const pendingChange = account.marketplace_pending_change
        if (pendingChange || purchase.on_free_trial) {
            result +=
                `Org: ${account.login}, free trial: ${purchase.on_free_trial}, billing_cycle: ${purchase.billing_cycle}, ` +
                `pending change to plan: ${pendingChange.plan.name} on: ${pendingChange.effective_date}\n`
        } else {
            result += `Org: ${account.login}, billing_cycle: ${purchase.billing_cycle}\n`
        }
    }
    return result
}