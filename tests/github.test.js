const github = require('../src/github')

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
  expect(github.skipBranchCreationForIssue(questionIssue, config)).toBe(true)
  expect(github.skipBranchCreationForIssue(bugIssue, config)).toBe(false)
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
  const ctx = {
    payload: {
      repository: {
        owner: {
          login: 'robvanderleek'
        }, //
        name: 'create-issue-brancg'
      } //
    }, //
    octokit: {
      git: {
        createRef: () => {
          // eslint-disable-next-line no-throw-literal
          throw { message: 'Reference already exists' }
        }
      }
    }
  }
  const log = { info: jest.fn() }

  await github.createBranch(ctx, {}, 'issue-1', '1234abcd', log)

  expect(log.info).toBeCalled()
})

test('log branch create errors with error level', async () => {
  const createComment = jest.fn()
  const ctx = {
    payload: {
      repository: {
        owner: {
          login: 'robvanderleek'
        }, //
        name: 'create-issue-brancg'
      } //
    }, //
    octokit: {
      git: {
        createRef: () => {
          // eslint-disable-next-line no-throw-literal
          throw { message: 'Oops, something is wrong' }
        }
      }, //
      issues: {
        createComment: createComment
      }
    }, //
    issue: () => {}
  }

  await github.createBranch(ctx, { silent: false }, 'robvanderleek', 'create-issue-branch', 'issue-1', '1234abcd',
    () => {})

  expect(createComment).toBeCalled()
})

test('create draft PR', async () => {
  const createPR = jest.fn()
  const ctx = {
    payload: {
      repository: {
        owner: {
          login: 'robvanderleek'
        }, //
        name: 'create-issue-branch'
      }, //
      issue: { number: 1 }
    }, //
    octokit: {
      pulls: {
        create: createPR
      }
    }, //
    issue: () => {}
  }

  await github.createDraftPR(ctx, { silent: false }, 'issue-1')

  expect(createPR).toHaveBeenCalledWith(
    { owner: 'robvanderleek', repo: 'create-issue-branch', draft: true, base: undefined, issue: 1, head: 'issue-1' })
})
