import {
    formatAsExpandingMarkdown,
    getStringLengthInBytes,
    isRunningInGitHubActions,
    makeGitSafe,
    makePrefixGitSafe,
    trimStringToByteLength
} from "../src/utils";
import {gitDate, version} from "../src/version";
import wildcardMatch = require("wildcard-match");

test('git safe replacements', () => {
    expect(makePrefixGitSafe('feature/bug')).toBe('feature/bug')
    expect(makePrefixGitSafe('  feature/this is a bug ')).toBe('feature/this_is_a_bug')
    expect(makePrefixGitSafe('hello/ world')).toBe('hello/_world')
    expect(makeGitSafe('feature_bug')).toBe('feature_bug')
    expect(makeGitSafe('Issue name with slash/')).toBe('Issue_name_with_slash')
    expect(makeGitSafe('Also issue name/with slash')).toBe('Also_issue_name/with_slash')
    expect(makeGitSafe('全是中文的名字')).toBe('全是中文的名字')
    expect(makeGitSafe('..lock')).toBe('lock')
    expect(makeGitSafe('hello..world')).toBe('hello_world')
    expect(makeGitSafe('~hello^world:')).toBe('hello_world')
    expect(makeGitSafe('?hello*world[')).toBe('hello_world')
    expect(makeGitSafe('@{hello@world}')).toBe('hello_world')
    expect(makeGitSafe('"(hello),`world`"')).toBe('hello_world')
    expect(makeGitSafe('\'hello world\'')).toBe('hello_world')
    expect(makeGitSafe('<<<hello world>>>')).toBe('hello_world')
    expect(makeGitSafe('hello <|> world')).toBe('hello_world')
})

test('custom git safe replacements', () => {
    expect(makePrefixGitSafe('  feature/this is a bug ', {replacementChar: '+'})).toBe('feature/this+is+a+bug')
    expect(makePrefixGitSafe('hello/ world', {replacementChar: '+'})).toBe('hello/+world')
    expect(makeGitSafe('feature_bug', {replacementChar: '-'})).toBe('feature_bug')
    expect(makeGitSafe('Issue name with slash/', {replacementChar: '-'})).toBe('Issue-name-with-slash')
    expect(makeGitSafe('Also issue name/with slash', {replacementChar: '-'})).toBe('Also-issue-name/with-slash')
})

test('custom replace chars', () => {
    expect(makePrefixGitSafe('  feature/this is a bug ', {replaceChars: '/', replacementChar: '+'}))
        .toBe('feature+this+is+a+bug')
    expect(makePrefixGitSafe('hello/ world', {replaceChars: '/', replacementChar: '+'})).toBe('hello++world')
    expect(makeGitSafe('feature_bug', {replaceChars: '_', replacementChar: '-'})).toBe('feature-bug')
    expect(makeGitSafe('Issue name with slash/', {replaceChars: 'Is'})).toBe('ue_name_with__la_h')
    expect(makeGitSafe('Also issue name/with slash', {replaceChars: '/', replacementChar: '-'}))
        .toBe('Also-issue-name-with-slash')
})

test('wildcard matching', () => {
    expect(wildcardMatch('aap*', false)('aap')).toBeTruthy()
    expect(wildcardMatch('aap*', false)('aapnoot')).toBeTruthy()
    expect(wildcardMatch('??p', false)('aap')).toBeTruthy()
    expect(wildcardMatch('a??*', false)('aapnoot')).toBeTruthy()
    expect(wildcardMatch('*noot', false)('aapnoot')).toBeTruthy()
    expect(wildcardMatch('aap', false)('aapnoot')).toBeFalsy()
    expect(wildcardMatch('noot', false)('aapnoot')).toBeFalsy()
    expect(wildcardMatch('aap', false)('Aap')).toBeFalsy()
    expect(wildcardMatch('aap*', false)('aap/bar/noot')).toBeTruthy()
    expect(wildcardMatch('type | bug', false)('type | feature')).toBeFalsy()
})

test('is running in GitHub Actions', () => {
    if (!process.env.CI) {
        process.env.GITHUB_ACTIONS = 'true'

        expect(isRunningInGitHubActions()).toBeTruthy()
    }
})

test('get string length in bytes', () => {
    expect(getStringLengthInBytes('foo')).toBe(3)
    expect(getStringLengthInBytes('😁')).toBe(4)
})

test('trim string to byte length', () => {
    expect(trimStringToByteLength('foo', 3)).toBe('foo')
    expect(trimStringToByteLength('😁', 4)).toBe('😁')
    expect(trimStringToByteLength('foo', 4)).toBe('foo')
    expect(trimStringToByteLength('foo', 2)).toBe('fo')
    expect(trimStringToByteLength('😁😁', 4)).toBe('😁')
    expect(trimStringToByteLength('😁😁', 5)).toBe('😁')
    expect(trimStringToByteLength('😁😁', 6)).toBe('😁')
    expect(trimStringToByteLength('😁😁', 7)).toBe('😁')
    expect(trimStringToByteLength('😁😁', 8)).toBe('😁😁')
})

test('version', () => {
    expect(version).toBeDefined()
    expect(gitDate).toBeDefined()
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
