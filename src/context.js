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

module.exports.getRepoOwner = getRepoOwner
module.exports.getRepoName = getRepoName
module.exports.getRepoUrl = getRepoUrl
module.exports.getIssueNumber = getIssueNumber
module.exports.getIssueTitle = getIssueTitle
module.exports.getDefaultBranch = getDefaultBranch
module.exports.getIssueLabels = getIssueLabels
