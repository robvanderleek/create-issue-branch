const context = require('./context')

async function isProPlan (app, ctx) {
  try {
    const id = context.getRepoOwnerId(ctx)
    const plan = await ctx.octokit.apps.getSubscriptionPlanForAccount({ account_id: id })
    console.log(plan)
  } catch (error) {
    console.log('Could not get plan')
    const login = context.getRepoOwnerLogin(ctx)
    const github = await app.auth()
    // const token = await github.apps.createInstallationToken({ installation_id: ctx.payload.installation.id })
    // const authenticatedAsApp = await app.auth()
    const installation = await github.apps.getUserInstallation({ username: login })
    console.log(installation)
  }
}

module.exports = {
  isProPlan: isProPlan
}
