const Config = require('../src/config')

test('is ChatOps command', () => {
  expect(Config.isChatOpsCommand('/create-issue-branch')).toBeTruthy()
  expect(Config.isChatOpsCommand('/Create-Issue-Branch')).toBeTruthy()
  expect(Config.isChatOpsCommand('/create-issue-branch  ')).toBeTruthy()
  expect(Config.isChatOpsCommand('  /create-issue-branch  ')).toBeTruthy()
  expect(Config.isChatOpsCommand('/cib')).toBeTruthy()
  expect(Config.isChatOpsCommand('/create-issue-branch Simple NPE fix')).toBeTruthy()
  expect(Config.isChatOpsCommand('/cib Simple NPE fix')).toBeTruthy()

  expect(Config.isChatOpsCommand('/create-branch  ')).toBeFalsy()
  expect(Config.isChatOpsCommand(' /cb')).toBeFalsy()
  expect(Config.isChatOpsCommand(' / cb')).toBeFalsy()
  expect(Config.isChatOpsCommand('/createbranch')).toBeFalsy()
  expect(Config.isChatOpsCommand('/create-issue')).toBeFalsy()
  expect(Config.isChatOpsCommand(null)).toBeFalsy()
  expect(Config.isChatOpsCommand(undefined)).toBeFalsy()
})

test('get ChatOps command argument', () => {
  expect(Config.getChatOpsCommandArgument('/cib')).toBeUndefined()
  expect(Config.getChatOpsCommandArgument('/cib   ')).toBeUndefined()
  expect(Config.getChatOpsCommandArgument('/cib Fix NPE bug')).toBe('Fix NPE bug')
  expect(Config.getChatOpsCommandArgument('/cib Hello')).toBe('Hello')
})

test('is mode ChatOps', () => {
  expect(Config.isModeChatOps(undefined)).toBeFalsy()
  expect(Config.isModeChatOps({ mode: 'auto' })).toBeFalsy()
  expect(Config.isModeChatOps({ mode: 'chatops' })).toBeTruthy()
})

test('is mode auto', () => {
  expect(Config.isModeAuto(undefined)).toBeFalsy()
  expect(Config.isModeAuto({ mode: 'auto' })).toBeTruthy()
  expect(Config.isModeAuto({ mode: 'chatops' })).toBeFalsy()
})

test('experimental feature flag', () => {
  expect(Config.isExperimentalBranchNameArgument(undefined)).toBeFalsy()
  expect(Config.isExperimentalBranchNameArgument({ experimental: { branchNameArgument: false } })).toBeFalsy()
  expect(Config.isExperimentalBranchNameArgument({ experimental: { branchNameArgument: true } })).toBeTruthy()
})

test('get Git replace chars', () => {
  expect(Config.getGitReplaceChars({})).toBe('')
  expect(Config.getGitReplaceChars({ gitReplaceChars: 'abcd' })).toBe('abcd')
})

test('get Git safe replacement char', () => {
  expect(Config.getGitSafeReplacementChar({})).toBe('_')
  expect(Config.getGitSafeReplacementChar({ gitSafeReplacementChar: '-' })).toBe('-')
})

test('open (draft) PR after creating an issue', () => {
  expect(Config.shouldOpenPR({})).toBeFalsy()
  expect(Config.shouldOpenPR({ openPR: true })).toBeTruthy()
  expect(Config.shouldOpenPR({ openDraftPR: true })).toBeTruthy()
  expect(Config.shouldOpenDraftPR({})).toBeFalsy()
  expect(Config.shouldOpenDraftPR({ openPR: true })).toBeFalsy()
  expect(Config.shouldOpenDraftPR({ openDraftPR: true })).toBeTruthy()
  expect(Config.shouldOpenDraftPR({ openPR: true, openDraftPR: true })).toBeTruthy()
})

test('get comment message', () => {
  expect(Config.getCommentMessage({})).toBeDefined()
  expect(Config.getCommentMessage({ commentMessage: 'hello world' })).toBe('hello world')
  // eslint-disable-next-line no-template-curly-in-string
  expect(Config.getCommentMessage({ commentMessage: 'hello ${branchName}' })).toBe('hello ${branchName}')
})

test('get default branch', () => {
  expect(Config.getDefaultBranch({})).toBeUndefined()
  expect(Config.getDefaultBranch({ defaultBranch: 'main' })).toBe('main')
})

test('copy issue description, labels and assignee to PR', () => {
  expect(Config.copyIssueDescriptionToPR({})).toBeFalsy()
  expect(Config.copyIssueDescriptionToPR({ copyIssueDescriptionToPR: true })).toBeTruthy()
  expect(Config.copyIssueLabelsToPR({})).toBeFalsy()
  expect(Config.copyIssueLabelsToPR({ copyIssueLabelsToPR: true })).toBeTruthy()
  expect(Config.copyIssueAssigneeToPR({})).toBeFalsy()
  expect(Config.copyIssueAssigneeToPR({ copyIssueAssigneeToPR: true })).toBeTruthy()
  expect(Config.copyIssueProjectsToPR({})).toBeFalsy()
  expect(Config.copyIssueProjectsToPR({ copyIssueProjectsToPR: true })).toBeTruthy()
  expect(Config.copyIssueMilestoneToPR({})).toBeFalsy()
  expect(Config.copyIssueMilestoneToPR({ copyIssueMilestoneToPR: true })).toBeTruthy()
})

test('PR skip CI', () => {
  expect(Config.prSkipCI({})).toBeFalsy()
  expect(Config.prSkipCI({ prSkipCI: true })).toBeTruthy()
})

test('get PR title prefix for issue label', () => {
  expect(Config.getPrTitlePrefix({}, 'bug')).toBe('fix: :bug:')
  expect(Config.getPrTitlePrefix({}, 'some-user-defined-label')).toBe('feat: :sparkles:')

  expect(Config.getPrTitlePrefix({ prTitlePrefix: { bug: 'fix: :ambulance:' } }, 'bug')).toBe('fix: :ambulance:')
})
