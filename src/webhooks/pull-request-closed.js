const Config = require('./../config')
const context = require('./../context')
const github = require('./../github')

async function handle (app, ctx) {
  if (ctx.payload.pull_request.merged === true) {
    const config = await Config.load(ctx)
    if (config && Config.autoCloseIssue(config)) {
      app.log('PR was closed, trying to close issue now...')
      const owner = context.getRepoOwnerLogin(ctx)
      const repo = context.getRepoName(ctx)
      const branchName = ctx.payload.pull_request.head.ref
      const issueNumber = github.getIssueNumberFromBranchName(branchName)
      if (issueNumber) {
        const issueForBranch = await ctx.octokit.issues.get({ owner: owner, repo: repo, issue_number: issueNumber })
        if (issueForBranch) {
          await ctx.octokit.issues.update({ owner: owner, repo: repo, issue_number: issueNumber, state: 'closed' })
        }
      }
    }
  }
}

module.exports = {
  handle: handle
}
