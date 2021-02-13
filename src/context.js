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

function getAssignee (ctx) {
  const assignee = ctx.payload.issue.assignee
  if (assignee) {
    return assignee.login
  }
  const assignees = ctx.payload.issue.assignees
  if (assignees) {
    return assignees[0].login
  }
}

function getSender (ctx) {
  return ctx.payload.sender.login
}

module.exports = {
  getRepoOwner: getRepoOwner,
  getRepoName: getRepoName,
  getRepoUrl: getRepoUrl,
  getIssueNumber: getIssueNumber,
  getIssueTitle: getIssueTitle,
  getDefaultBranch: getDefaultBranch,
  getIssueLabels: getIssueLabels,
  getAssignee: getAssignee,
  getSender: getSender
}
