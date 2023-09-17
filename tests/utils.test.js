const utils = require('../src/utils')
const standard = require('standard')
const path = require('path')
const fs = require('fs')
const { version } = require('../src/version')
const { formatAsExpandingMarkdown } = require('../src/utils')

test('git safe replacements', () => {
  expect(utils.makePrefixGitSafe('feature/bug')).toBe('feature/bug')
  expect(utils.makePrefixGitSafe('  feature/this is a bug ')).toBe('feature/this_is_a_bug')
  expect(utils.makePrefixGitSafe('hello/ world')).toBe('hello/_world')
  expect(utils.makeGitSafe('feature_bug')).toBe('feature_bug')
  expect(utils.makeGitSafe('Issue name with slash/')).toBe('Issue_name_with_slash')
  expect(utils.makeGitSafe('Also issue name/with slash')).toBe('Also_issue_name/with_slash')
  expect(utils.makeGitSafe('全是中文的名字')).toBe('全是中文的名字')
  expect(utils.makeGitSafe('..lock')).toBe('lock')
  expect(utils.makeGitSafe('hello..world')).toBe('hello_world')
  expect(utils.makeGitSafe('~hello^world:')).toBe('hello_world')
  expect(utils.makeGitSafe('?hello*world[')).toBe('hello_world')
  expect(utils.makeGitSafe('@{hello@world}')).toBe('hello_world')
  expect(utils.makeGitSafe('"(hello),`world`"')).toBe('hello_world')
  expect(utils.makeGitSafe('\'hello world\'')).toBe('hello_world')
  expect(utils.makeGitSafe('<<<hello world>>>')).toBe('hello_world')
  expect(utils.makeGitSafe('hello <|> world')).toBe('hello_world')
})

test('custom git safe replacements', () => {
  expect(utils.makePrefixGitSafe('  feature/this is a bug ', { replacementChar: '+' })).toBe('feature/this+is+a+bug')
  expect(utils.makePrefixGitSafe('hello/ world', { replacementChar: '+' })).toBe('hello/+world')
  expect(utils.makeGitSafe('feature_bug', { replacementChar: '-' })).toBe('feature_bug')
  expect(utils.makeGitSafe('Issue name with slash/', { replacementChar: '-' })).toBe('Issue-name-with-slash')
  expect(utils.makeGitSafe('Also issue name/with slash', { replacementChar: '-' })).toBe('Also-issue-name/with-slash')
})

test('custom replace chars', () => {
  expect(utils.makePrefixGitSafe('  feature/this is a bug ', { replaceChars: '/', replacementChar: '+' }))
    .toBe('feature+this+is+a+bug')
  expect(utils.makePrefixGitSafe('hello/ world', { replaceChars: '/', replacementChar: '+' })).toBe('hello++world')
  expect(utils.makeGitSafe('feature_bug', { replaceChars: '_', replacementChar: '-' })).toBe('feature-bug')
  expect(utils.makeGitSafe('Issue name with slash/', { replaceChars: 'Is' })).toBe('ue_name_with__la_h')
  expect(utils.makeGitSafe('Also issue name/with slash', { replaceChars: '/', replacementChar: '-' }))
    .toBe('Also-issue-name-with-slash')
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

  expect(utils.wildcardMatch('aap*', 'aap/bar/noot')).toBeTruthy()
  expect(utils.wildcardMatch('type | bug', 'type | feature')).toBeFalsy()
})

test('is running in GitHub Actions', () => {
  if (!process.env.CI) {
    process.env.GITHUB_ACTIONS = 'true'

    expect(utils.isRunningInGitHubActions()).toBeTruthy()
  }
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

test('StandardJS format', () => {
  const parentDir = path.resolve(__dirname, '..')
  const srcDir = path.join(parentDir, 'src')
  const files = fs.readdirSync(srcDir).map(f => path.join(srcDir, f)).filter(p => fs.lstatSync(p).isFile())
  const cb = (_, results) => {
    if (results.errorCount > 0) {
      console.log(JSON.stringify(results, null, 2))
    }
    expect(results.errorCount).toBe(0)
  }
  standard.lintFiles(files, { ignore: [] }, cb)
})

test('version', () => {
  expect(version.revision).toBeDefined()
  expect(version.date).toBeDefined()
})

test('format expanding markdown', () => {
  const result = formatAsExpandingMarkdown('Foo', 'Bar\n- Foo\n- Bar')
  const expected = `<details>
<summary><b>Foo</b></summary>

Bar
- Foo
- Bar
</details>\n`
  expect(result).toBe(expected)
})
