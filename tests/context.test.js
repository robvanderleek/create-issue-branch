const context = require('../src/context')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const issueCommentCreatedPayload = require('./test-fixtures/issue_comment.created.json')

test('get owner', () => {
  const ctx = { payload: issueAssignedPayload }

  expect(context.getRepoOwnerLogin(ctx)).toBe('robvanderleek')
})

test('get assignee', () => {
  const ctx = { payload: issueAssignedPayload }

  expect(context.getAssignee(ctx)).toBe('robvanderleek')
})

test('get sender', () => {
  const ctx = { payload: issueCommentCreatedPayload }

  expect(context.getSender(ctx)).toBe('robvanderleek')
})

test('is private Org repo', () => {
  expect(context.isPrivateOrgRepo({ payload: issueAssignedPayload })).toBeFalsy()

  const payloadCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
  payloadCopy.repository.private = true

  expect(context.isPrivateOrgRepo({ payload: payloadCopy })).toBeFalsy()

  payloadCopy.repository.owner.type = 'Organization'

  expect(context.isPrivateOrgRepo({ payload: payloadCopy })).toBeTruthy()
})
