const Config = require('./config')
const utils = require('./utils')
const context = require('./context')
const plans = require('./plans')

async function createIssueBranch (app, ctx, branchName, config) {
  if (await hasValidSubscriptionForRepo(app, ctx)) {
    const sha = await getSourceBranchHeadSha(ctx, config, app.log)
    await createBranch(ctx, config, branchName, sha, app.log)
  }
}

async function hasValidSubscriptionForRepo (app, ctx) {
  if (utils.isRunningInGitHubActions()) {
    return true
  }
  if (context.isPrivateOrgRepo(ctx)) {
    const isProPan = await plans.isProPlan(app, ctx)
    if (!isProPan) {
      if (await plans.isActivatedBeforeProPlanIntroduction(app, ctx)) {
        await addUpgradeToProComment(ctx)
        app.log('Added comment 📝 to upgrade Free plan')
        return true
      } else {
        await addBuyProComment(ctx)
        app.log('Added comment to buy Pro 🙏 plan')
        return false
      }
    } else {
      return true
    }
  } else {
    const login = context.getRepoOwnerLogin(ctx)
    app.log(`Creating branch in public repository from user/org: https://github.com/${login} ...`)
    return true
  }
}

async function getBranchNameFromIssue (ctx, config) {
  const title = context.getIssueTitle(ctx)
  const result = await getBranchName(ctx, config, title)
  // For magic number below see:
  // https://stackoverflow.com/questions/60045157/what-is-the-maximum-length-of-a-github-branch-name
  const MAX_BYTES_GITHUB_BRANCH_NAME = 243
  if (utils.getStringLengthInBytes(result) > MAX_BYTES_GITHUB_BRANCH_NAME) {
    return utils.trimStringToByteLength(result, MAX_BYTES_GITHUB_BRANCH_NAME)
  } else {
    return result
  }
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
    const issueLabels = context.getIssueLabelsForMatching(ctx)
    for (const branchConfig of config.branches) {
      const labels = branchConfig.label instanceof Array ? branchConfig.label : [branchConfig.label]
      if (allLabelsMatchIssueLabels(labels, issueLabels)) {
        return branchConfig
      }
    }
  }
  return undefined
}

function allLabelsMatchIssueLabels (labels, issueLabels) {
  return labels.every(label => issueLabels.some(issueLabel => utils.wildcardMatch(label, issueLabel)))
}

function skipBranchCreationForIssue (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig) {
    return branchConfig.skip === true
  } else {
    return false
  }
}

const buyComment = 'Hi there :wave:\n\nUsing this App for a private organization repository requires a paid ' +
  'subscription that you can buy on the [GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n' +
  'If you are a non-profit organization or otherwise can not pay for such a plan, contact me by ' +
  '[creating an issue](https://github.com/robvanderleek/create-issue-branch/issues)'

async function addBuyProComment (ctx) {
  await addComment(ctx, { silent: false }, buyComment)
}

async function addUpgradeToProComment (ctx) {
  const comment = buyComment +
    '\n\nSince you activated this App before the paid plan introduction it keeps on working ' +
    'for this repository. [Upgrade to the paid plan](https://github.com/marketplace/create-issue-branch) to ' +
    'remove this message.'
  await addComment(ctx, { silent: false }, comment)
}

async function addComment (ctx, config, comment) {
  const silent = Config.isSilent(config)
  if (!silent) {
    const params = ctx.issue({ body: comment })
    await ctx.octokit.issues.createComment(params)
  }
}

async function branchExists (ctx, branchName) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  try {
    await ctx.octokit.git.getRef({
      owner: owner, repo: repo, ref: `heads/${branchName}`
    })
    return true
  } catch (err) {
    return false
  }
}

function getSourceBranch (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.name) {
    return branchConfig.name
  } else {
    return getDefaultBranch(ctx, config)
  }
}

async function getSourceBranchHeadSha (ctx, config, log) {
  const sourceBranch = getSourceBranch(ctx, config)
  let result = await getBranchHeadSha(ctx, sourceBranch)
  if (result) {
    log.debug(`Source branch: ${sourceBranch}`)
  }
  if (!result) {
    const defaultBranch = getDefaultBranch(ctx, config)
    log.debug(`Source branch: ${defaultBranch}`)
    result = await getBranchHeadSha(ctx, defaultBranch)
  }
  return result
}

function getDefaultBranch (ctx, config) {
  return Config.getDefaultBranch(config) || context.getDefaultBranch(ctx)
}

async function getBranchHeadSha (ctx, branch) {
  try {
    const res = await ctx.octokit.git.getRef({
      owner: context.getRepoOwnerLogin(ctx), repo: context.getRepoName(ctx), ref: `heads/${branch}`
    })
    const ref = res.data.object
    return ref.sha
  } catch (e) {
    return undefined
  }
}

async function getCommitTreeSha (ctx, commitSha) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const res = await ctx.octokit.git.getCommit({ owner, repo, commit_sha: commitSha })
  return res.data.tree.sha
}

async function createCommit (ctx, commitSha, treeSha, username, message) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const res = await ctx.octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeSha,
    parents: [commitSha],
    author: { name: username, email: `${username}@users.noreply.github.com` }
  })
  return res.data.sha
}

async function updateReference (ctx, branchName, sha) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  await ctx.octokit.git.updateRef({ owner, repo, ref: `heads/${branchName}`, sha })
}

async function createBranch (ctx, config, branchName, sha, log) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  try {
    const res = await ctx.octokit.git.createRef({
      owner: owner, repo: repo, ref: `refs/heads/${branchName}`, sha: sha
    })
    log(`Branch created: ${branchName}`)
    if (utils.isRunningInGitHubActions()) {
      process.stdout.write(`::set-output name=branchName::${branchName}\n`)
    }
    const commentMessage = utils.interpolate(Config.getCommentMessage(config),
      { ...ctx.payload, branchName: branchName })
    await addComment(ctx, config, commentMessage)
    if (utils.isProduction()) {
      utils.pushMetric(log)
    }
    return res
  } catch (e) {
    if (e.message === 'Reference already exists') {
      log.info('Could not create branch as it already exists')
    } else {
      await addComment(ctx, config, `Could not create branch \`${branchName}\` due to: ${e.message}`)
    }
  }
}

async function createPR (app, ctx, config, username, branchName) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const base = getSourceBranch(ctx, config, app.log)
  const title = context.getIssueTitle(ctx)
  const issueNumber = context.getIssueNumber(ctx)
  const draft = Config.shouldOpenDraftPR(config)
  const draftText = draft ? 'draft ' : ''
  try {
    const commitSha = await getBranchHeadSha(ctx, branchName)
    const treeSha = await getCommitTreeSha(ctx, commitSha)
    const emptyCommitSha = await createCommit(ctx, commitSha, treeSha, username,
      `Create ${draftText}PR for #${issueNumber}`)
    await updateReference(ctx, branchName, emptyCommitSha)
    const { data: pr } = await ctx.octokit.pulls.create(
      { owner, repo, head: branchName, base, title, body: `closes #${issueNumber}`, draft: draft })
    app.log(`${draft ? 'Created draft' : 'Created'} pull request ${pr.number} for branch ${branchName}`)
    if (Config.copyIssueLabelsToPR(config)) {
      await copyIssueLabelsToPr(ctx, pr)
    }
    if (Config.copyIssueAssigneeToPR(config)) {
      await copyIssueAssigneeToPr(ctx, pr)
    }
  } catch (e) {
    app.log(`Could not create draft PR (${e.message})`)
    await addComment(ctx, config, `Could not create ${draftText}PR (${e.message})`)
  }
}

async function copyIssueLabelsToPr (ctx, pr) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const labels = context.getIssueLabels(ctx)
  await ctx.octokit.issues.addLabels({ owner, repo, issue_number: pr.number, labels })
}

async function copyIssueAssigneeToPr (ctx, pr) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const assignee = context.getAssignee(ctx)
  await ctx.octokit.issues.addAssignees({ owner, repo, issue_number: pr.number, assignees: [assignee] })
}

module.exports = {
  createIssueBranch: createIssueBranch,
  addComment: addComment,
  branchExists: branchExists,
  getIssueNumberFromBranchName: getIssueNumberFromBranchName,
  getIssueBranchConfig: getIssueBranchConfig,
  skipBranchCreationForIssue: skipBranchCreationForIssue,
  getIssueBranchPrefix: getIssueBranchPrefix,
  getBranchNameFromIssue: getBranchNameFromIssue,
  getBranchName: getBranchName,
  createBranch: createBranch,
  createPR: createPR
}
