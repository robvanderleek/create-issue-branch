const context = require('./../context')
const github = require('../github')
const Config = require('../config')

async function handle (app, ctx) {
  const action = ctx.payload.action
  app.log.debug(`Issue was ${action}`)
  const config = await Config.load(ctx)
  if (Config.conventionalPrTitles(config)) {
    const owner = context.getRepoOwnerLogin(ctx)
    const repo = context.getRepoName(ctx)
    const branchName = await github.getBranchNameFromIssue(ctx, config)
    const { data: pull } = await ctx.octokit.pulls.list({ owner: owner, repo: repo, head: `${owner}:${branchName}` })
    if (pull && pull.length === 1) {
      const labels = ctx.payload.issue.labels.concat(pull[0].labels).map(l => l.name)
      await github.updatePrTitle(app, ctx, config, pull[0], labels)
    }
  }
}

module.exports = {
  handle: handle
}
