const context = require('./../context')
const github = require('../github')
const Config = require('../config')

async function handle (app, ctx) {
  app.log.debug('Issue was labeled')
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const config = await Config.load(ctx)
  const branchName = await github.getBranchNameFromIssue(ctx, config)
  const { data: pull } = await ctx.octokit.pulls.list({ owner: owner, repo: repo, head: `${owner}:${branchName}` })
  const pullNumber = pull[0].number
  const title = pull[0].title
  await ctx.octokit.pulls.update({ owner: owner, repo: repo, pull_number: pullNumber, title: `:bug: ${title}` })
}

module.exports = {
  handle: handle
}
