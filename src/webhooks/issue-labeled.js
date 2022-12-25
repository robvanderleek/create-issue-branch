const context = require('./../context')
const github = require('../github')
const Config = require('../config')

async function handle (app, ctx) {
  const action = ctx.payload.action
  app.log.debug(`Issue was ${action}`)
  const config = await Config.load(ctx)
  const label = ctx.payload.label.name
  const prTitlePrefix = Config.getPrTitlePrefix(config, label)
  if (prTitlePrefix) {
    const owner = context.getRepoOwnerLogin(ctx)
    const repo = context.getRepoName(ctx)
    const branchName = await github.getBranchNameFromIssue(ctx, config)
    const { data: pull } = await ctx.octokit.pulls.list({ owner: owner, repo: repo, head: `${owner}:${branchName}` })
    if (pull && pull.length === 1) {
      const pullNumber = pull[0].number
      const title = pull[0].title
      if (action === 'labeled' && ctx.payload.issue.labels.length === 1) {
        const updatedTitle = `${prTitlePrefix} ${title}`
        app.log.info(`Prefixing PR #${pullNumber} in ${owner}/${repo} with: ${prTitlePrefix}`)
        await ctx.octokit.pulls.update({ owner: owner, repo: repo, pull_number: pullNumber, title: updatedTitle })
      }
      if (action === 'unlabeled' && title.startsWith(prTitlePrefix)) {
        const updatedTitle = title.substring(prTitlePrefix.length)
        app.log.info(`Removing prefix ${prTitlePrefix} from PR #${pullNumber} in ${owner}/${repo}`)
        await ctx.octokit.pulls.update({ owner: owner, repo: repo, pull_number: pullNumber, title: updatedTitle })
      }
    }
  }
}

module.exports = {
  handle: handle
}
