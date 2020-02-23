const Raven = require('raven')
const Config = require('./config')
const AWS = require('aws-sdk')

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
    if (config && isModeAuto(config)) {
      await createIssueBranch(app, ctx, config)
    }
  })
  app.on('issue_comment.created', async ctx => {
    if (isChatOpsCommand(ctx.payload.comment.body)) {
      app.log('ChatOps command received')
      const config = await Config.load(ctx)
      if (config && isModeChatOps(config)) {
        await createIssueBranch(app, ctx, config)
      }
    }
  })
}

async function createIssueBranch (app, ctx, config) {
  const owner = getRepoOwner(ctx)
  const repo = getRepoName(ctx)
  const branchName = await getBranchNameFromIssue(ctx, config)
  if (await branchExists(ctx, owner, repo, branchName)) {
    await addComment(ctx, config, 'Branch already exists')
  } else {
    const sha = await getSourceBranchHeadSha(ctx, config, app.log)
    await createBranch(ctx, owner, repo, branchName, sha, app.log)
    app.log(`Branch created: ${branchName}`)
    await addComment(ctx, config, `Branch [${branchName}](${getRepoUrl(ctx)}/tree/${branchName}) created!`)
  }
}

function isProduction () {
  return process.env.NODE_ENV === 'production'
}

function isChatOpsCommand (s) {
  return ['/create-issue-branch', '/cib'].includes(s.trim().toLowerCase())
}

function getRepoOwner (ctx) {
  return ctx.payload.repository.owner.login
}

function getRepoName (ctx) {
  return ctx.payload.repository.name
}

function getRepoUrl (ctx) {
  return ctx.payload.repository.html_url
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

async function addComment (ctx, config, comment) {
  if (!isSilent(config)) {
    const params = ctx.issue({ body: comment })
    await ctx.github.issues.createComment(params)
  }
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
    if (isProduction()) {
      pushMetric(log)
    }
    return res
  } catch (e) {
    if (e.message === 'Reference already exists') {
      log.info('Could not create branch as it already exists')
    } else {
      log.error(`Could not create branch (${e.message})`)
    }
  }
}

function pushMetric (log) {
  const namespace = process.env.CLOUDWATCH_NAMESPACE ? process.env.CLOUDWATCH_NAMESPACE : 'create_issue_branch_staging'
  const metric = {
    MetricData: [{
      MetricName: 'branch_created', Unit: 'Count', Value: 1
    }], //
    Namespace: namespace
  }
  const cloudwatch = new AWS.CloudWatch()
  cloudwatch.putMetricData(metric, (err) => {
    if (err) {
      log.error('Could not push metric to CloudWatch: ' + err)
    } else {
      log.info('Pushed metric to CloudWatch')
    }
  })
}

function isModeAuto (config) {
  return !isModeChatOps(config)
}

function isModeChatOps (config) {
  return (config.mode && config.mode === 'chatops')
}

function isSilent (config) {
  if (config.silent) {
    return config.silent === true
  } else if (isModeChatOps(config)) {
    return false
  }
  return true
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
    result = `issue-${number}-${title}`
  }
  return makeGitSafe(getIssueBranchPrefix(ctx, config) + result)
}

function getIssueBranchPrefix (ctx, config) {
  let result = ''
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prefix) {
    result = branchConfig.prefix
  }
  return interpolate(result, ctx.payload)
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

function makeGitSafe (s) {
  let result = s.replace(/(?![-/])[\W]+/g, '_')
  if (result.endsWith('_')) {
    result = result.slice(0, -1)
  }
  return trim(result, '_')
}

function trim (str, ch) {
  let start = 0
  let end = str.length
  while (start < end && str[start] === ch) ++start
  while (end > start && str[end - 1] === ch) --end
  return (start > 0 || end < str.length) ? str.substring(start, end) : str
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
module.exports.isChatOpsCommand = isChatOpsCommand
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
module.exports.getIssueBranchConfig = getIssueBranchConfig
module.exports.getIssueBranchPrefix = getIssueBranchPrefix
module.exports.createBranch = createBranch
module.exports.makeGitSafe = makeGitSafe
module.exports.interpolate = interpolate
module.exports.wildcardMatch = wildcardMatch
