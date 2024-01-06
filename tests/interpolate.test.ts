import {interpolate} from "../src/interpolate";
import issueAssignedPayload from "./test-fixtures/issues.assigned.json";

test('interpolate string with object field expression', () => {
    const o = {hello: 'world'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${hello}', o)
    expect(result).toBe('hello world')
})

test('interpolate string with object field expression and uppercase operator', () => {
    const o = {hello: 'world'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('HELLO ${hello^}', o)
    expect(result).toBe('HELLO WORLD')
})

test('interpolate string with object field expression and lowercase operator', () => {
    const o = {hello: 'World'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${hello,}', o)
    expect(result).toBe('hello world')
})

test('trim spaces', () => {
    const o = {hello: 'World'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${ hello, }', o)
    expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression', () => {
    const o = {outer: {inner: 'world'}}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${ outer.inner}', o)
    expect(result).toBe('hello world')
})

test('interpolate string with nested object field expression and lowercase operator', () => {
    const o = {outer: {inner: 'WoRlD'}}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${outer.inner,}', o)
    expect(result).toBe('hello world')
})

test('interpolate string with undefined object field expression', () => {
    const o = {outer: {inner: 'world'}}
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
    const env = {SOME_VAR: 'world'}
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
    const env = {SOME_VAR: 'WoRlD'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello ${%SOME_VAR,}', {}, env)
    expect(result).toBe('hello world')
})

test('interpolate string with slice operator, start and end', () => {
    const o = {hello: 'hello'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('h${hello[1,3]}lo', o)
    expect(result).toBe('hello')
})

test('interpolate string with slice operator, only start', () => {
    const o = {hello: 'hello'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hel${hello[3]}', o)
    expect(result).toBe('hello')
})

test('interpolate string with slice operator, only end', () => {
    const o = {hello: 'hello'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('${hello[,3]}lo', o)
    expect(result).toBe('hello')
})

test('interpolate string with slice operator, only negative start', () => {
    const o = {hello: 'hello'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hel${hello[-2]}', o)
    expect(result).toBe('hello')
})

test('interpolate string with slice and uppercase operator', () => {
    const o = {hello: 'hello'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('h${hello[ 1 , 3 ]^}lo', o)
    expect(result).toBe('hELlo')
})

test('interpolate string with negative slices and lowercase operator', () => {
    const o = {hello: 'HELLO'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('h${hello[-4,-2],}lo', o)
    expect(result).toBe('hello')
})

test('interpolate string with out-of-bound slice', () => {
    const o = {hello: 'HELLO'}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('hello${hello[100]}', o)
    expect(result).toBe('hello')
})

test('string slice examples', () => {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/slice
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[1, 8]}', {text: 'The morning is upon us.'})).toBe('he morn')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[4, -2]}', {text: 'The morning is upon us.'})).toBe('morning is upon u')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[12]}', {text: 'The morning is upon us.'})).toBe('is upon us.')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[30]}', {text: 'The morning is upon us.'})).toBe('')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[-3]}', {text: 'The morning is upon us.'})).toBe('us.')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[-3, -1]}', {text: 'The morning is upon us.'})).toBe('us')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[0, -1]}', {text: 'The morning is upon us.'})).toBe('The morning is upon us')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[-11, 16]}', {text: 'The morning is upon us.'})).toBe('is u')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[11, -7]}', {text: 'The morning is upon us.'})).toBe(' is u')
    // eslint-disable-next-line no-template-curly-in-string
    expect(interpolate('${text[-5, -1]}', {text: 'The morning is upon us.'})).toBe('n us')
})

test('interpolate number with leading zeros', () => {
    const o = {count: 123}
    // eslint-disable-next-line no-template-curly-in-string
    const result = interpolate('issue-${count%6}', o)

    expect(result).toBe('issue-000123')
})
