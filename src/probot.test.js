const nock = require('nock')
const helpers = require('./test-helpers')
const myProbotApp = require('./probot')
const { Probot } = require('probot')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const commentCreatedPayload = require('./test-fixtures/issue_comment.created.json')
const pullRequestClosedPayload = require('./test-fixtures/pull_request.closed.json')

nock.disableNetConnect()

let probot

beforeAll(() => {
  const logRequest = (r) => console.log(`No match: ${r.path}, method: ${r.method}, host: ${r.options.host}`)
  nock.emitter.on('no match', req => { logRequest(req) })
})

beforeEach(() => {
  probot = new Probot({})
  const app = probot.load(myProbotApp)
  app.app = {
    getInstallationAccessToken: () => Promise.resolve('test')
  }
  nock.cleanAll()
  jest.setTimeout(10000)
  helpers.nockAccessToken()
})

test('creates a branch when an issue is assigned', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockEmptyConfig()
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
})

test('do not create a branch when it already exists', async () => {
  helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
  helpers.nockEmptyConfig()
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeFalsy()
})

test('create short branch when configured that way', async () => {
  helpers.nockNonExistingBranch('issue-1')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockConfig('branchName: short')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/issue-1')
})

test('source branch is default branch by, well, default', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  helpers.nockEmptyConfig()
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(sourceSha).toBe('12345678')
})

test('source branch can be configured based on issue label', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('do not create a branch for issue labels that are configured to be skipped', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  const ymlConfig = `branches:
  - label: question
    skip: true`
  helpers.nockConfig(ymlConfig)
  let createEndpointCalled = false

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithQuestionLabelPayload() })

  expect(createEndpointCalled).toBeFalsy()
})

test('source branch can be configured based on issue label with wildcard pattern', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  const ymlConfig = `branches:
  - label: ?nhance*
    name: dev`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('source branch based on catch-all fallthrough', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('bug', 'abcd1234')
  helpers.nockExistingBranch('issues', 'fghi5678')
  const ymlConfig = `branches:
  - label: bug
    name: bug
  - label: '*'
    name: issues`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(sourceSha).toBe('fghi5678')
})

test('source branch based on label where configuration contains catch-all fallthrough', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('enhancement', 'abcd1234')
  helpers.nockExistingBranch('issues', 'fghi5678')
  const ymlConfig = `branches:
  - label: enhancement
    name: enhancement
  - label: '*'
    name: issues`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('if configured source branch does not exist use default branch', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockNonExistingBranch('dev')
  helpers.nockExistingBranch('master', '12345678')
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithEnhancementLabelPayload() })

  expect(sourceSha).toBe('12345678')
})

test('if multiple issue labels match configuration use first match', async () => {
  helpers.nockNonExistingBranch('issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
  - label: bug
    name: master`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithBugAndEnhancementLabelsPayload() })

  expect(sourceSha).toBe('abcd1234')
})

test('configuration with label branch and prefix', async () => {
  helpers.nockNonExistingBranch('feature/issue-1-Test_issue')
  helpers.nockExistingBranch('master', '12345678')
  helpers.nockExistingBranch('dev', 'abcd1234')
  const ymlConfig = `branches:
  - label: enhancement
    name: dev
    prefix: feature/`
  helpers.nockConfig(ymlConfig)
  let sourceSha = ''
  let targetRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      sourceSha = body.sha
      targetRef = body.ref
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithBugAndEnhancementLabelsPayload() })

  expect(sourceSha).toBe('abcd1234')
  expect(targetRef).toBe('refs/heads/feature/issue-1-Test_issue')
})

test('configuration with label field missing', async () => {
  const ymlConfig = `branches:
  - name: dev
    prefix: feature/`
  helpers.nockConfig(ymlConfig)

  nock('https://api.github.com')
    .get('/search/issues')
    .query(true)
    .reply(200, { items: [] })

  let issueTitle = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues', body => {
      issueTitle = body.title
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithBugAndEnhancementLabelsPayload() })
  expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

test('configuration with invalid YAML', async () => {
  const ymlConfig = `branches:
  - label: Type: Feature
    prefix: feature/`
  helpers.nockConfig(ymlConfig)

  nock('https://api.github.com')
    .get('/search/issues')
    .query(true)
    .reply(200, { items: [] })

  let issueTitle = ''
  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/issues', body => {
      issueTitle = body.title
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithBugAndEnhancementLabelsPayload() })
  expect(issueTitle).toBe('Error in Create Issue Branch app configuration')
})

describe('ChatOps mode', () => {
  test('creates a branch when a chatops command is given', async () => {
    helpers.nockNonExistingBranch('issue-1-Test_issue')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockConfig('mode: chatops')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)
    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
        body = data.body
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [issue-1-Test_issue](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Test_issue) created!')
  })

  test('do nothing when a chatops command is given and mode is not chatops', async () => {
    helpers.nockConfig('mode: auto')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeFalsy()
  })

  test('creates a branch when a chatops command is given, no comment', async () => {
    helpers.nockNonExistingBranch('issue-1-Test_issue')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockConfig('mode: chatops\nsilent: true')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    await probot.receive({ name: 'issue_comment', payload: commentCreatedPayload })

    expect(createEndpointCalled).toBeTruthy()
  })

  test('ignore chatops command if not at start of line', async () => {
    helpers.nockConfig('mode: chatops')
    let createEndpointCalled = false

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = 'This command: /cib'
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeFalsy()
  })

  test('chatops command with title argument', async () => {
    helpers.nockNonExistingBranch('issue-1-Simple_NPE_fix')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
    helpers.nockConfig('mode: chatops\nexperimental:\n  branchNameArgument: true')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)
    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
        body = data.body
        return true
      })
      .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = '/cib Simple NPE fix'
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [issue-1-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/issue-1-Simple_NPE_fix) created!')
  })

  test('chatops command with title argument and custom branch name', async () => {
    helpers.nockNonExistingBranch('1-foo-Simple_NPE_fix')
    helpers.nockExistingBranch('master', 12345678)
    helpers.nockExistingBranch('issue-1-Test_issue', 87654321)
    helpers.nockConfig( // eslint-disable-next-line no-template-curly-in-string
      'branchName: \'${issue.number}-foo-${issue.title}\'\nmode: chatops\nexperimental:\n  branchNameArgument: true')
    let createEndpointCalled = false
    let body = ''

    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/git/refs', () => {
        createEndpointCalled = true
        return true
      })
      .reply(200)
    nock('https://api.github.com')
      .post('/repos/robvanderleek/create-issue-branch/issues/1/comments', (data) => {
        body = data.body
        return true
      })
      .reply(200)

    const payloadCopy = JSON.parse(JSON.stringify(commentCreatedPayload))
    payloadCopy.comment.body = '/cib Simple NPE fix'
    await probot.receive({ name: 'issue_comment', payload: payloadCopy })

    expect(createEndpointCalled).toBeTruthy()
    expect(body).toBe(
      'Branch [1-foo-Simple_NPE_fix](https://github.com/robvanderleek/create-issue-branch/tree/1-foo-Simple_NPE_fix) created!')
  })
})

test('create branch with custom issue name', async () => {
  helpers.nockNonExistingBranch('foo-1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'foo-${issue.number}-${issue.title}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/foo-1-Test_issue')
})

test('create branch with custom short issue name', async () => {
  helpers.nockNonExistingBranch('foo-1')
  helpers.nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'foo-${issue.number}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/foo-1')
})

test('create branch with GitLab-like issue name', async () => {
  helpers.nockNonExistingBranch('1-Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  // eslint-disable-next-line no-template-curly-in-string
  helpers.nockConfig('branchName: \'${issue.number}-${issue.title}\'')
  let createEndpointCalled = false
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      createEndpointCalled = true
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: issueAssignedPayload })

  expect(createEndpointCalled).toBeTruthy()
  expect(branchRef).toBe('refs/heads/1-Test_issue')
})

test('close issue after merge', async () => {
  helpers.nockConfig('autoCloseIssue: true')

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/issues/111')
    .reply(200)

  let state = ''
  nock('https://api.github.com')
    .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body) => {
      state = body.state
      return true
    })
    .reply(200)

  await probot.receive({ name: 'pull_request', payload: pullRequestClosedPayload })
  expect(state).toBe('closed')
})

test('do not close issue after PR close (without merge)', async () => {
  helpers.nockConfig('autoCloseIssue: true')

  nock('https://api.github.com')
    .get('/repos/robvanderleek/create-issue-branch/issues/111')
    .reply(200)

  let state = ''
  nock('https://api.github.com')
    .patch('/repos/robvanderleek/create-issue-branch/issues/111', (body) => {
      state = body.state
      return true
    })
    .reply(200)

  const payloadCopy = JSON.parse(JSON.stringify(pullRequestClosedPayload))
  payloadCopy.pull_request.merged = false
  await probot.receive({ name: 'pull_request', payload: payloadCopy })
  expect(state).toBe('')
})

test('create branch with slash in branch name', async () => {
  helpers.nockNonExistingBranch('bug/1/Test_issue')
  helpers.nockExistingBranch('master', 12345678)
  helpers.nockConfig(// eslint-disable-next-line no-template-curly-in-string
    'branchName: \'${issue.number}/${issue.title}\'\n' + //
    'branches:\n' + //
    '  - label: bug\n' + //
    '    prefix: bug/\n')
  let branchRef = ''

  nock('https://api.github.com')
    .post('/repos/robvanderleek/create-issue-branch/git/refs', (body) => {
      branchRef = body.ref
      return true
    })
    .reply(200)

  await probot.receive({ name: 'issues', payload: helpers.issueAssignedWithBugAndEnhancementLabelsPayload() })

  expect(branchRef).toBe('refs/heads/bug/1/Test_issue')
})
