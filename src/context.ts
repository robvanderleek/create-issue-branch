export function getRepoOwnerLogin(ctx: any): string {
    return ctx.payload.repository.owner.login
}

export function getRepoOwnerId(ctx: any) {
    return ctx.payload.repository.owner.id
}

export function getRepoName(ctx: any): string {
    return ctx.payload.repository.name
}

export function getIssueNumber(ctx: any) {
    return ctx.payload.issue.number
}

export function getIssueDescription(ctx: any) {
    return ctx.payload.issue.body
}

export function getIssueTitle(ctx: any) {
    return ctx.payload.issue.title
}

export function getDefaultBranch(ctx: any) {
    return ctx.payload.repository.default_branch
}

export function getIssueLabels(ctx: any) {
    const labels = ctx.payload.issue.labels
    return labels.map((l: { name: string }) => l.name)
}

export function getIssueLabelsForMatching(ctx: any) {
    const labels = ctx.payload.issue.labels.map((l: { name: string }) => l.name)
    if (labels.length === 0) {
        return ['']
    } else {
        return labels
    }
}

export function getAssignee(ctx: any) {
    const {payload} = ctx
    const {issue} = payload
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

export function getSender(ctx: any) {
    return ctx.payload.sender.login
}

export function getMilestoneNumber(ctx: any) {
    const {payload} = ctx
    const {issue} = payload
    if (issue.milestone) {
        return issue.milestone.number
    }
}