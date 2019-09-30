module.exports = app => {
  app.log('App was loaded')

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const owner = getRepoOwner(ctx)
    const repo = getRepoName(ctx)
    const issueNumber = getIssueNumber(ctx)
    const issueTitle = getIssueTitle(ctx)
    const branchName = await getBranchNameFromIssue(ctx, issueNumber, issueTitle)
    if (await branchExists(ctx, owner, repo, branchName)) {
      app.log('Branch already exists')
    } else {
      const sha = await getDefaultBranchHeadSha(ctx, owner, repo)
      await createBranch(ctx, owner, repo, branchName, sha)
      app.log(`Branch created: ${branchName}`)
      // commentOnIssue(ctx, owner, repo, issueNumber, branchName)
    }
  })
}

function getRepoOwner (ctx) {
  return ctx.payload.repository.owner.login
}

function getRepoName (ctx) {
  return ctx.payload.repository.name
}

function getIssueNumber (ctx) {
  return ctx.payload.issue.number
}

function getIssueTitle (ctx) {
  return ctx.payload.issue.title
}

function getDefaultBranch (ctx) {
  return ctx.payload.repository.default_branch
}

async function branchExists (ctx, owner, repo, branchName) {
  try {
    await ctx.github.gitdata.getRef({
      'owner': owner, 'repo': repo, ref: `heads/${branchName}`
    })
    return true
  } catch (err) {
    return false
  }
}

async function getDefaultBranchHeadSha (ctx, owner, repo) {
  const defaultBranch = getDefaultBranch(ctx)
  const res = await ctx.github.gitdata.getRef({
    owner: owner, repo: repo, ref: `heads/${defaultBranch}`
  })
  const ref = res.data.object
  return ref.sha
}

async function createBranch (ctx, owner, repo, branchName, sha) {
  const res = await ctx.github.gitdata.createRef({
    'owner': owner, 'repo': repo, 'ref': `refs/heads/${branchName}`, 'sha': sha
  })
  return res
}

async function getBranchNameFromIssue (ctx, number, title) {
  const config = await ctx.config('issue-branch.yml', { branchName: 'full' })
  if (config.branchName === 'tiny') {
    return `i${number}`
  } else if (config.branchName === 'short') {
    return `issue-${number}`
  } else {
    return getFullBranchNameFromIssue(number, title)
  }
}

function getFullBranchNameFromIssue (number, title) {
  let branchTitle = title.replace(/[\W]+/g, '_')
  if (branchTitle.endsWith('_')) {
    branchTitle = branchTitle.slice(0, -1)
  }
  return `issue-${number}-${branchTitle}`
}

// async function commentOnIssue (ctx, owner, repo, issueNumber, branchName) {
//   const body = `Created a branch for this ticket: ` +
//     `[${branchName}](https://github.com/${owner}/${repo}/tree/${branchName})`
//   await ctx.github.issues.createComment({
//     owner: owner, repo: repo, number: issueNumber, body: body
//   })
// }

module.exports.getFullBranchNameFromIssue = getFullBranchNameFromIssue
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
