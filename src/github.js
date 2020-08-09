const Config = require('./config')
const utils = require('./utils')
const context = require('./context')

async function createIssueBranch (app, ctx, branchName, config) {
  if (await branchExists(ctx, branchName)) {
    if (Config.isModeChatOps(config)) {
      await addComment(ctx, config, 'Branch already exists')
    }
  } else {
    const sha = await getSourceBranchHeadSha(ctx, config, app.log)
    await createBranch(ctx, config, branchName, sha, app.log)
  }
}

async function getBranchNameFromIssue (ctx, config) {
  const title = context.getIssueTitle(ctx)
  return getBranchName(ctx, config, title)
}

async function getBranchName (ctx, config, title) {
  const number = context.getIssueNumber(ctx)
  let result
  if (config.branchName) {
    if (config.branchName === 'tiny') {
      result = `i${number}`
    } else if (config.branchName === 'short') {
      result = `issue-${number}`
    } else if (config.branchName === 'full') {
      result = `issue-${number}-${title}`
    } else {
      ctx.payload.issue.title = title
      result = utils.interpolate(config.branchName, ctx.payload)
    }
  } else {
    result = `issue-${number}-${title}`
  }
  const replacementChar = Config.getGitSafeReplacementChar(config)
  return utils.makePrefixGitSafe(getIssueBranchPrefix(ctx, config), replacementChar) +
    utils.makeGitSafe(result, replacementChar)
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
    const issueLabels = context.getIssueLabels(ctx)
    for (const branchConfiguration of config.branches) {
      if (issueLabels.some(l => utils.wildcardMatch(branchConfiguration.label, l))) {
        return branchConfiguration
      }
    }
  }
  return undefined
}

function skipBranchCreationForIssue (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig) {
    return branchConfig.skip === true
  } else {
    return false
  }
}

async function addComment (ctx, config, comment) {
  const silent = Config.isSilent(config)
  if (!silent) {
    const params = ctx.issue({ body: comment })
    await ctx.github.issues.createComment(params)
  }
}

async function branchExists (ctx, branchName) {
  const owner = context.getRepoOwner(ctx)
  const repo = context.getRepoName(ctx)
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
    const defaultBranch = context.getDefaultBranch(ctx)
    log(`Source branch: ${defaultBranch}`)
    result = await getBranchHeadSha(ctx, defaultBranch)
  }
  return result
}

async function getBranchHeadSha (ctx, branch) {
  try {
    const res = await ctx.github.git.getRef({
      owner: context.getRepoOwner(ctx), repo: context.getRepoName(ctx), ref: `heads/${branch}`
    })
    const ref = res.data.object
    return ref.sha
  } catch (e) {
    return undefined
  }
}

async function createBranch (ctx, config, branchName, sha, log) {
  const owner = context.getRepoOwner(ctx)
  const repo = context.getRepoName(ctx)
  try {
    const res = await ctx.github.git.createRef({
      owner: owner, repo: repo, ref: `refs/heads/${branchName}`, sha: sha
    })
    log(`Branch created: ${branchName}`)
    await addComment(ctx, config, `Branch [${branchName}](${context.getRepoUrl(ctx)}/tree/${branchName}) created!`)
    if (utils.isProduction()) {
      utils.pushMetric(log)
    }
    return res
  } catch (e) {
    if (e.message === 'Reference already exists') {
      log.info('Could not create branch as it already exists')
    } else {
      await addComment(ctx, config, `Could not create branch (${e.message})`)
    }
  }
}

module.exports = {
  createIssueBranch: createIssueBranch,
  getIssueNumberFromBranchName: getIssueNumberFromBranchName,
  getIssueBranchConfig: getIssueBranchConfig,
  skipBranchCreationForIssue: skipBranchCreationForIssue,
  getIssueBranchPrefix: getIssueBranchPrefix,
  getBranchNameFromIssue: getBranchNameFromIssue,
  getBranchName: getBranchName,
  createBranch: createBranch
}
