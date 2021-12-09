const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const { interpolate } = require('../src/interpolate')

test('interpolate string with object field expression', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${hello}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with object field expression and uppercase operator', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('HELLO ${hello^}', o)
  expect(result).toBe('HELLO WORLD')
})

test('interpolate string with object field expression and lowercase operator', () => {
  const o = { hello: 'World' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${hello,}', o)
  expect(result).toBe('hello world')
})

test('trim spaces', () => {
  const o = { hello: 'World' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${ hello, }', o)
  expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${outer.inner}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression and lowercase operator', () => {
  const o = { outer: { inner: 'WoRlD' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${outer.inner,}', o)
  expect(result).toBe('hello world')
})

test('interpolate string with undefined object field expression', () => {
  const o = { outer: { inner: 'world' } }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${inner.outer}', o)
  expect(result).toBe('hello undefined')
})

test('interpolate string with issue assigned payload', () => {
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('Creator ${issue.user.login}, repo: ${repository.name}', issueAssignedPayload)
  expect(result).toBe('Creator robvanderleek, repo: create-issue-branch')
})

test('interpolate string with environment variable expression', () => {
  const env = { SOME_VAR: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${%SOME_VAR}', {}, env)
  expect(result).toBe('hello world')
})

test('interpolate string with undefined environment variable expression', () => {
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${%DOES_NOT_EXIST}', {}, {})
  expect(result).toBe('hello undefined')
})

test('interpolate string with environment variable expression and lowercase operator', () => {
  const env = { SOME_VAR: 'WoRlD' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${%SOME_VAR,}', {}, env)
  expect(result).toBe('hello world')
})

test('interpolate string with slice operator', () => {
  const o = { hello: 'world' }
  // eslint-disable-next-line no-template-curly-in-string
  const result = interpolate('hello ${hello[1,3]}', o)
  expect(result).toBe('hello or')
})
