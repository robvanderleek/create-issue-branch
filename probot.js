module.exports = app => {
  app.log('App was loaded')

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const owner = getRepoOwner(ctx)
    const repo = getRepoName(ctx)
    const config = await ctx.config('issue-branch.yml', {})
    const branchName = await getBranchNameFromIssue(ctx, config)
    if (await branchExists(ctx, owner, repo, branchName)) {
      app.log('Branch already exists')
    } else {
      const sha = await getSourceBranchHeadSha(ctx, config, app.log)
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

async function getSourceBranchHeadSha (ctx, config, log) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  let result
  if (branchConfig && branchConfig.name) {
    result = await getBranchHeadSha(ctx, branchConfig.name)
    if (result) {
      log(`Source branch: ${branchConfig.name}`)
    }
  }
  if (!result) {
    const defaultBranch = getDefaultBranch(ctx)
    log(`Source branch: ${defaultBranch}`)
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

function getIssueBranchConfig (ctx, config) {
  if (config.branches) {
    const issueLabels = getIssueLabels(ctx)
    for (const branchConfiguration of config.branches) {
      if (issueLabels.includes(branchConfiguration.label)) {
        return branchConfiguration
      }
    }
  }
  return undefined
}

function getIssueBranchPrefix (ctx, config) {
  let result = ''
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prefix) {
    result = branchConfig.prefix
  }
  return interpolate(result, ctx.payload)
}

async function getBranchNameFromIssue (ctx, config) {
  const number = getIssueNumber(ctx)
  const title = getIssueTitle(ctx)
  let result
  if (config.branchName && config.branchName === 'tiny') {
    result = `i${number}`
  } else if (config.branchName && config.branchName === 'short') {
    result = `issue-${number}`
  } else {
    result = getFullBranchNameFromIssue(number, title)
  }
  return getIssueBranchPrefix(ctx, config) + result
}

function getFullBranchNameFromIssue (number, title) {
  let branchTitle = title.replace(/[\W]+/g, '_')
  if (branchTitle.endsWith('_')) {
    branchTitle = branchTitle.slice(0, -1)
  }
  return `issue-${number}-${branchTitle}`
}

function interpolate (s, obj) {
  return s.replace(/[$]{([^}]+)}/g, function (_, path) {
    const properties = path.split('.')
    return properties.reduce((prev, curr) => prev && prev[curr], obj)
  })
}

// For unit-tests
module.exports.getFullBranchNameFromIssue = getFullBranchNameFromIssue
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
module.exports.getIssueBranchConfig = getIssueBranchConfig
module.exports.getIssueBranchPrefix = getIssueBranchPrefix
module.exports.interpolate = interpolate
