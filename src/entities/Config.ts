export interface Config {
    mode: 'immediate' | 'auto' | 'chatops';
    branchName: string;
    autoLinkIssue: boolean;
    autoCloseIssue: boolean;
    autoDeleteBranch: boolean;
    defaultBranch?: string;
    branches: Array<BranchConfig>;
    copyIssueLabelsToPR: boolean;
    copyIssueAssigneeToPR: boolean;
    copyIssueProjectsToPR: boolean;
    copyIssueMilestoneToPR: boolean;
    copyIssueDescriptionToPR: boolean;
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

export interface BranchConfig {
    label: string | Array<string>;
    name?: string;
    prefix?: string;
    prTarget?: string;
    skip?: boolean;
    skipBranch?: boolean;
}

export function getDefaultConfig(): Config {
    return {
        mode: 'auto',
        branchName: 'full',
        autoLinkIssue: false,
        autoCloseIssue: false,
        autoDeleteBranch: false,
        branches: [],
        copyIssueLabelsToPR: false,
        copyIssueAssigneeToPR: false,
        copyIssueProjectsToPR: false,
        copyIssueMilestoneToPR: false,
        copyIssueDescriptionToPR: false,
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