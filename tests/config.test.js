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

test('conventional PR titles', () => {
  expect(Config.conventionalPrTitles({})).toBeFalsy()
  expect(Config.conventionalPrTitles({ conventionalPrTitles: true })).toBeTruthy()
  expect(Config.conventionalPrTitles({ conventionalPrTitles: false })).toBeFalsy()
})

test('get PR title prefix for issue label', () => {
  expect(Config.getConventionalPrTitlePrefix({}, ['bug'])).toBe('fix: 🐛')
  expect(Config.getConventionalPrTitlePrefix({}, ['some-user-defined-label'])).toBe('feat: ✨')

  expect(Config.getConventionalPrTitlePrefix({ conventionalLabels: { fix: { bug: '🚑' } } }, ['bug']))
    .toBe('fix: 🚑')
})

test('get PR title prefix for issue label semver style', () => {
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'semver' }, ['bug'])).toBe('fix: 🐛')
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'semver' }, ['some-user-defined-label']))
    .toBe('feat: ✨')
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'semver' }, ['bug'])).toBe('fix: 🐛')

  expect(Config.getConventionalPrTitlePrefix(
    { conventionalStyle: 'semver', conventionalLabels: { fix: { bug: ':ambulance:' } } }, ['bug']))
    .toBe('fix: :ambulance:')
})

test('get PR title prefix for issue label semver-no-gitmoji style', () => {
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'semver-no-gitmoji' }, ['bug'])).toBe('fix:')
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'semver-no-gitmoji' }, ['some-user-defined-label']))
    .toBe('feat:')
  expect(Config.getConventionalPrTitlePrefix(
    { conventionalStyle: 'semver-no-gitmoji', conventionalLabels: { fix: { bug: ':ambulance:' } } }, ['bug']))
    .toBe('fix:')
})

test('get PR title prefix for issue label gitmoji style', () => {
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'gitmoji' }, ['bug'])).toBe('🐛')
  expect(Config.getConventionalPrTitlePrefix({ conventionalStyle: 'gitmoji' }, ['some-user-defined-label']))
    .toBe('✨')
  expect(Config.getConventionalPrTitlePrefix(
    { conventionalStyle: 'gitmoji', conventionalLabels: { fix: { bug: ':ambulance:' } } }, ['bug']))
    .toBe(':ambulance:')
})

test('Conventional PR style', () => {
  expect(Config.conventionalStyle({})).toBe('semver')
  expect(Config.conventionalStyle({ conventionalStyle: 'gitmoji' })).toBe('gitmoji')
})

test('get default conventional label mapping', () => {
  const defaultMapping = Config.getConventionalLabelMapping({})
  expect(defaultMapping.enhancement).toBeDefined()
  expect(defaultMapping.enhancement.prefix).toBe('feat')
  expect(defaultMapping.enhancement.emoji).toBe('✨')
  expect(defaultMapping.enhancement.breaking).toBeFalsy()
  expect(defaultMapping.bug.prefix).toBe('fix')
  expect(defaultMapping.bug.emoji).toBe('🐛')
  expect(defaultMapping.bug.breaking).toBeFalsy()
  expect(defaultMapping['breaking-change'].prefix).toBe('feat')
  expect(defaultMapping['breaking-change'].breaking).toBeTruthy()
})

test('get custom conventional label mapping', () => {
  const mapping = Config.getConventionalLabelMapping({
    conventionalLabels: {
      fix: { bug: ':ambulance:' }, foo: { bar: ':ghost:' }, bar: { foo: ':foo:', breaking: true }
    }
  })
  expect(mapping.bug.prefix).toBe('fix')
  expect(mapping.bug.emoji).toBe(':ambulance:')
  expect(mapping.bar.prefix).toBe('foo')
  expect(mapping.bar.emoji).toBe(':ghost:')
  expect(mapping.bar.breaking).toBeFalsy()
  expect(mapping.foo.prefix).toBe('bar')
  expect(mapping.foo.emoji).toBe(':foo:')
  expect(mapping.foo.breaking).toBeTruthy()
})

test('support both features and feat', () => {
  const mapping = Config.getConventionalLabelMapping({
    conventionalLabels: {
      feat: { foo: ':ghost:' }, features: { bar: ':bar:' }
    }
  })
  expect(mapping.foo.prefix).toBe('feat')
  expect(mapping.bar.prefix).toBe('feat')
})
