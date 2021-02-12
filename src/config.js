/**
 * The code in this file was inspired by (but heavily modified): https://github.com/tcbyrd/probot-report-error
 */

const issueTitle = 'Error in Create Issue Branch app configuration'

async function findConfigurationErrorIssue (ctx) {
  const fullName = ctx.payload.repository.full_name
  const result = await ctx.octokit.search.issuesAndPullRequests(
    { q: `${issueTitle} repo:${fullName} in:title type:issue state:open` })
  return result.data.items
}

async function createConfigurationErrorIssue (ctx, err) {
  const errorBody = (err) => {
    return `
  Error in app configuration:
  \`\`\`
  ${err}
  \`\`\`
  Please check the syntax of your \`.issue-branch.yml\`
`
  }
  return ctx.octokit.issues.create(ctx.repo({
    title: issueTitle, body: errorBody(err)
  }))
}

async function handleError (ctx, err) {
  ctx.log(`Error in app configuration: ${err}`)
  const issues = await findConfigurationErrorIssue(ctx)
  if (issues.length > 0) {
    ctx.log(`Error issue already exists for repo: ${ctx.payload.repository.full_name}`)
  } else {
    return createConfigurationErrorIssue(ctx, err)
  }
}

async function load (ctx) {
  try {
    let result = await ctx.config('issue-branch.yml')
    if (!result) {
      result = await ctx.config('issue-branch.yaml', {})
    }
    if (result.branches) {
      for (const branchConfiguration of result.branches) {
        if (!branchConfiguration.label) {
          await handleError(ctx, `Branch configuration is missing label: ${JSON.stringify(branchConfiguration)}`)
          return undefined
        }
      }
    }
    return result
  } catch (e) {
    await handleError(ctx, `Exception while parsing configuration YAML: ${e.message}`)
    return undefined
  }
}

function isModeAuto (config) {
  return (config && !isModeChatOps(config))
}

function isModeChatOps (config) {
  return (config && config.mode && config.mode === 'chatops')
}

function isExperimentalBranchNameArgument (config) {
  return (config && config.experimental && config.experimental.branchNameArgument &&
    config.experimental.branchNameArgument === true)
}

function autoCloseIssue (config) {
  return 'autoCloseIssue' in config && config.autoCloseIssue === true
}

function isSilent (config) {
  return 'silent' in config && config.silent === true
}

function shouldOpenDraftPR (config) {
  return 'openDraftPR' in config && config.openDraftPR === true
}

function shouldOpenPR (config) {
  return ('openPR' in config && config.openPR === true) || shouldOpenDraftPR(config)
}

function isChatOpsCommand (s) {
  if (s) {
    const parts = s.trim().toLowerCase().split(/\s/)
    return ['/create-issue-branch', '/cib'].includes(parts[0])
  } else {
    return false
  }
}

function getChatOpsCommandArgument (s) {
  const argumentIndex = s.trim().search(/\s/)
  if (argumentIndex > 0) {
    return s.substring(argumentIndex + 1)
  } else {
    return undefined
  }
}

function getGitSafeReplacementChar (config) {
  return config.gitSafeReplacementChar ? config.gitSafeReplacementChar : '_'
}

function getCommentMessage (config) {
  if (config && config.commentMessage) {
    return config.commentMessage
  } else {
    // eslint-disable-next-line no-template-curly-in-string
    return 'Branch [${branchName}](${repository.html_url}/tree/${branchName}) created!'
  }
}

module.exports = {
  load: load,
  isModeAuto: isModeAuto,
  isModeChatOps: isModeChatOps,
  getChatOpsCommandArgument: getChatOpsCommandArgument,
  autoCloseIssue: autoCloseIssue,
  isSilent: isSilent,
  isChatOpsCommand: isChatOpsCommand,
  isExperimentalBranchNameArgument: isExperimentalBranchNameArgument,
  getGitSafeReplacementChar: getGitSafeReplacementChar,
  shouldOpenPR: shouldOpenPR,
  shouldOpenDraftPR: shouldOpenDraftPR,
  getCommentMessage: getCommentMessage
}
