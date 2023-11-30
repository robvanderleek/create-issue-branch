const Config = require('./config')
const utils = require('./utils')
const context = require('./context')
const plans = require('./plans')
const { interpolate } = require('./interpolate')
const { formatAsExpandingMarkdown, sleep } = require('./utils')
const core = require('@actions/core')

async function createIssueBranch (app, ctx, branchName, config) {
  if (await hasValidSubscriptionForRepo(app, ctx)) {
    const sha = await getSourceBranchHeadSha(ctx, config, app.log)
    if (sha) {
      await createBranch(ctx, config, branchName, sha, app.log)
    } else {
      await addComment(ctx, config, 'Could not find source branch for new issue branch')
    }
  }
}

async function hasValidSubscriptionForRepo (app, ctx) {
  if (utils.isRunningInGitHubActions()) {
    return true
  }
  if (context.isPrivateOrgRepo(ctx)) {
    const isProPan = await plans.isProPlan(app, ctx)
    if (!isProPan) {
      await addBuyProComment(ctx)
      app.log('Added comment to buy Pro 🙏 plan')
      return false
    } else {
      return true
    }
  } else {
    const login = context.getRepoOwnerLogin(ctx)
    app.log(`Creating branch in public repository from user/org: https://github.com/${login} ...`)
    return true
  }
}

const buyComment = 'Hi there :wave:\n\nUsing this App for a private organization repository requires a paid ' +
  'subscription that you can buy on the [GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n' +
  'If you are a non-profit organization or otherwise can not pay for such a plan, contact me by ' +
  '[creating an issue](https://github.com/robvanderleek/create-issue-branch/issues)'

async function addBuyProComment (ctx) {
  await addComment(ctx, { silent: false }, buyComment)
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
      result = interpolate(config.branchName, ctx.payload, process.env)
    }
  } else {
    result = `issue-${number}-${title}`
  }
  const replacementChar = Config.getGitSafeReplacementChar(config)
  const replaceChars = Config.getGitReplaceChars(config)
  return utils.makePrefixGitSafe(getIssueBranchPrefix(ctx, config), {
    replaceChars: replaceChars, //
    replacementChar: replacementChar //
  }) + utils.makeGitSafe(result, { replaceChars: replaceChars, replacementChar: replacementChar })
}

function getIssueNumberFromBranchName (branchName) {
  let match = branchName.match(/^[i]?(\d+)/)
  if (match) {
    return parseInt(match[1])
  }
  match = branchName.match(/issue-(\d+)/i)
  if (match) {
    return parseInt(match[1])
  }
  if (branchName.includes('/')) {
    branchName = branchName.substring(branchName.lastIndexOf('/') + 1)
    return getIssueNumberFromBranchName(branchName)
  }
  return undefined
}

function getIssueBranchPrefix (ctx, config) {
  let result = ''
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prefix) {
    result = branchConfig.prefix
  }
  return interpolate(result, ctx.payload, process.env)
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

function skipForIssue (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig) {
    return branchConfig.skip === true
  } else {
    return false
  }
}

function skipBranchCreationForIssue (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig) {
    return branchConfig.skipBranch === true
  } else {
    return false
  }
}

async function addComment (ctx, config, comment) {
  const silent = Config.isSilent(config)
  if (!silent) {
    const params = ctx.issue({ body: comment })
    try {
      await ctx.octokit.issues.createComment(params)
    } catch (e) {
      console.info('Creating comment failed, retrying in 1 second')
      await sleep(1000)
      try {
        await ctx.octokit.issues.createComment(params)
      } catch (e) {
        console.error('Creating comment failed')
      }
    }
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

function getPrTargetBranch (ctx, config) {
  const branchConfig = getIssueBranchConfig(ctx, config)
  if (branchConfig && branchConfig.prTarget) {
    return branchConfig.prTarget
  } else if (branchConfig && branchConfig.name) {
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
      core.setOutput('branchName', branchName)
    }
    const commentMessage = interpolate(Config.getCommentMessage(config), { ...ctx.payload, branchName: branchName })
    await addComment(ctx, config, commentMessage)
    if (utils.isProduction()) {
      utils.pushMetric(owner, log)
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

async function createPr (app, ctx, config, username, branchName) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const base = getPrTargetBranch(ctx, config, app.log)
  const title = context.getIssueTitle(ctx)
  const draft = Config.shouldOpenDraftPR(config)
  try {
    const baseHeadSha = await getBranchHeadSha(ctx, base)
    const branchHeadSha = await getBranchHeadSha(ctx, branchName)
    if (branchHeadSha === baseHeadSha) {
      app.log('Branch and base heads are equal, creating empty commit for PR')
      const treeSha = await getCommitTreeSha(ctx, branchHeadSha)
      const emptyCommitSha = await createCommit(ctx, branchHeadSha, treeSha, username, getCommitText(ctx, config))
      await updateReference(ctx, branchName, emptyCommitSha)
    }
    const { data: pr } = await ctx.octokit.pulls.create(
      { owner, repo, head: branchName, base, title, body: getPrBody(app, ctx, config), draft: draft })
    app.log(`${draft ? 'Created draft' : 'Created'} pull request ${pr.number} for branch ${branchName}`)
    await copyIssueAttributesToPr(app, ctx, config, pr)
  } catch (e) {
    app.log(`Could not create PR (${e.message})`)
    await addComment(ctx, config, `Could not create PR (${e.message})`)
  }
}

function getCommitText (ctx, config) {
  const draft = Config.shouldOpenDraftPR(config)
  const draftText = draft ? 'draft ' : ''
  const issueNumber = context.getIssueNumber(ctx)
  const text = `Create ${draftText}PR for #${issueNumber}`
  if (Config.prSkipCI(config)) {
    return text + '\n[skip ci]'
  } else {
    return text
  }
}

function getPrBody (app, ctx, config) {
  const issueNumber = context.getIssueNumber(ctx)
  let result = ''
  if (Config.copyIssueDescriptionToPR(config)) {
    app.log('Copying issue description to PR')
    const issueDescription = context.getIssueDescription(ctx)
    if (issueDescription) {
      result += formatAsExpandingMarkdown('Original issue description', issueDescription)
      result += '\n'
    }
  }
  result += `closes #${issueNumber}`
  return result
}

async function copyIssueAttributesToPr (app, ctx, config, pr) {
  try {
    if (Config.copyIssueLabelsToPR(config)) {
      app.log('Copying issue labels to PR')
      await copyIssueLabelsToPr(ctx, pr)
    }
    if (Config.copyIssueAssigneeToPR(config)) {
      app.log('Copying issue assignee to PR')
      await copyIssueAssigneeToPr(ctx, pr)
    }
    if (Config.copyIssueProjectsToPR(config)) {
      app.log('Copying issue projects to PR')
      await copyIssueProjectsToPr(ctx, pr)
    }
    if (Config.copyIssueMilestoneToPR(config)) {
      app.log('Copying issue milestone to PR')
      await copyIssueMilestoneToPr(ctx, pr)
    }
  } catch (e) {
    app.log(`Could not copy issue attributes (${e.message})`)
    await addComment(ctx, config, `Could not copy issue attributes (${e.message})`)
  }
}

async function copyIssueLabelsToPr (ctx, pr) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const labels = context.getIssueLabels(ctx)
  if (labels.length > 0) {
    await ctx.octokit.issues.addLabels({ owner, repo, issue_number: pr.number, labels })
  }
}

async function copyIssueAssigneeToPr (ctx, pr) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const assignee = context.getAssignee(ctx)
  await ctx.octokit.issues.addAssignees({ owner, repo, issue_number: pr.number, assignees: [assignee] })
}

async function copyIssueMilestoneToPr (ctx, pr) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const number = context.getMilestoneNumber(ctx)
  if (number) {
    await ctx.octokit.issues.update({ owner, repo, issue_number: pr.number, milestone: number })
  }
}

async function copyIssueProjectsToPr (ctx, pr) {
  const projectIds = await queryProjectIdsForIssue(ctx)
  const mutatePullRequest = `
  mutation($pullRequestId: ID!, $projectIds: [ID!])  {
    updatePullRequest(input:{pullRequestId: $pullRequestId, projectIds: $projectIds}) {
      pullRequest{
        id
      }
    }
  }`
  await ctx.octokit.graphql(mutatePullRequest, {
    pullRequestId: pr.node_id, projectIds: projectIds
  })
}

async function queryProjectIdsForIssue (ctx) {
  const queryProjectIds = `
  query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        projectCards {
          nodes {
            project {
              id
            }
          }
        }
      }
    }
  }
  `
  const queryResult = await ctx.octokit.graphql(queryProjectIds, {
    owner: context.getRepoOwnerLogin(ctx), repo: context.getRepoName(ctx), number: context.getIssueNumber(ctx)
  })
  const projectCards = queryResult?.repository?.issue?.projectCards
  const result = []
  if (projectCards) {
    for (const node of projectCards.nodes) {
      const projectId = node.project?.id
      if (projectId) {
        result.push(projectId)
      }
    }
  }
  return result
}

async function updatePrTitle (app, ctx, config, pr, issueTitle, labels) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const pullNumber = pr.number
  const conventionalPrefix = Config.getConventionalPrTitlePrefix(config, labels)
  const updatedTitle = conventionalPrefix + ' ' + issueTitle
  if (updatedTitle !== pr.title) {
    app.log.info(`Updating prefix for PR #${pullNumber} in ${owner}/${repo} to: ${conventionalPrefix}`)
    await ctx.octokit.pulls.update({ owner: owner, repo: repo, pull_number: pullNumber, title: updatedTitle })
  }
}

async function updatePrBody (app, ctx, config, pr, body) {
  const owner = context.getRepoOwnerLogin(ctx)
  const repo = context.getRepoName(ctx)
  const pullNumber = pr.number
  app.log.info(`Updating body for PR #${pullNumber} in ${owner}/${repo}`)
  await ctx.octokit.pulls.update({ owner: owner, repo: repo, pull_number: pullNumber, body: body })
}

module.exports = {
  createIssueBranch: createIssueBranch,
  addComment: addComment,
  branchExists: branchExists,
  getIssueNumberFromBranchName: getIssueNumberFromBranchName,
  getIssueBranchConfig: getIssueBranchConfig,
  skipForIssue: skipForIssue,
  skipBranchCreationForIssue: skipBranchCreationForIssue,
  getIssueBranchPrefix: getIssueBranchPrefix,
  getBranchNameFromIssue: getBranchNameFromIssue,
  getSourceBranch: getSourceBranch,
  getBranchName: getBranchName,
  createBranch: createBranch,
  createPr: createPr,
  updatePrTitle: updatePrTitle,
  updatePrBody: updatePrBody
}
