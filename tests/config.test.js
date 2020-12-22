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

test('get Git safe replacement char', () => {
  expect(Config.getGitSafeReplacementChar({})).toBe('_')
  expect(Config.getGitSafeReplacementChar({ gitSafeReplacementChar: '-' })).toBe('-')
})

test('open draft PR after creating an issue', () => {
  expect(Config.shouldOpenDraftPR({})).toBeFalsy()
  expect(Config.shouldOpenDraftPR({ openDraftPR: true })).toBeTruthy()
})
