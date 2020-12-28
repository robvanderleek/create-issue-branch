const utils = require('../src/utils')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')

test('interpolate string with object field expression', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('hello ${hello}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with object field expression and uppercase operator', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('HELLO ${hello^}', o)
  expect(result).toBe('HELLO WORLD')
})

test('interpolate string with object field expression and lowercase operator', () => {
  const o = { hello: 'World' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('hello ${hello,}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('hello ${outer.inner}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression and lowercase operator', () => {
  const o = { outer: { inner: 'WoRlD' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('hello ${outer.inner,}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with undefined object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('hello ${inner.outer}', o)
  expect(result).toBe('hello undefined')
})

test('interpolate string with issue assigned payload', () => {
  // eslint-disable-next-line no-template-curly-in-string
  const result = utils.interpolate('Creator ${issue.user.login}, repo: ${repository.name}', issueAssignedPayload)
  expect(result).toBe('Creator robvanderleek, repo: create-issue-branch')
})

test('git safe replacements', () => {
  expect(utils.makePrefixGitSafe('feature/bug')).toBe('feature/bug')
  expect(utils.makePrefixGitSafe('  feature/this is a bug ')).toBe('feature/this_is_a_bug')
  expect(utils.makePrefixGitSafe('hello/ world')).toBe('hello/_world')
  expect(utils.makeGitSafe('feature_bug')).toBe('feature_bug')
  expect(utils.makeGitSafe('Issue name with slash/')).toBe('Issue_name_with_slash')
  expect(utils.makeGitSafe('Also issue name/with slash')).toBe('Also_issue_name/with_slash')
})

test('custom git safe replacements', () => {
  expect(utils.makeGitSafe('feature_bug', '-')).toBe('feature_bug')
  expect(utils.makeGitSafe('Issue name with slash/', '-')).toBe('Issue-name-with-slash')
  expect(utils.makeGitSafe('Also issue name/with slash', '-')).toBe('Also-issue-name/with-slash')
})

test('wildcard matching', () => {
  expect(utils.wildcardMatch('aap*', 'aap')).toBeTruthy()
  expect(utils.wildcardMatch('aap*', 'aapnoot')).toBeTruthy()
  expect(utils.wildcardMatch('??p', 'aap')).toBeTruthy()
  expect(utils.wildcardMatch('a??*', 'aapnoot')).toBeTruthy()
  expect(utils.wildcardMatch('*noot', 'aapnoot')).toBeTruthy()

  expect(utils.wildcardMatch('aap', 'aapnoot')).toBeFalsy()
  expect(utils.wildcardMatch('noot', 'aapnoot')).toBeFalsy()
  expect(utils.wildcardMatch('aap', 'Aap')).toBeFalsy()
})

test('get string length in bytes', () => {
  expect(utils.getStringLengthInBytes('foo')).toBe(3)
  expect(utils.getStringLengthInBytes('😁')).toBe(4)
})

test('trim string to byte length', () => {
  expect(utils.trimStringToByteLength('foo', 3)).toBe('foo')
  expect(utils.trimStringToByteLength('😁', 4)).toBe('😁')
  expect(utils.trimStringToByteLength('foo', 4)).toBe('foo')
  expect(utils.trimStringToByteLength('foo', 2)).toBe('fo')
  expect(utils.trimStringToByteLength('😁😁', 4)).toBe('😁')
  expect(utils.trimStringToByteLength('😁😁', 5)).toBe('😁')
  expect(utils.trimStringToByteLength('😁😁', 6)).toBe('😁')
  expect(utils.trimStringToByteLength('😁😁', 7)).toBe('😁')
  expect(utils.trimStringToByteLength('😁😁', 8)).toBe('😁😁')
})
