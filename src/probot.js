const Sentry = require('@sentry/node')
const Config = require('./config')
const AWS = require('aws-sdk')
const utils = require('./utils')

module.exports = app => {
  app.log('App was loaded')

  if (process.env.SENTRY_DSN) {
    app.log('Setting up Sentry.io logging...')
    Sentry.init({ dsn: process.env.SENTRY_DSN })
  } else {
    app.log('Skipping Sentry.io setup')
  }

  app.on('issues.assigned', async ctx => {
    app.log('Issue was assigned')
    const config = await Config.load(ctx)
    if (config && Config.isModeAuto(config)) {
      await createIssueBranch(app, ctx, config)
    }
  })
  app.on('issue_comment.created', async ctx => {
    if (isChatOpsCommand(ctx.payload.comment.body)) {
      app.log('ChatOps command received')
      const config = await Config.load(ctx)
      if (config && Config.isModeChatOps(config)) {
        await createIssueBranch(app, ctx, config)
      }
    }
  })
  app.on('pull_request.closed', async ctx => {
    if (ctx.payload.pull_request.merged === true) {
      const config = await Config.load(ctx)
      if (config && Config.autoCloseIssue(config)) {
        const owner = getRepoOwner(ctx)
        const repo = getRepoName(ctx)
        const branchName = ctx.payload.pull_request.head.ref
        const issueNumber = getIssueNumberFromBranchName(branchName)
        if (issueNumber) {
          const issueForBranch = await ctx.github.issues.get({ owner: owner, repo: repo, issue_number: issueNumber })
          if (issueForBranch) {
            await ctx.github.issues.update({ owner: owner, repo: repo, issue_number: issueNumber, state: 'closed' })
          }
        }
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
  const silent = isSilent(config)
  if (!silent) {
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
    await ctx.github.git.getRef({
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
    const res = await ctx.github.git.getRef({
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
    const res = await ctx.github.git.createRef({
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

function isSilent (config) {
  if ('silent' in config) {
    return config.silent === true
  } else if (Config.isModeChatOps(config)) {
    return false
  }
  return true
}

async function getBranchNameFromIssue (ctx, config) {
  const number = getIssueNumber(ctx)
  const title = getIssueTitle(ctx)
  let result
  if (config.branchName) {
    if (config.branchName === 'tiny') {
      result = `i${number}`
    } else if (config.branchName === 'short') {
      result = `issue-${number}`
    } else if (config.branchName === 'full') {
      result = `issue-${number}-${title}`
    } else {
      result = utils.interpolate(config.branchName, ctx.payload)
    }
  } else {
    result = `issue-${number}-${title}`
  }
  return utils.makeGitSafe(getIssueBranchPrefix(ctx, config), true) + utils.makeGitSafe(result)
}

function getIssueNumberFromBranchName (branchName) {
  if (branchName.includes('/')) {
    branchName = branchName.substring(branchName.lastIndexOf('/') + 1)
  }
  let match = branchName.match(/^[i]?(\d+)/)
  if (match) {
    return parseInt(match[1])
  }
  match = branchName.match(/issue-(\d+)/i)
  if (match) {
    return parseInt(match[1])
  }
  return undefined
}

function getIssueBranchPrefix (ctx, config) {
  let result = ''
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prefix) {
    result = branchConfig.prefix
  }
  return utils.interpolate(result, ctx.payload)
}

function getIssueBranchConfig (ctx, config) {
  if (config.branches) {
    const issueLabels = getIssueLabels(ctx)
    for (const branchConfiguration of config.branches) {
      if (issueLabels.some(l => utils.wildcardMatch(branchConfiguration.label, l))) {
        return branchConfiguration
      }
    }
  }
  return undefined
}

// For unit-tests
module.exports.isChatOpsCommand = isChatOpsCommand
module.exports.getBranchNameFromIssue = getBranchNameFromIssue
module.exports.getIssueNumberFromBranchName = getIssueNumberFromBranchName
module.exports.getIssueBranchConfig = getIssueBranchConfig
module.exports.getIssueBranchPrefix = getIssueBranchPrefix
module.exports.createBranch = createBranch
