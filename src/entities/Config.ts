export interface Config {
    mode: 'immediate' | 'auto' | 'chatops';
    autoLinkIssue: boolean;
    autoCloseIssue: boolean;
    defaultBranch?: string;
    branches: Array<{ label: string, name: string }>;
    copyIssueLabelsToPR: boolean;
    copyIssueAssigneeToPR: boolean;
    copyIssueProjectsToPR: boolean;
    copyIssueMilestoneToPR: boolean;
    gitReplaceChars: string;
    gitSafeReplacementChar: string;
    commentMessage?: string;
    silent: boolean;
    openPR: boolean;
    openDraftPR: boolean;
    prSkipCI: boolean;
    conventionalPrTitles: boolean;
    conventionalStyle: 'semver' | 'gitmoji' | 'semver-no-gitmoji';
    conventionalLabels: { [name: string]: { [name: string]: any } }
    experimental: {
        branchNameArgument: boolean;
    }
}

export function getDefaultConfig(): Config {
    return {
        mode: 'auto',
        autoLinkIssue: false,
        autoCloseIssue: false,
        branches: [],
        copyIssueLabelsToPR: false,
        copyIssueAssigneeToPR: false,
        copyIssueProjectsToPR: false,
        copyIssueMilestoneToPR: false,
        gitReplaceChars: '',
        gitSafeReplacementChar: '_',
        silent: false,
        openPR: false,
        openDraftPR: false,
        prSkipCI: false,
        conventionalPrTitles: false,
        conventionalStyle: 'semver',
        conventionalLabels: {},
        experimental: {
            branchNameArgument: false
        }
    }
}