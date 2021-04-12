const context = require('./context')

const PRO_PLAN_INTRODUCTION_DATE = new Date('2021-04-07T00:00:00.000Z')

async function isProPlan (app, ctx) {
  try {
    const id = context.getRepoOwnerId(ctx)
    const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({ account_id: id })
    const purchase = res.data.marketplace_purchase
    if (purchase.plan.price_model === 'FREE') {
      app.log('Marketplace purchase found: Free plan')
      return false
    } else {
      app.log('Marketplace purchase found: Pro plan')
      return true
    }
  } catch (error) {
    app.log('Marketplace purchase not found')
    return false
  }
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
    app.log(`Checking App installation date for organization: ${login}`)
    const github = await app.auth()
    const installation = await github.apps.getUserInstallation({ username: login })
    app.log(`Found installation date: ${installation.data.created_at}`)
    datestring = installation.data.created_at
  }
  const installationDate = new Date(datestring)
  const result = installationDate < PRO_PLAN_INTRODUCTION_DATE
  app.log(`Installation date is ${result ? 'before' : 'after'} Pro plan introduction date`)
  return result
}

module.exports = {
  isProPlan: isProPlan,
  isActivatedBeforeProPlanIntroduction: isActivatedBeforeProPlanIntroduction
}
