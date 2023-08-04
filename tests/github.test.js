const github = require('../src/github')
const helpers = require('./test-helpers')
const { formatAsExpandingMarkdown } = require('../src/utils')

test('get issue number from branch name', () => {
  expect(github.getIssueNumberFromBranchName('i12')).toBe(12)
  expect(github.getIssueNumberFromBranchName('34-Fix_ugly_bug')).toBe(34)
  expect(github.getIssueNumberFromBranchName('bugfix/34-Fix_ugly_bug')).toBe(34)
  expect(github.getIssueNumberFromBranchName('issue-56')).toBe(56)
  expect(github.getIssueNumberFromBranchName('IsSuE-56')).toBe(56)
  expect(github.getIssueNumberFromBranchName('issue-78-Hello_world_this_is_a_test')).toBe(78)
  expect(github.getIssueNumberFromBranchName('some-prefix-issue-78-Add_more_unit_tests')).toBe(78)
  expect(github.getIssueNumberFromBranchName('feature/some-user/some-prefix-issue-78-Add_more_unit_tests'))
    .toBe(78)
  expect(github.getIssueNumberFromBranchName('issue-56/add-more-unit-tests')).toBe(56)
})

test('get branch name from issue', async () => {
  const ctx = { payload: { issue: { number: 12, title: 'Hello world', labels: [{ name: 'bug' }] } } }
  let config = { branchName: 'tiny' }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('i12')

  config = { branchName: 'short' }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('issue-12')

  config = { branchName: 'full' }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('issue-12-Hello_world')

  config = { branches: [{ label: 'bug', prefix: 'bug/' }] }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('bug/issue-12-Hello_world')

  config = { branches: [{ label: 'bug', prefix: 'Some bugs here/' }] }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('Some_bugs_here/issue-12-Hello_world')

  config = { branches: [{ label: 'bug', prefix: 'feature-2019-12-17T10:16:25Z' }] }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('feature-2019-12-17T10_16_25Zissue-12-Hello_world')

  config = { branches: [{ label: 'bug', prefix: 'feature\\' }] }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('feature_issue-12-Hello_world')

  // eslint-disable-next-line no-template-curly-in-string
  config = { branchName: '${issue.title}-${issue.number}' }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('Hello_world-12')

  // eslint-disable-next-line
  process.env['SOME_VAR'] = 'Hello world'
  // eslint-disable-next-line no-template-curly-in-string
  config = { branchName: '${issue.number}-${%SOME_VAR}' }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('12-Hello_world')
})

test('get branch name from issue, reported issues', async () => {
  const ctx = { payload: { issue: { number: 12, title: 'Hello world', labels: [{ name: 'bug' }] } } }
  const config = { branchName: 'full' }

  ctx.payload.issue.title = '"Error: Mysqli statement execute error : Cannot add or update a child row: a ' +
    'foreign key constraint fails (`omeka`.`omeka_super_eight_festivals_filmmaker_films`, CONSTRAINT ' +
    '`omeka_super_eight_festivals_filmmaker_films_ibfk_1` FOREIGN KEY (`filmmaker_id`) REFERENCES ' +
    '`omeka_super_eight_festivals_peop)" when adding filmmaker film #20'
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe(
    'issue-12-_Error_Mysqli_statement_execute_error_Cannot_add_or_update_a_child_row_a_foreign_key_constraint_fails' +
    '_omeka_omeka_super_eight_festivals_filmmaker_films_CONSTRAINT_omeka_super_eight_festivals_filmmaker_films_' +
    'ibfk_1_FOREIGN_KEY_filmmake')

  ctx.payload.issue.title = '全是中文的名字'
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('issue-12-全是中文的名字')

  ctx.payload.issue.title = '半中文half english'
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('issue-12-半中文half_english')
})

test('get branch configuration for issue', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const branchConfig = github.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeDefined()
  expect(branchConfig.prefix).toBe('feature/')
})

test('get branch configuration with multiple labels for issue', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }, { name: 'documentation' }] } } }
  const config = {
    branches: [{ label: ['enhancement', 'documentation'], prefix: 'docs/' },
      { label: 'enhancement', prefix: 'feature/' }]
  }
  const branchConfig = github.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeDefined()
  expect(branchConfig.prefix).toBe('docs/')
})

test('get skip is true branch configuration for issue', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'question' }] } } }
  const config = { branches: [{ label: 'question', skip: true }] }
  const branchConfig = github.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeDefined()
  expect(branchConfig.skip).toBe(true)
})

test('skip branch creation for issue', () => {
  const questionIssue = { payload: { issue: { labels: [{ name: 'question' }] } } }
  const bugIssue = { payload: { issue: { labels: [{ name: 'bug' }] } } }
  const config = { branches: [{ label: 'question', skip: true }] }
  expect(github.skipForIssue(questionIssue, config)).toBe(true)
  expect(github.skipForIssue(bugIssue, config)).toBe(false)
})

test('get branch configuration for issue with all matching wildcard fallthrough', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'mylabel' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }, { label: '*', prefix: 'issues/' }] }
  const branchConfig = github.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeDefined()
  expect(branchConfig.prefix).toBe('issues/')
})

test('issue has no branch configuration', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'bug' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const branchConfig = github.getIssueBranchConfig(ctx, config)
  expect(branchConfig).toBeUndefined()
})

test('get issue branch prefix', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const prefix = github.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('feature/')
})

test('get issue branch prefix for issue that has no branch configuration', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'bug' }] } } }
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  const prefix = github.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('')
})

test('get issue branch prefix with context expression interpolation', () => {
  const ctx = { payload: { issue: { labels: [{ name: 'enhancement' }], user: { login: 'robvanderleek' } } } }
  // eslint-disable-next-line no-template-curly-in-string
  const config = { branches: [{ label: 'enhancement', prefix: 'feature/${issue.user.login}/' }] }
  const prefix = github.getIssueBranchPrefix(ctx, config)
  expect(prefix).toBe('feature/robvanderleek/')
})

test('get branch name from issue with only branch prefix configured', async () => {
  const ctx = { payload: { issue: { number: 12, title: 'Hello world', labels: [{ name: 'enhancement' }] } } }
  const config = { branchName: 'short', branches: [{ label: 'enhancement', prefix: 'feature/' }] }
  expect(await github.getBranchNameFromIssue(ctx, config)).toBe('feature/issue-12')
})

test('handle branch already exist, log message to info level', async () => {
  const createRef = () => {
    // eslint-disable-next-line no-throw-literal
    throw { message: 'Reference already exists' }
  }

  const ctx = helpers.getDefaultContext()
  ctx.octokit.git.createRef = createRef
  const log = { info: jest.fn() }

  await github.createBranch(ctx, {}, 'issue-1', '1234abcd', log)

  expect(log.info).toBeCalled()
})

test('log branch create errors with error level', async () => {
  const createComment = jest.fn()
  const createRef = () => {
    // eslint-disable-next-line no-throw-literal
    throw { message: 'Oops, something is wrong' }
  }
  const ctx = helpers.getDefaultContext()
  ctx.octokit.issues.createComment = createComment
  ctx.octokit.git.createRef = createRef

  await github.createBranch(ctx, { silent: false }, 'robvanderleek', 'create-issue-branch', 'issue-1', '1234abcd',
    () => {})

  expect(createComment).toBeCalled()
})

test('create (draft) PR', async () => {
  const createPR = jest.fn()
  let capturedCommitMessage = ''
  const createCommit = ({ message }) => {
    capturedCommitMessage = message
    return ({ data: { sha: 'abcd1234' } })
  }
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.octokit.git.createCommit = createCommit

  await github.createPr({ log: () => { } }, ctx, { silent: false }, 'robvanderleek', 'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: false,
    base: 'master',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
  expect(capturedCommitMessage).toBe('Create PR for #1')
  await github.createPr({ log: () => { } }, ctx, { silent: false, openDraftPR: true }, 'robvanderleek', 'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: true,
    base: 'master',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
  expect(capturedCommitMessage).toBe('Create draft PR for #1')
})

test('copy Issue description into PR', async () => {
  const createPR = jest.fn()
  const createCommit = () => ({ data: { sha: 'abcd1234' } })
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.octokit.git.createCommit = createCommit
  ctx.payload.issue.body = 'This is the description'

  await github.createPr({ log: () => { } }, ctx, { copyIssueDescriptionToPR: true, silent: false }, 'robvanderleek',
    'issue-1')

  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    head: 'issue-1',
    base: 'master',
    title: 'Hello world',
    body: formatAsExpandingMarkdown('Original issue description', 'This is the description') + '\ncloses #1',
    draft: false
  })
})

test('Do not copy undefined Issue description into PR', async () => {
  const createPR = jest.fn()
  const createCommit = () => ({ data: { sha: 'abcd1234' } })
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.octokit.git.createCommit = createCommit
  ctx.payload.issue.body = null

  await github.createPr({ log: () => { } }, ctx, { copyIssueDescriptionToPR: true, silent: false }, 'robvanderleek',
    'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: false,
    base: 'master',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
})

test('use correct source branch', async () => {
  const createPR = jest.fn()
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.payload.issue.labels = [{ name: 'enhancement' }]
  const config = { branches: [{ label: 'enhancement', name: 'develop' }] }

  await github.createPr({ log: () => { } }, ctx, config, 'robvanderleek', 'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: false,
    base: 'develop',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
})

test('use configured target branch', async () => {
  const createPR = jest.fn()
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.payload.issue.labels = [{ name: 'enhancement' }]
  const config = { branches: [{ label: 'enhancement', prTarget: 'develop' }] }

  await github.createPr({ log: () => { } }, ctx, config, 'robvanderleek', 'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: false,
    base: 'develop',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
})

test('configured source and target branch', async () => {
  const createPR = jest.fn()
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = createPR
  ctx.payload.issue.labels = [{ name: 'hotfix' }]
  const config = { branches: [{ label: 'hotfix', name: 'develop', prTarget: 'hotfix' }] }

  await github.createPr({ log: () => { } }, ctx, config, 'robvanderleek', 'issue-1')
  expect(createPR).toHaveBeenCalledWith({
    owner: 'robvanderleek',
    repo: 'create-issue-branch',
    draft: false,
    base: 'hotfix',
    head: 'issue-1',
    body: 'closes #1',
    title: 'Hello world'
  })
})

test('copy Issue milestone into PR', async () => {
  const updateIssue = jest.fn()
  const createCommit = () => ({ data: { sha: 'abcd1234' } })
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = () => ({ data: { number: 123 } })
  ctx.octokit.issues.update = updateIssue
  ctx.octokit.git.createCommit = createCommit
  ctx.payload.issue.body = 'This is the description'
  ctx.payload.issue.milestone = { number: 456 }

  await github.createPr({ log: () => { } }, ctx, { copyIssueMilestoneToPR: true, silent: false }, 'robvanderleek',
    'issue-1')
  expect(updateIssue).toHaveBeenCalledWith({
    owner: 'robvanderleek', repo: 'create-issue-branch', issue_number: 123, milestone: 456
  })
})

test('empty commit text', async () => {
  const createCommit = jest.fn()
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = () => ({ data: { number: 123 } })
  ctx.octokit.git.createCommit = createCommit
  ctx.payload.issue.body = 'This is the description'
  ctx.payload.issue.milestone = { number: 456 }

  await github.createPr({ log: () => { } }, ctx, { }, 'robvanderleek', 'issue-1')

  expect(createCommit.mock.calls[0][0].message).toBe('Create PR for #1')
})

test('empty commit with skip CI text', async () => {
  const createCommit = jest.fn()
  const ctx = helpers.getDefaultContext()
  ctx.octokit.pulls.create = () => ({ data: { number: 123 } })
  ctx.octokit.git.createCommit = createCommit
  ctx.payload.issue.body = 'This is the description'
  ctx.payload.issue.milestone = { number: 456 }

  await github.createPr({ log: () => { } }, ctx, { prSkipCI: true }, 'robvanderleek', 'issue-1')

  expect(createCommit.mock.calls[0][0].message).toBe('Create PR for #1\n[skip ci]')
})
