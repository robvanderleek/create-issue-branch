const context = require('./context')

const PRO_PLAN_INTRODUCTION_DATE = new Date('2021-04-07T00:00:00.000Z')

async function isProPlan (app, ctx) {
  try {
    const id = context.getRepoOwnerId(ctx)
    const res = await ctx.octokit.apps.getSubscriptionPlanForAccount({ account_id: id })
    if (res.data.marketplace_purchase.plan.price_model === 'FREE') {
      app.log('Marketplace purchase found: Free plan')
      return false
    } else {
      app.log('Marketplace purchase found: Pro plan')
      return true
    }
  } catch (error) {
    app.log('Marketplace purchase not found, checking App installation date...')
    const login = context.getRepoOwnerLogin(ctx)
    const github = await app.auth()
    const installation = await github.apps.getUserInstallation({ username: login })
    const installationDate = new Date(installation.data.created_at)
    return installationDate < PRO_PLAN_INTRODUCTION_DATE
  }
}

module.exports = {
  isProPlan: isProPlan
}
