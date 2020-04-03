/**
 * The code in this file was inspired by (but heavily modified): https://github.com/tcbyrd/probot-report-error
 */

const issueTitle = 'Error in Create Issue Branch app configuration'

async function findConfigurationErrorIssue (ctx) {
  const fullName = ctx.payload.repository.full_name
  const result = await ctx.github.search.issuesAndPullRequests(
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
  return ctx.github.issues.create(ctx.repo({
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
  const result = await ctx.config('issue-branch.yml', {})
  if (result.branches) {
    for (const branchConfiguration of result.branches) {
      if (!branchConfiguration.label) {
        await handleError(ctx, `Branch configuration is missing label: ${JSON.stringify(branchConfiguration)}`)
        return undefined
      }
    }
  }
  return result
}

function isModeAuto (config) {
  return !isModeChatOps(config)
}

function isModeChatOps (config) {
  return (config.mode && config.mode === 'chatops')
}

module.exports.load = load
module.exports.isModeAuto = isModeAuto
module.exports.isModeChatOps = isModeChatOps
