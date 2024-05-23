import {Context, Probot} from "probot";
import {getRepoOwnerId, getRepoOwnerLogin} from "./context";

const PRO_PLAN_INTRODUCTION_DATE = new Date('2021-04-07T00:00:00.000Z')

export async function isProPlan(app: Probot, ctx: Context<any>) {
    try {
        const id = getRepoOwnerId(ctx)
        const login = getRepoOwnerLogin(ctx)
        app.log.info(`Checking Marketplace for organization: https://github.com/${login} ...`)
        if (freeProSubscription(login)) {
            app.log.info('Found free Pro ❤️  plan')
            return true
        }
        const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({account_id: id})
        const purchase = res.data.marketplace_purchase
        if (purchase.plan && purchase.plan.price_model === 'FREE') {
            app.log.info('Found Free plan')
            return false
        } else {
            app.log.info('Found Pro 💰 plan')
            return true
        }
    } catch (error) {
        app.log.info('Marketplace purchase not found')
        return false
    }
}

function freeProSubscription(login: string) {
    const organizations = ['PWrInSpace', 'KPLRCDBS', 'codemeistre', 'RaspberryPiFoundation', 'astro-pi',
        'LOG680-01-Equipe-09', 'New-AutoMotive', 'EpitechMscPro2020', 'snaphu-msu', 'SerenKodi', 'oyunprotocol',
        'web-illinois', 'PathologyDataScience', 'miranhas-github', 'DHBW-FN', 'lecoindesdevs', 'getcodelimit']
    const match = organizations.find(o => o.toLowerCase() === login.toLowerCase())
    return match !== undefined
}

export async function isActivatedBeforeProPlanIntroduction(app: Probot, ctx: Context<any>) {
    let datestring
    try {
        const id = getRepoOwnerId(ctx)
        const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({account_id: id})
        const purchase = res.data.marketplace_purchase
        datestring = purchase.updated_at
    } catch (error) {
        const login = getRepoOwnerLogin(ctx)
        app.log.debug('Checking App installation date...')
        const github = await app.auth()
        const installation = await github.apps.getUserInstallation({username: login})
        app.log.debug(`Found installation date: ${installation.data.created_at}`)
        datestring = installation.data.created_at
    }
    if (!datestring) {
        return false;
    }
    const installationDate = new Date(datestring)
    const result = installationDate < PRO_PLAN_INTRODUCTION_DATE
    app.log.info(`Installation date is ${result ? 'before' : 'after'} Pro plan introduction date`)
    return result
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