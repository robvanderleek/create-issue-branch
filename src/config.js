/**
 * The code in this block was inspired by (but heavily modified): https://github.com/tcbyrd/probot-report-error
 */
/* === */
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

/* === */

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
    process.exit(1)
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

function copyIssueDescriptionToPR (config) {
  return 'copyIssueDescriptionToPR' in config && config.copyIssueDescriptionToPR === true
}

function copyIssueLabelsToPR (config) {
  return 'copyIssueLabelsToPR' in config && config.copyIssueLabelsToPR === true
}

function copyIssueAssigneeToPR (config) {
  return 'copyIssueAssigneeToPR' in config && config.copyIssueAssigneeToPR === true
}

function copyIssueProjectsToPR (config) {
  return 'copyIssueProjectsToPR' in config && config.copyIssueProjectsToPR === true
}

function copyIssueMilestoneToPR (config) {
  return 'copyIssueMilestoneToPR' in config && config.copyIssueMilestoneToPR === true
}

function prSkipCI (config) {
  return 'prSkipCI' in config && config.prSkipCI === true
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

function getGitReplaceChars (config) {
  return config.gitReplaceChars ? config.gitReplaceChars : ''
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

function getDefaultBranch (config) {
  if (config && config.defaultBranch) {
    return config.defaultBranch
  } else {
    return undefined
  }
}

function conventionalPrTitles (config) {
  return 'conventionalPrTitles' in config && config.conventionalPrTitles === true
}

function conventionalStyle (config) {
  return config.conventionalStyle ? config.conventionalStyle : 'semver'
}

function getConventionalPrTitlePrefix (config, labels) {
  const mapping = getConventionalLabelMapping(config)
  const conventionalLabels = labels.filter(l => l in mapping)
  const featureLabels = conventionalLabels.filter(cl => cl.prefix === 'feat')
  const style = conventionalStyle(config)
  if (featureLabels.length > 0) {
    const emoji = mapping[featureLabels[0]].emoji
    if (style === 'semver') {
      return `feat${isBreakingPr(labels, mapping) ? '!' : ''}: ${emoji}`
    } else if (style === 'semver-no-gitmoji') {
      return `feat${isBreakingPr(labels, mapping) ? '!' : ''}:`
    } else {
      return emoji
    }
  } else if (conventionalLabels.length > 0) {
    const emoji = mapping[conventionalLabels[0]].emoji
    if (style === 'semver') {
      return `${mapping[conventionalLabels[0]].prefix}${isBreakingPr(labels, mapping) ? '!' : ''}: ${emoji}`
    } else if (style === 'semver-no-gitmoji') {
      return `${mapping[conventionalLabels[0]].prefix}${isBreakingPr(labels, mapping) ? '!' : ''}:`
    } else {
      return emoji
    }
  } else {
    if (style === 'semver') {
      return `feat${isBreakingPr(labels, mapping) ? '!' : ''}: ✨`
    } else if (style === 'semver-no-gitmoji') {
      return `feat${isBreakingPr(labels, mapping) ? '!' : ''}:`
    } else {
      return '✨'
    }
  }
}

function getConventionalLabelMapping (config) {
  const mapping = {
    bug: { prefix: 'fix', emoji: '🐛', breaking: false },
    dependencies: { prefix: 'fix', emoji: '⬆️', breaking: false },
    security: { prefix: 'fix', emoji: '🔒', breaking: false },
    enhancement: { prefix: 'feat', emoji: '✨', breaking: false },
    build: { prefix: 'build', emoji: '🔧', breaking: false },
    chore: { prefix: 'chore', emoji: '♻️', breaking: false },
    ci: { prefix: 'ci', emoji: '👷', breaking: false },
    documentation: { prefix: 'docs', emoji: '📝', breaking: false },
    style: { prefix: 'style', emoji: '💎', breaking: false },
    refactor: { prefix: 'refactor', emoji: '♻️', breaking: false },
    performance: { prefix: 'perf', emoji: '⚡️', breaking: false },
    test: { prefix: 'test', emoji: '✅' },
    'breaking-change': { prefix: 'feat', emoji: '💥', breaking: true },
    'breaking change': { prefix: 'feat', emoji: '💥', breaking: true }
  }
  if (config && config.conventionalLabels) {
    Object.keys(config.conventionalLabels).forEach(prefix => {
      Object.keys(config.conventionalLabels[prefix]).forEach(label => {
        const emoji = config.conventionalLabels[prefix][label]
        const breaking = config.conventionalLabels[prefix].breaking === true
        if (prefix === 'features') {
          prefix = 'feat'
        }
        mapping[label] = { prefix: prefix, emoji: emoji, breaking: breaking }
      })
    })
  }
  return mapping
}

function isBreakingPr (labels, mapping) {
  return labels.some(l => l in mapping && mapping[l].breaking)
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
  getGitReplaceChars: getGitReplaceChars,
  getGitSafeReplacementChar: getGitSafeReplacementChar,
  shouldOpenPR: shouldOpenPR,
  shouldOpenDraftPR: shouldOpenDraftPR,
  getCommentMessage: getCommentMessage,
  getDefaultBranch: getDefaultBranch,
  copyIssueDescriptionToPR: copyIssueDescriptionToPR,
  copyIssueLabelsToPR: copyIssueLabelsToPR,
  copyIssueAssigneeToPR: copyIssueAssigneeToPR,
  copyIssueProjectsToPR: copyIssueProjectsToPR,
  copyIssueMilestoneToPR: copyIssueMilestoneToPR,
  prSkipCI: prSkipCI,
  conventionalPrTitles: conventionalPrTitles,
  getConventionalPrTitlePrefix: getConventionalPrTitlePrefix,
  conventionalStyle: conventionalStyle,
  getConventionalLabelMapping: getConventionalLabelMapping
}
