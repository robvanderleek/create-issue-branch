import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import issueOpenedPayload from "./test-fixtures/issues.opened.json";
import issueCommentCreatedPayload from "./test-fixtures/issue_comment.created.json";
import {
    getAssignee,
    getIssueDescription,
    getIssueLabels,
    getMilestoneNumber,
    getRepoOwnerLogin,
    getSender
} from "../src/context";

test('get owner', () => {
    const ctx = {payload: issueAssignedPayload}

    expect(getRepoOwnerLogin(ctx)).toBe('robvanderleek')
})

test('get assignee', () => {
    const ctx = {payload: issueAssignedPayload}

    expect(getAssignee(ctx)).toBe('robvanderleek')
})

test('get assignee from event', () => {
    const ctx = {payload: issueAssignedPayload}
    ctx.payload.issue.assignees = []

    expect(getAssignee(ctx)).toBe('robvanderleek')
})

test('get sender', () => {
    const ctx = {payload: issueCommentCreatedPayload}

    expect(getSender(ctx)).toBe('robvanderleek')
})

test('get Issue description', () => {
    const ctx = {payload: issueOpenedPayload}

    expect(getIssueDescription(ctx)).toBe('/cib')
})

test('get Issue labels', () => {
    const ctx = {payload: issueOpenedPayload}
    // @ts-ignore
    ctx.payload.issue.labels = [{name: 'enhancement'}, {name: 'pinned'}]
    expect(getIssueLabels(ctx)).toStrictEqual(['enhancement', 'pinned'])
})

test('get Issue milestone number', () => {
    const issueAssignedContext = {payload: issueAssignedPayload}

    expect(getMilestoneNumber(issueAssignedContext)).toBeUndefined()

    const issueOpenedContext = {payload: issueOpenedPayload}

    expect(getMilestoneNumber(issueOpenedContext)).toBe(1)
})
