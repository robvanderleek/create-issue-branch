const context = require('./context')

const PRO_PLAN_INTRODUCTION_DATE = new Date('2021-04-07T00:00:00.000Z')

async function isProPlan (app, ctx) {
  try {
    const id = context.getRepoOwnerId(ctx)
    const login = context.getRepoOwnerLogin(ctx)
    app.log(`Checking Marketplace for organization: https://github.com/${login} ...`)
    if (freeProSubscription(login)) {
      app.log('Found free Pro ❤️  plan')
      return true
    }
    const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({ account_id: id })
    const purchase = res.data.marketplace_purchase
    if (purchase.plan.price_model === 'FREE') {
      app.log('Found Free plan')
      return false
    } else {
      app.log('Found Pro 💰 plan')
      return true
    }
  } catch (error) {
    app.log('Marketplace purchase not found')
    return false
  }
}

function freeProSubscription (login) {
  const organizations = ['PWrInSpace', 'KPLRCDBS', 'codemeistre', 'RaspberryPiFoundation', 'astro-pi',
    'LOG680-01-Equipe-09', 'New-AutoMotive', 'EpitechMscPro2020', 'snaphu-msu', 'SerenKodi', 'oyunprotocol',
    'web-illinois', 'PathologyDataScience', 'miranhas-github', 'DHBW-FN', 'lecoindesdevs', 'getcodelimit']
  const match = organizations.find(o => o.toLowerCase() === String(login).toLowerCase())
  return match !== undefined
}

async function isActivatedBeforeProPlanIntroduction (app, ctx) {
  let datestring
  try {
    const id = context.getRepoOwnerId(ctx)
    const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({ account_id: id })
    const purchase = res.data.marketplace_purchase
    datestring = purchase.updated_at
  } catch (error) {
    const login = context.getRepoOwnerLogin(ctx)
    app.log.debug('Checking App installation date...')
    const github = await app.auth()
    const installation = await github.apps.getUserInstallation({ username: login })
    app.log.debug(`Found installation date: ${installation.data.created_at}`)
    datestring = installation.data.created_at
  }
  const installationDate = new Date(datestring)
  const result = installationDate < PRO_PLAN_INTRODUCTION_DATE
  app.log(`Installation date is ${result ? 'before' : 'after'} Pro plan introduction date`)
  return result
}

async function listAppSubscriptions (app) {
  const result = {}
  const plans = (await app.state.octokit.apps.listPlans()).data
  for (const plan of plans) {
    if (plan.price_model === 'FLAT_RATE') {
      const accounts = await app.state.octokit.paginate(app.state.octokit.apps.listAccountsForPlan,
        { per_page: 100, plan_id: plan.id }, (response) => response.data)
      app.log(`Subscriptions for plan: ${plan.name}`)
      displayAccounts(app, accounts)
      result[plan.name] = accounts.length
    }
  }
  return result
}

function displayAccounts (app, accounts) {
  for (const account of accounts) {
    const purchase = account.marketplace_purchase
    const pendingChange = account.marketplace_pending_change
    if (pendingChange || purchase.on_free_trial) {
      app.log(
        `Org: ${account.login}, free trial: ${purchase.on_free_trial}, billing_cycle: ${purchase.billing_cycle}, ` +
        `pending change to plan: ${pendingChange.plan.name} on: ${pendingChange.effective_date}`)
    } else {
      app.log(`Org: ${account.login}, billing_cycle: ${purchase.billing_cycle}`)
    }
  }
}

module.exports = {
  isProPlan: isProPlan,
  isActivatedBeforeProPlanIntroduction: isActivatedBeforeProPlanIntroduction,
  listAppSubscriptions: listAppSubscriptions
}
