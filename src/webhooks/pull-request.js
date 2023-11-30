const github = require('../github')
const context = require('../context')
const Config = require('../config')

async function handle (app, ctx) {
  const action = ctx.payload.action
  app.log.debug(`Pull-Request was ${action}`)
  const config = await Config.load(ctx)
  if (Config.conventionalPrTitles(config)) {
    const pr = ctx.payload.pull_request
    const branchName = pr.head.ref
    const issueNumber = github.getIssueNumberFromBranchName(branchName)
    if (issueNumber) {
      const owner = context.getRepoOwnerLogin(ctx)
      const repo = context.getRepoName(ctx)
      const { data: issue } = await ctx.octokit.issues.get({ owner: owner, repo: repo, issue_number: issueNumber })
      if (issue) {
        const labels = issue.labels.concat(pr.labels).map(l => l.name)
        await github.updatePrTitle(app, ctx, config, pr, issue.title, labels)
      }
    }
  }
  if (Config.autoLinkIssue(config)) {
    const pr = ctx.payload.pull_request
    const branchName = pr.head.ref
    const issueNumber = github.getIssueNumberFromBranchName(branchName)
    if (issueNumber) {
      const body = pr.body
      const linkText = `closes #${issueNumber}`
      if (!body) {
        await github.updatePrBody(app, ctx, config, pr, linkText)
      } else if (!body.includes(`closes #${issueNumber}`)) {
        const updatedBody = body.length === 0 ? linkText : `${body}\n${linkText}`
        await github.updatePrBody(app, ctx, config, pr, updatedBody)
      }
    }
  }
}

module.exports = {
  handle: handle
}
