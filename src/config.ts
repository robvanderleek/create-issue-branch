import {Config, getDefaultConfig} from "./entities/Config";
import {Context} from "probot";

/**
 * The code in this block was inspired by (but heavily modified): https://github.com/tcbyrd/probot-report-error
 */
/* === */
const issueTitle = 'Error in Create Issue Branch app configuration'

async function findConfigurationErrorIssue(ctx: Context<any>) {
    const fullName = ctx.payload.repository.full_name
    const result = await ctx.octokit.search.issuesAndPullRequests(
        {q: `${issueTitle} repo:${fullName} in:title type:issue state:open`})
    return result.data.items
}

async function createConfigurationErrorIssue(ctx: Context<any>, err: string) {
    const errorBody = (err: string) => {
        return `
  Error in app configuration:
  \`\`\`
  ${err}
  \`\`\`
  Please check the syntax of your \`.issue-branch.yml\`
`
    }
    return ctx.octokit.issues.create(ctx.repo({
        title: issueTitle, body: errorBody(err)
    }))
}

async function handleError(ctx: Context<any>, err: string) {
    ctx.log(`Error in app configuration: ${err}`)
    const issues = await findConfigurationErrorIssue(ctx)
    if (issues.length > 0) {
        ctx.log(`Error issue already exists for repo: ${ctx.payload.repository.full_name}`)
    } else {
        return createConfigurationErrorIssue(ctx, err)
    }
}

/* === */

export async function loadConfig(ctx: Context<any>): Promise<Config | undefined> {
    try {
        let result = await ctx.config<Config>('issue-branch.yml');
        if (!result) {
            result = await ctx.config<Config>('issue-branch.yaml');
        }
        if (!result) {
            result = getDefaultConfig();
        } else {
            result = {...getDefaultConfig(), ...result};
        }
        for (const branchConfiguration of result.branches) {
            if (!branchConfiguration.label) {
                await handleError(ctx, `Branch configuration is missing label: ${JSON.stringify(branchConfiguration)}`);
                return undefined;
            }
        }
        return result
    } catch (e: any) {
        await handleError(ctx, `Exception while parsing configuration YAML: ${e.message}`)
        return undefined;
    }
}

export function isModeAuto(config: Config) {
    return !isModeChatOps(config) && !isModeImmediate(config);
}

export function isModeImmediate(config: Config) {
    return config.mode === 'immediate';
}

export function isModeChatOps(config: Config) {
    return config.mode === 'chatops';
}

export function isExperimentalBranchNameArgument(config: Config) {
    return config.experimental.branchNameArgument;
}

export function shouldOpenPR(config: Config) {
    return config.openPR || config.openDraftPR;
}

export function prSkipCI(config: Config) {
    return 'prSkipCI' in config && config.prSkipCI === true
}

export function isChatOpsCommand(s?: string) {
    if (s) {
        const parts = s.trim().toLowerCase().split(/\s/)
        return ['/create-issue-branch', '/cib'].includes(parts[0])
    } else {
        return false
    }
}

export function getChatOpsCommandArgument(s: string) {
    const argumentIndex = s.trim().search(/\s/)
    if (argumentIndex > 0) {
        return s.substring(argumentIndex + 1)
    } else {
        return undefined
    }
}

export function getCommentMessage(config: Config) {
    if (config && config.commentMessage) {
        return config.commentMessage
    } else {
        // eslint-disable-next-line no-template-curly-in-string
        return 'Branch [${branchName}](${repository.html_url}/tree/${branchName}) created!'
    }
}

export function getDefaultBranch(config: Config) {
    if (config && config.defaultBranch) {
        return config.defaultBranch
    } else {
        return undefined
    }
}

export function getConventionalPrTitlePrefix(config: Config, labels: Array<string>) {
    const mapping = getConventionalLabelMapping(config)
    const conventionalLabels = Object.keys(mapping).filter(k => labels.includes(k)).map(k => mapping[k]);
    const featureLabels = conventionalLabels.filter(cl => cl.prefix === 'feat')
    if (featureLabels.length > 0) {
        const emoji = featureLabels[0].emoji
        if (config.conventionalStyle === 'semver') {
            return `feat${isBreakingPr(labels, mapping) ? '!' : ''}: ${emoji}`
        } else if (config.conventionalStyle === 'semver-no-gitmoji') {
            return `feat${isBreakingPr(labels, mapping) ? '!' : ''}:`
        } else {
            return emoji
        }
    } else if (conventionalLabels.length > 0) {
        const emoji = conventionalLabels[0].emoji
        if (config.conventionalStyle === 'semver') {
            return `${conventionalLabels[0].prefix}${isBreakingPr(labels, mapping) ? '!' : ''}: ${emoji}`
        } else if (config.conventionalStyle === 'semver-no-gitmoji') {
            return `${conventionalLabels[0].prefix}${isBreakingPr(labels, mapping) ? '!' : ''}:`
        } else {
            return emoji
        }
    } else {
        if (config.conventionalStyle === 'semver') {
            return `feat${isBreakingPr(labels, mapping) ? '!' : ''}: ✨`
        } else if (config.conventionalStyle === 'semver-no-gitmoji') {
            return `feat${isBreakingPr(labels, mapping) ? '!' : ''}:`
        } else {
            return '✨'
        }
    }
}

interface ConventionalLabelMapping {
    [label: string]: { prefix: string, emoji: string, breaking: boolean }
}

export function getConventionalLabelMapping(config: Config) {
    const mapping: ConventionalLabelMapping = {
        bug: {prefix: 'fix', emoji: '🐛', breaking: false},
        dependencies: {prefix: 'fix', emoji: '⬆️', breaking: false},
        security: {prefix: 'fix', emoji: '🔒', breaking: false},
        enhancement: {prefix: 'feat', emoji: '✨', breaking: false},
        build: {prefix: 'build', emoji: '🔧', breaking: false},
        chore: {prefix: 'chore', emoji: '♻️', breaking: false},
        ci: {prefix: 'ci', emoji: '👷', breaking: false},
        documentation: {prefix: 'docs', emoji: '📝', breaking: false},
        style: {prefix: 'style', emoji: '💎', breaking: false},
        refactor: {prefix: 'refactor', emoji: '♻️', breaking: false},
        performance: {prefix: 'perf', emoji: '⚡️', breaking: false},
        test: {prefix: 'test', emoji: '✅', breaking: false},
        'breaking-change': {prefix: 'feat', emoji: '💥', breaking: true},
        'breaking change': {prefix: 'feat', emoji: '💥', breaking: true}
    }
    if (config && config.conventionalLabels) {
        Object.keys(config.conventionalLabels).forEach(prefix => {
            Object.keys(config.conventionalLabels[prefix]).forEach(label => {
                const emoji = config.conventionalLabels[prefix][label]
                const breaking = config.conventionalLabels[prefix].breaking === true
                if (prefix === 'features') {
                    prefix = 'feat'
                }
                mapping[label] = {prefix: prefix, emoji: emoji, breaking: breaking}
            })
        })
    }
    return mapping
}

function isBreakingPr(labels: Array<string>, mapping: ConventionalLabelMapping) {
    return labels.some(l => l in mapping && mapping[l].breaking)
}