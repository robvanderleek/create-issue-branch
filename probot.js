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
      const sha = await getSourceBranchHeadSha(ctx, app)
      await createBranch(ctx, owner, repo, branchName, sha)
      app.log(`Branch created: ${branchName}`)
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

function getIssueLabels (ctx) {
  return ctx.payload.issue.labels.map(l => l.name)
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

async function getSourceBranchHeadSha (ctx, app) {
  const config = await ctx.config('issue-branch.yml', { branches: [] })
  const issueLabels = getIssueLabels(ctx)
  let result
  for (const branchMapping of config.branches) {
    if (issueLabels.includes(branchMapping.label)) {
      result = await getBranchHeadSha(ctx, branchMapping.name)
      if (result) {
        app.log(`Source branch: ${branchMapping.name}`)
      }
    }
  }
  if (!result) {
    const defaultBranch = getDefaultBranch(ctx)
    app.log(`Source branch: ${defaultBranch}`)
    result = await getBranchHeadSha(ctx, defaultBranch)
  }
  return result
}

async function getBranchHeadSha (ctx, branch) {
  try {
    const res = await ctx.github.gitdata.getRef({
      owner: getRepoOwner(ctx), repo: getRepoName(ctx), ref: `heads/${branch}`
    })
    const ref = res.data.object
    return ref.sha
  } catch (e) {
    return undefined
  }
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

module.exports.getFullBranchNameFromIssue = getFullBranchNameFromIssue
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
