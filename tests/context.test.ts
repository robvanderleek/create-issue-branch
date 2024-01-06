import context from "../src/context";
import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import issueOpenedPayload from "./test-fixtures/issues.opened.json";
import issueCommentCreatedPayload from "./test-fixtures/issue_comment.created.json";

test('get owner', () => {
    const ctx = {payload: issueAssignedPayload}

    expect(context.getRepoOwnerLogin(ctx)).toBe('robvanderleek')
})

test('get assignee', () => {
    const ctx = {payload: issueAssignedPayload}

    expect(context.getAssignee(ctx)).toBe('robvanderleek')
})

test('get assignee from event', () => {
    const ctx = {payload: issueAssignedPayload}
    ctx.payload.issue.assignees = []

    expect(context.getAssignee(ctx)).toBe('robvanderleek')
})

test('get sender', () => {
    const ctx = {payload: issueCommentCreatedPayload}

    expect(context.getSender(ctx)).toBe('robvanderleek')
})

test('is private Org repo', () => {
    expect(context.isPrivateOrgRepo({payload: issueAssignedPayload})).toBeFalsy()

    const payloadCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
    payloadCopy.repository.private = true

    expect(context.isPrivateOrgRepo({payload: payloadCopy})).toBeFalsy()

    payloadCopy.repository.owner.type = 'Organization'

    expect(context.isPrivateOrgRepo({payload: payloadCopy})).toBeTruthy()
})

test('get Issue description', () => {
    const ctx = {payload: issueOpenedPayload}

    expect(context.getIssueDescription(ctx)).toBe('/cib')
})

test('get Issue labels', () => {
    const ctx = {payload: issueOpenedPayload}
    // @ts-ignore
    ctx.payload.issue.labels = [{name: 'enhancement'}, {name: 'pinned'}]
    expect(context.getIssueLabels(ctx)).toStrictEqual(['enhancement', 'pinned'])
})

test('get Issue milestone number', () => {
    const issueAssignedContext = {payload: issueAssignedPayload}

    expect(context.getMilestoneNumber(issueAssignedContext)).toBeUndefined()

    const issueOpenedContext = {payload: issueOpenedPayload}

    expect(context.getMilestoneNumber(issueOpenedContext)).toBe(1)
})
