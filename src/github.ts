import core from "@actions/core";
import {
    getAssignee,
    getDefaultBranch as getDefaultBranchFromContext,
    getIssueDescription,
    getIssueLabels,
    getIssueLabelsForMatching,
    getIssueNumber,
    getIssueTitle,
    getMilestoneNumber,
    getRepoName,
    getRepoOwnerLogin,
    isPrivateOrgRepo
} from "./context";
import {Context, Probot} from "probot";
import * as utils from "./utils";
import {isProPlan} from "./plans";
import {interpolate} from "./interpolate";
import {Config} from "./entities/Config";
import {
    getCommentMessage,
    getConventionalPrTitlePrefix,
    getDefaultBranch as getDefaultBranchFromConfig,
    prSkipCI
} from "./config";

export async function createIssueBranch(app: Probot, ctx: Context<any>, branchName: string, config: Config) {
    if (await hasValidSubscriptionForRepo(app, ctx, config)) {
        const sha = await getSourceBranchHeadSha(ctx, config, app.log)
        if (sha) {
            await createBranch(ctx, config, branchName, sha, app.log)
        } else {
            await addComment(ctx, config, 'Could not find source branch for new issue branch')
        }
    }
}

async function hasValidSubscriptionForRepo(app: Probot, ctx: Context<any>, config: Config) {
    if (utils.isRunningInGitHubActions()) {
        return true
    }
    if (isPrivateOrgRepo(ctx)) {
        const isProPan = await isProPlan(app, ctx)
        if (!isProPan) {
            await addBuyProComment(ctx, config)
            app.log('Added comment to buy Pro 🙏 plan')
            return false
        } else {
            return true
        }
    } else {
        const login = getRepoOwnerLogin(ctx)
        app.log(`Creating branch in public repository from user/org: https://github.com/${login} ...`)
        return true
    }
}

const buyComment = 'Hi there :wave:\n\nUsing this App for a private organization repository requires a paid ' +
    'subscription that you can buy on the [GitHub Marketplace](https://github.com/marketplace/create-issue-branch)\n\n' +
    'If you are a non-profit organization or otherwise can not pay for such a plan, contact me by ' +
    '[creating an issue](https://github.com/robvanderleek/create-issue-branch/issues)'

async function addBuyProComment(ctx: Context<any>, config: Config) {
    config.silent = false;
    await addComment(ctx, config, buyComment)
}

export async function getBranchNameFromIssue(ctx: Context<any>, config: Config) {
    const title = getIssueTitle(ctx)
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

export async function getBranchName(ctx: Context<any>, config: Config, title: string) {
    const number = getIssueNumber(ctx)
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
    const replacementChar = config.gitSafeReplacementChar;
    const replaceChars = config.gitReplaceChars;
    return utils.makePrefixGitSafe(getIssueBranchPrefix(ctx, config), {
        replaceChars: replaceChars, //
        replacementChar: replacementChar //
    }) + utils.makeGitSafe(result, {replaceChars: replaceChars, replacementChar: replacementChar})
}

export function getIssueNumberFromBranchName(branchName: string): number | undefined {
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

export function getIssueBranchPrefix(ctx: Context<any>, config: Config) {
    let result = ''
    const branchConfig = getIssueBranchConfig(ctx, config)
    if (branchConfig && branchConfig.prefix) {
        result = branchConfig.prefix
    }
    return interpolate(result, ctx.payload, process.env)
}

export function getIssueBranchConfig(ctx: Context<any>, config: Config) {
    if (config.branches.length > 0) {
        const issueLabels = getIssueLabelsForMatching(ctx)
        for (const branchConfig of config.branches) {
            const labels = branchConfig.label instanceof Array ? branchConfig.label : [branchConfig.label];
            if (allLabelsMatchIssueLabels(labels, issueLabels)) {
                return branchConfig
            }
        }
    }
    return undefined
}

function allLabelsMatchIssueLabels(labels: Array<string>, issueLabels: Array<string>) {
    return labels.every(label => issueLabels.some(issueLabel => utils.wildcardMatch(label, issueLabel)))
}

export function skipForIssue(ctx: Context<any>, config: Config) {
    const branchConfig = getIssueBranchConfig(ctx, config)
    if (branchConfig) {
        return branchConfig.skip === true
    } else {
        return false
    }
}

export function skipBranchCreationForIssue(ctx: Context<any>, config: Config) {
    const branchConfig = getIssueBranchConfig(ctx, config)
    if (branchConfig) {
        return branchConfig.skipBranch === true
    } else {
        return false
    }
}

export async function addComment(ctx: Context<any>, config: Config, comment: string) {
    if (!config.silent) {
        const params = ctx.issue({body: comment})
        try {
            await ctx.octokit.issues.createComment(params)
        } catch (e) {
            console.info('Creating comment failed, retrying in 1 second')
            await utils.sleep(1000)
            try {
                await ctx.octokit.issues.createComment(params)
            } catch (e) {
                console.error('Creating comment failed')
            }
        }
    }
}

export async function branchExists(ctx: Context<any>, branchName: string) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    try {
        await ctx.octokit.git.getRef({
            owner: owner, repo: repo, ref: `heads/${branchName}`
        })
        return true
    } catch (err) {
        return false
    }
}

export function getSourceBranch(ctx: Context<any>, config: Config) {
    const branchConfig = getIssueBranchConfig(ctx, config)
    if (branchConfig && branchConfig.name) {
        return branchConfig.name
    } else {
        return getDefaultBranch(ctx, config)
    }
}

function getPrTargetBranch(ctx: Context<any>, config: Config) {
    const branchConfig = getIssueBranchConfig(ctx, config)
    if (branchConfig && branchConfig.prTarget) {
        return branchConfig.prTarget
    } else if (branchConfig && branchConfig.name) {
        return branchConfig.name
    } else {
        return getDefaultBranch(ctx, config)
    }
}

async function getSourceBranchHeadSha(ctx: Context<any>, config: Config, log: any) {
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

function getDefaultBranch(ctx: Context<any>, config: Config) {
    return getDefaultBranchFromConfig(config) || getDefaultBranchFromContext(ctx);
}

async function getBranchHeadSha(ctx: Context<any>, branch: string) {
    try {
        const res = await ctx.octokit.git.getRef({
            owner: getRepoOwnerLogin(ctx), repo: getRepoName(ctx), ref: `heads/${branch}`
        })
        const ref = res.data.object
        return ref.sha
    } catch (e) {
        return undefined
    }
}

export async function createBranch(ctx: Context<any>, config: Config, branchName: string, sha: string, log: any) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    try {
        const res = await ctx.octokit.git.createRef({
            owner: owner, repo: repo, ref: `refs/heads/${branchName}`, sha: sha
        })
        log(`Branch created: ${branchName}`)
        if (utils.isRunningInGitHubActions()) {
            core.setOutput('branchName', branchName)
        }
        const commentMessage = interpolate(getCommentMessage(config), {...ctx.payload, branchName: branchName})
        await addComment(ctx, config, commentMessage)
        if (utils.isProduction()) {
            utils.pushMetric(owner, log)
        }
        return res
    } catch (e: any) {
        if (e.message === 'Reference already exists') {
            log.info('Could not create branch as it already exists')
        } else {
            await addComment(ctx, config, `Could not create branch \`${branchName}\` due to: ${e.message}`)
        }
    }
}

export async function createPr(app: Probot, ctx: Context<any>, config: Config, username: string, branchName: string) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const base = getPrTargetBranch(ctx, config)
    const title = getIssueTitle(ctx)
    const draft = config.openDraftPR;
    try {
        const baseHeadSha = await getBranchHeadSha(ctx, base)
        const branchHeadSha = await getBranchHeadSha(ctx, branchName)
        if (branchHeadSha === baseHeadSha) {
            app.log('Branch and base heads are equal, creating empty commit for PR')
            await createEmptyCommit(ctx, branchName, getCommitText(ctx, config), String(branchHeadSha))
        }
        const {data: pr} = await ctx.octokit.pulls.create(
            {owner, repo, head: branchName, base, title, body: getPrBody(app, ctx, config), draft: draft})
        app.log(`${draft ? 'Created draft' : 'Created'} pull request ${pr.number} for branch ${branchName}`)
        await copyIssueAttributesToPr(app, ctx, config, pr)
    } catch (e: any) {
        app.log(`Could not create PR (${e.message})`)
        await addComment(ctx, config, `Could not create PR (${e.message})`)
    }
}

async function createEmptyCommit(ctx: Context<any>, branchName: string, message: string, headSha: string) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const createEptyCommitMutation = `
  mutation($repositoryNameWithOwner: String!, $branchName: String!, $message: String!, $headSha: GitObjectID!)  {
    createCommitOnBranch(
        input: {
          branch: {repositoryNameWithOwner: $repositoryNameWithOwner, branchName: $branchName},
          message: {headline: $message},
          fileChanges: {},
          expectedHeadOid: $headSha
        }
    ) {
      commit {
        url
      }
    }
  }`
    await ctx.octokit.graphql(createEptyCommitMutation, {
        repositoryNameWithOwner: `${owner}/${repo}`, branchName: branchName, message: message, headSha: headSha
    })
}

function getCommitText(ctx: Context<any>, config: Config) {
    const draft = config.openDraftPR;
    const draftText = draft ? 'draft ' : ''
    const issueNumber = getIssueNumber(ctx)
    const text = `Create ${draftText}PR for #${issueNumber}`
    if (prSkipCI(config)) {
        return text + '\n[skip ci]'
    } else {
        return text
    }
}

function getPrBody(app: Probot, ctx: Context<any>, config: Config) {
    const issueNumber = getIssueNumber(ctx)
    let result = ''
    if (config.copyIssueDescriptionToPR) {
        app.log('Copying issue description to PR')
        const issueDescription = getIssueDescription(ctx)
        if (issueDescription) {
            result += utils.formatAsExpandingMarkdown('Original issue description', issueDescription)
            result += '\n'
        }
    }
    result += `closes #${issueNumber}`
    return result
}

async function copyIssueAttributesToPr(app: Probot, ctx: Context<any>, config: Config, pr: any) {
    try {
        if (config.copyIssueLabelsToPR) {
            app.log('Copying issue labels to PR')
            await copyIssueLabelsToPr(ctx, pr)
        }
        if (config.copyIssueAssigneeToPR) {
            app.log('Copying issue assignee to PR')
            await copyIssueAssigneeToPr(ctx, pr)
        }
        if (config.copyIssueProjectsToPR) {
            app.log('Copying issue projects to PR')
            await copyIssueProjectsToPr(ctx, pr)
        }
        if (config.copyIssueMilestoneToPR) {
            app.log('Copying issue milestone to PR')
            await copyIssueMilestoneToPr(ctx, pr)
        }
    } catch (e: any) {
        app.log(`Could not copy issue attributes (${e.message})`)
        await addComment(ctx, config, `Could not copy issue attributes (${e.message})`)
    }
}

async function copyIssueLabelsToPr(ctx: Context<any>, pr: any) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const labels = getIssueLabels(ctx)
    if (labels.length > 0) {
        await ctx.octokit.issues.addLabels({owner, repo, issue_number: pr.number, labels})
    }
}

async function copyIssueAssigneeToPr(ctx: Context<any>, pr: any) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const assignee = getAssignee(ctx)
    await ctx.octokit.issues.addAssignees({owner, repo, issue_number: pr.number, assignees: [assignee]})
}

async function copyIssueMilestoneToPr(ctx: Context<any>, pr: any) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const number = getMilestoneNumber(ctx)
    if (number) {
        await ctx.octokit.issues.update({owner, repo, issue_number: pr.number, milestone: number})
    }
}

async function copyIssueProjectsToPr(ctx: Context<any>, pr: any) {
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

async function queryProjectIdsForIssue(ctx: Context<any>) {
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
    const queryResult: any = await ctx.octokit.graphql(queryProjectIds, {
        owner: getRepoOwnerLogin(ctx), repo: getRepoName(ctx), number: getIssueNumber(ctx)
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

export async function updatePrTitle(app: Probot, ctx: Context<any>, config: Config, pr: any, issueTitle: string, labels: Array<string>) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const pullNumber = pr.number
    const conventionalPrefix = getConventionalPrTitlePrefix(config, labels)
    const updatedTitle = conventionalPrefix + ' ' + issueTitle
    if (updatedTitle !== pr.title) {
        app.log.info(`Updating prefix for PR #${pullNumber} in ${owner}/${repo} to: ${conventionalPrefix}`)
        await ctx.octokit.pulls.update({owner: owner, repo: repo, pull_number: pullNumber, title: updatedTitle})
    }
}

export async function updatePrBody(app: Probot, ctx: Context<any>, config: Config, pr: any, body: any) {
    const owner = getRepoOwnerLogin(ctx)
    const repo = getRepoName(ctx)
    const pullNumber = pr.number
    app.log.info(`Updating body for PR #${pullNumber} in ${owner}/${repo}`)
    await ctx.octokit.pulls.update({owner: owner, repo: repo, pull_number: pullNumber, body: body})
}