function getRepoOwnerLogin (ctx) {
  return ctx.payload.repository.owner.login
}

function getRepoOwnerId (ctx) {
  return ctx.payload.repository.owner.id
}

function getRepoName (ctx) {
  return ctx.payload.repository.name
}

function getIssueNumber (ctx) {
  return ctx.payload.issue.number
}

function getIssueDescription (ctx) {
  return ctx.payload.issue.body
}

function getIssueTitle (ctx) {
  return ctx.payload.issue.title
}

function getDefaultBranch (ctx) {
  return ctx.payload.repository.default_branch
}

function isPrivateOrgRepo (ctx) {
  const { repository } = ctx.payload
  return repository.private && repository.owner.type === 'Organization'
}

function getIssueLabels (ctx) {
  const labels = ctx.payload.issue.labels
  return labels.map(l => ({ name: l.name }))
}

function getIssueLabelsForMatching (ctx) {
  const labels = ctx.payload.issue.labels.map(l => l.name)
  if (labels.length === 0) {
    return ['']
  } else {
    return labels
  }
}

function getAssignee (ctx) {
  const { payload } = ctx
  const { issue } = payload
  if (issue.assignee) {
    return issue.assignee.login
  }
  if (issue.assignees && issue.assignees.length > 0) {
    return issue.assignees[0].login
  }
  if (payload.assignee) {
    return payload.assignee.login
  }
  if (payload.assignees && issue.assignees.length > 0) {
    return payload.assignees[0].login
  }
}

function getSender (ctx) {
  return ctx.payload.sender.login
}

module.exports = {
  getRepoOwnerLogin: getRepoOwnerLogin,
  getRepoOwnerId: getRepoOwnerId,
  getRepoName: getRepoName,
  isPrivateOrgRepo: isPrivateOrgRepo,
  getIssueDescription: getIssueDescription,
  getIssueNumber: getIssueNumber,
  getIssueTitle: getIssueTitle,
  getDefaultBranch: getDefaultBranch,
  getIssueLabels: getIssueLabels,
  getIssueLabelsForMatching: getIssueLabelsForMatching,
  getAssignee: getAssignee,
  getSender: getSender
}
