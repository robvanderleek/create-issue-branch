import {Context, Probot} from "probot";
import {getRepoOwnerId, getRepoOwnerLogin, isOrgRepo} from "./context";
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
    if (isOrgRepo(ctx)) {
        const hasPaidPlan = await isCommercialOrganizationPlan(app, ctx)
        if (hasPaidPlan) {
            return true;
        } else {
            await buyCommercialOrganizationPlanComment(ctx, config);
            app.log.info('Added comment to buy Commercial organization 🙏 plan');
            return false;
        }
    }
    if (await isPaidPlan(app, ctx)) {
        return true;
    } else {
        await buyDeveloperPlanComment(ctx, config);
        app.log.info('Added comment to buy Developer 🙏 plan');
        return false;
    }
}

export async function isCommercialOrganizationPlan(app: Probot, ctx: Context<any>) {
    try {
        const login = getRepoOwnerLogin(ctx);
        app.log.info(`Checking Marketplace for organization: https://github.com/${login} ...`);
        const id = getRepoOwnerId(ctx);
        const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({account_id: id});
        const purchase = res.data.marketplace_purchase;
        if (purchase.plan && purchase.plan.name === 'Commercial organization') {
            app.log.info('Found Commercial organization 💰 plan');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        app.log.info('Marketplace purchase not found');
        return false;
    }
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

async function buyCommercialOrganizationPlanComment(ctx: Context<any>, config: Config) {
    let buyComment = '';
    buyComment += 'Hi there :wave:\n\n';
    buyComment += 'Using this App for an organization repository requires a paid ';
    buyComment += 'subscription that you can buy on the ';
    buyComment += '[GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n';
    buyComment += 'If you are a non-profit organization or otherwise can not pay for such a plan, contact me by ';
    buyComment += '[creating an issue](https://github.com/robvanderleek/create-issue-branch/issues)';
    config.silent = false;
    await addComment(ctx, config, buyComment)
}

async function buyDeveloperPlanComment(ctx: Context<any>, config: Config) {
    let buyComment = '';
    buyComment += 'Hi there :wave:\n\n';
    buyComment += 'You are using the free plan of the Create Issue Branch App.\n';
    buyComment += 'Due to its popularity, offering the App for free is becoming too costly for me.\n';
    buyComment += 'The free plan was therefore deprecated on March 1st, 2025.\n\n';
    buyComment += 'If you want to continue using this App, please upgrade to the Developer plan.\n';
    buyComment += 'The Developer plan costs only $1 per month (or $10 yearly).\nYou can upgrade on the ';
    buyComment += '[GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n';
    buyComment += 'If you have any questions reach out to me by ';
    buyComment += '[opening an issue](https://github.com/robvanderleek/create-issue-branch/issues).\n';
    config.silent = false;
    await addComment(ctx, config, buyComment);
}

export function isFreePaidSubscription(app: Probot, ctx: Context<any>): boolean {
    const login = getRepoOwnerLogin(ctx)
    const logins = ['PWrInSpace', 'KPLRCDBS', 'codemeistre', 'RaspberryPiFoundation', 'astro-pi',
        'LOG680-01-Equipe-09', 'New-AutoMotive', 'EpitechMscPro2020', 'snaphu-msu', 'SerenKodi', 'oyunprotocol',
        'web-illinois', 'PathologyDataScience', 'miranhas-github', 'DHBW-FN', 'lecoindesdevs', 'getcodelimit',
        'facio-ergo-sum', 'robvanderleek', 'ExtendedXmlSerializer',
        'CantoneseLanguageDictionary', 'Il-Libro-Open-Source'];
    const matching_login = logins.find(o => o.toLowerCase() === login.toLowerCase());
    if (matching_login !== undefined) {
        app.log.info(`Found free ❤️ paid plan for login: ${matching_login}`);
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
