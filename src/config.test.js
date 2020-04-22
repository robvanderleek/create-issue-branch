const config = require('./config')

test('is ChatOps command', () => {
  expect(config.isChatOpsCommand('/create-issue-branch')).toBeTruthy()
  expect(config.isChatOpsCommand('/Create-Issue-Branch')).toBeTruthy()
  expect(config.isChatOpsCommand('/create-issue-branch  ')).toBeTruthy()
  expect(config.isChatOpsCommand('  /create-issue-branch  ')).toBeTruthy()
  expect(config.isChatOpsCommand('/cib')).toBeTruthy()
  expect(config.isChatOpsCommand('/create-issue-branch Simple NPE fix')).toBeTruthy()
  expect(config.isChatOpsCommand('/cib Simple NPE fix')).toBeTruthy()

  expect(config.isChatOpsCommand('/create-branch  ')).toBeFalsy()
  expect(config.isChatOpsCommand(' /cb')).toBeFalsy()
  expect(config.isChatOpsCommand(' / cb')).toBeFalsy()
  expect(config.isChatOpsCommand('/createbranch')).toBeFalsy()
  expect(config.isChatOpsCommand('/create-issue')).toBeFalsy()
})

test('get ChatOps command argument', () => {
  expect(config.getChatOpsCommandArgument('/cib')).toBeUndefined()
  expect(config.getChatOpsCommandArgument('/cib   ')).toBeUndefined()
  expect(config.getChatOpsCommandArgument('/cib Fix NPE bug')).toBe('Fix NPE bug')
  expect(config.getChatOpsCommandArgument('/cib Hello')).toBe('Hello')
})
