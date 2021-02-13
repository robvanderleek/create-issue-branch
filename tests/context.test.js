const context = require('../src/context')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const issueCommentCreatedPayload = require('./test-fixtures/issue_comment.created.json')

test('get owner', () => {
  const ctx = { payload: issueAssignedPayload }

  expect(context.getRepoOwner(ctx)).toBe('robvanderleek')
})

test('get assignee', () => {
  const ctx = { payload: issueAssignedPayload }

  expect(context.getAssignee(ctx)).toBe('robvanderleek')
})

test('get sender', () => {
  const ctx = { payload: issueCommentCreatedPayload }

  expect(context.getSender(ctx)).toBe('robvanderleek')
})
