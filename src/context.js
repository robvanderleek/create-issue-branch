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

function getIssueLabels (ctx) {
  const labels = ctx.payload.issue.labels.map(l => l.name)
  if (labels.length === 0) {
    return ['']
  } else {
    return labels
  }
}

module.exports = {
  getRepoOwner: getRepoOwner,
  getRepoName: getRepoName,
  getRepoUrl: getRepoUrl,
  getIssueNumber: getIssueNumber,
  getIssueTitle: getIssueTitle,
  getDefaultBranch: getDefaultBranch,
  getIssueLabels: getIssueLabels
}
