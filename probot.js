const Raven = require('raven')
const Config = require('./config')

module.exports = app => {
  app.log('App was loaded')

  if (process.env.SENTRY_DSN) {
    app.log('Setting up Sentry.io logging...')
    Raven.config(process.env.SENTRY_DSN).install()
  } else {
    app.log('Skipping Sentry.io setup')
  }

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const config = await Config.load(ctx)
    if (config) {
      const owner = getRepoOwner(ctx)
      const repo = getRepoName(ctx)
      const branchName = await getBranchNameFromIssue(ctx, config)
      if (await branchExists(ctx, owner, repo, branchName)) {
        app.log('Branch already exists')
      } else {
        const sha = await getSourceBranchHeadSha(ctx, config, app.log)
        await createBranch(ctx, owner, repo, branchName, sha, app.log)
      }
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
  const labels = ctx.payload.issue.labels.map(l => l.name)
  if (labels.length === 0) {
    return ['']
  } else {
    return labels
  }
}

async function branchExists (ctx, owner, repo, branchName) {
  try {
    await ctx.github.gitdata.getRef({
      owner: owner, repo: repo, ref: `heads/${branchName}`
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

async function createBranch (ctx, owner, repo, branchName, sha, log) {
  try {
    const res = await ctx.github.gitdata.createRef({
      owner: owner, repo: repo, ref: `refs/heads/${branchName}`, sha: sha
    })
    log(`Branch created: ${branchName}`)
    return res
  } catch (e) {
    if (e.message === 'Reference already exists') {
      log.info('Could not create branch as it already exists')
    } else {
      log.error(`Could not create branch (${e.message})`)
    }
  }
}

function getIssueBranchConfig (ctx, config) {
  if (config.branches) {
    const issueLabels = getIssueLabels(ctx)
    for (const branchConfiguration of config.branches) {
      if (issueLabels.some(l => wildcardMatch(branchConfiguration.label, l))) {
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

function wildcardMatch (pattern, s) {
  const regExp = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  return regExp.test(s)
}

// For unit-tests
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
module.exports.getIssueBranchConfig = getIssueBranchConfig
module.exports.getIssueBranchPrefix = getIssueBranchPrefix
module.exports.createBranch = createBranch
module.exports.getFullBranchNameFromIssue = getFullBranchNameFromIssue
module.exports.interpolate = interpolate
module.exports.wildcardMatch = wildcardMatch
