module.exports = app => {
  app.log('App was loaded')

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const owner = getRepoOwner(ctx)
    const repo = getRepoName(ctx)
    const issueNumber = getIssueNumber(ctx)
    const issueTitle = getIssueTitle(ctx)
    const branchName = getBranchNameFromIssue(issueNumber, issueTitle)
    if (await branchExists(ctx, owner, repo, branchName)) {
      app.log('Branch already exists')
    } else {
      const sha = await getDefaultBranchHeadSha(ctx, owner, repo)
      await createBranch(ctx, owner, repo, branchName, sha)
      app.log(`Branch created: ${branchName}`)
    }
  })
}

function getRepoOwner (context) {
  return context.payload.repository.owner.login
}

function getRepoName (context) {
  return context.payload.repository.name
}

function getIssueNumber (context) {
  return context.payload.issue.number
}

function getIssueTitle (context) {
  return context.payload.issue.title
}

function getDefaultBranch (context) {
  return context.payload.repository.default_branch
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
    'owner': owner, 'repo': repo, ref: `heads/${defaultBranch}`
  })
  const ref = res.data.object
  return ref.sha
}

async function createBranch (ctx, owner, repo, branchName, sha) {
  await ctx.github.gitdata.createRef({
    'owner': owner, 'repo': repo, 'ref': `refs/heads/${branchName}`, 'sha': sha
  })
}

function getBranchNameFromIssue (number, title) {
  let branchTitle = title.replace(/[\W]+/g, '_')
  if (branchTitle.endsWith('_')) {
    branchTitle = branchTitle.slice(0, -1)
  }
  return `issue-${number}-${branchTitle}`
}

module.exports.getBranchNameFromIssue = getBranchNameFromIssue
