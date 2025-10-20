import {
    getChatOpsCommandArgument,
    getCommentMessage,
    getConventionalLabelMapping,
    getConventionalPrTitlePrefix,
    getDefaultBranch,
    isChatOpsCommand,
    isExperimentalBranchNameArgument,
    isModeAuto,
    isModeChatOps,
    isModeImmediate,
    shouldOpenPR
} from "../src/config";
import {getDefaultConfig} from "../src/entities/Config";

test('is ChatOps command', () => {
    expect(isChatOpsCommand('/create-issue-branch')).toBeTruthy()
    expect(isChatOpsCommand('/Create-Issue-Branch')).toBeTruthy()
    expect(isChatOpsCommand('/create-issue-branch  ')).toBeTruthy()
    expect(isChatOpsCommand('  /create-issue-branch  ')).toBeTruthy()
    expect(isChatOpsCommand('/cib')).toBeTruthy()
    expect(isChatOpsCommand('/create-issue-branch Simple NPE fix')).toBeTruthy()
    expect(isChatOpsCommand('/cib Simple NPE fix')).toBeTruthy()

    expect(isChatOpsCommand('/create-branch  ')).toBeFalsy()
    expect(isChatOpsCommand(' /cb')).toBeFalsy()
    expect(isChatOpsCommand(' / cb')).toBeFalsy()
    expect(isChatOpsCommand('/createbranch')).toBeFalsy()
    expect(isChatOpsCommand('/create-issue')).toBeFalsy()
    expect(isChatOpsCommand(undefined)).toBeFalsy()
})

test('get ChatOps command argument', () => {
    expect(getChatOpsCommandArgument('/cib')).toBeUndefined()
    expect(getChatOpsCommandArgument('/cib   ')).toBeUndefined()
    expect(getChatOpsCommandArgument('/cib Fix NPE bug')).toBe('Fix NPE bug')
    expect(getChatOpsCommandArgument('/cib Hello')).toBe('Hello')
})

test('is mode ChatOps', () => {
    const config = getDefaultConfig();

    expect(isModeChatOps(config)).toBeFalsy();

    config.mode = 'immediate';

    expect(isModeChatOps(config)).toBeFalsy();

    config.mode = 'chatops';

    expect(isModeChatOps(config)).toBeTruthy()
})

test('is mode auto', () => {
    const config = getDefaultConfig();

    expect(isModeAuto(config)).toBeTruthy();

    config.mode = 'chatops';

    expect(isModeAuto(config)).toBeFalsy();

    config.mode = 'immediate';

    expect(isModeAuto(config)).toBeFalsy()
})

test('is mode immediate', () => {
    const config = getDefaultConfig();

    expect(isModeImmediate(config)).toBeFalsy();

    config.mode = 'auto';

    expect(isModeImmediate(config)).toBeFalsy();

    config.mode = 'chatops';

    expect(isModeImmediate(config)).toBeFalsy();

    config.mode = 'immediate';

    expect(isModeImmediate(config)).toBeTruthy()
})

test('experimental feature flag', () => {
    const config = getDefaultConfig();

    expect(isExperimentalBranchNameArgument(config)).toBeFalsy();

    config.experimental.branchNameArgument = true;

    expect(isExperimentalBranchNameArgument(config)).toBeTruthy();
})

test('open (draft) PR after creating an issue', () => {
    const config = getDefaultConfig();

    expect(shouldOpenPR(config)).toBeFalsy();

    config.openPR = true;

    expect(shouldOpenPR(config)).toBeTruthy();

    config.openPR = false;
    config.openDraftPR = true;

    expect(shouldOpenPR(config)).toBeTruthy();
})

test('get comment message', () => {
    const config = getDefaultConfig();

    expect(getCommentMessage(config)).toBeDefined();

    config.commentMessage = 'hello world';

    expect(getCommentMessage(config)).toBe('hello world');

    // eslint-disable-next-line no-template-curly-in-string
    config.commentMessage = 'hello ${branchName}';

    expect(getCommentMessage(config)).toBe('hello ${branchName}')
})

test('get default branch', () => {
    const config = getDefaultConfig();

    expect(getDefaultBranch(config)).toBeUndefined();

    config.defaultBranch = 'main';

    expect(getDefaultBranch(config)).toBe('main');
})

test('get PR title prefix for issue label', () => {
    const config = getDefaultConfig();

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix: 🐛');
    expect(getConventionalPrTitlePrefix(config, ['some-user-defined-label'])).toBe('feat: ✨')

    config.conventionalLabels = {fix: {bug: ':ambulance:'}};

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix: :ambulance:');
})

test('get PR title prefix for issue label semver style', () => {
    const config = getDefaultConfig();
    config.conventionalStyle = 'semver';

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix: 🐛')
    expect(getConventionalPrTitlePrefix(config, ['some-user-defined-label'])).toBe('feat: ✨')
    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix: 🐛')

    config.conventionalLabels = {fix: {bug: ':ambulance:'}};

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix: :ambulance:');
})

test('get PR title prefix for issue label semver-no-gitmoji style', () => {
    const config = getDefaultConfig();
    config.conventionalStyle = 'semver-no-gitmoji';

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix:');
    expect(getConventionalPrTitlePrefix(config, ['some-user-defined-label'])).toBe('feat:');

    config.conventionalLabels = {fix: {bug: ':ambulance:'}};

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('fix:')
})

test('get PR title prefix for issue label gitmoji style', () => {
    const config = getDefaultConfig();
    config.conventionalStyle = 'gitmoji';

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe('🐛');
    expect(getConventionalPrTitlePrefix(config, ['some-user-defined-label'])).toBe('✨');

    config.conventionalLabels = {fix: {bug: ':ambulance:'}};

    expect(getConventionalPrTitlePrefix(config, ['bug'])).toBe(':ambulance:');
})

test('get default conventional label mapping', () => {
    const config = getDefaultConfig();
    const defaultMapping = getConventionalLabelMapping(config);
    expect(defaultMapping.enhancement).toBeDefined();
    expect(defaultMapping.enhancement.prefix).toBe('feat');
    expect(defaultMapping.enhancement.emoji).toBe('✨');
    expect(defaultMapping.enhancement.breaking).toBeFalsy();
    expect(defaultMapping.bug.prefix).toBe('fix');
    expect(defaultMapping.bug.emoji).toBe('🐛');
    expect(defaultMapping.bug.breaking).toBeFalsy();
    expect(defaultMapping['breaking-change'].prefix).toBe('feat');
    expect(defaultMapping['breaking-change'].breaking).toBeTruthy();
})

test('get custom conventional label mapping', () => {
    const config = getDefaultConfig();
    config.conventionalLabels = {
        fix: {bug: ':ambulance:'}, foo: {bar: ':ghost:'}, bar: {foo: ':foo:', breaking: true}
    }
    const mapping = getConventionalLabelMapping(config);

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
    const config = getDefaultConfig();
    config.conventionalLabels = {
        feat: {foo: ':ghost:'}, features: {bar: ':bar:'}
    }
    const mapping = getConventionalLabelMapping(config);

    expect(mapping.foo.prefix).toBe('feat')
    expect(mapping.bar.prefix).toBe('feat')
})
