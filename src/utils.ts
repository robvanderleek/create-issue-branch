import wcMatch from "wildcard-match";
import {Analytics} from "analytics";
import {Probot} from "probot";

const googleAnalytics = require('@analytics/google-analytics').default
// Regexp below is a stricter implementation of https://git-scm.com/docs/git-check-ref-format
const GIT_SAFE_REGEXP = /([.~^:?*[\]@{}<>|\\"'()`,]|\s)+/g

export function makePrefixGitSafe(s: string, {replaceChars = '', replacementChar = '_'} = {}) {
    let result = trim(s, ' ').replace(GIT_SAFE_REGEXP, replacementChar)
    if (replaceChars.length > 0) {
        result = result.replace(new RegExp(`[${replaceChars}]`, 'g'), replacementChar)
    }
    return result
}

export function makeGitSafe(s: string, {replaceChars = '', replacementChar = '_'} = {}) {
    let result = makePrefixGitSafe(s, {replaceChars: replaceChars, replacementChar: replacementChar})
    result = trim(result, replacementChar)
    result = result.replace(/[/]+$/, '')
    return result
}

function trim(str: string, ch: string) {
    let start = 0
    let end = str.length
    while (start < end && str[start] === ch) ++start
    while (end > start && str[end - 1] === ch) --end
    return (start > 0 || end < str.length) ? str.substring(start, end) : str
}

export function wildcardMatch(pattern: string, s: string) {
    const isMatch = wcMatch(pattern, false)
    return isMatch(s)
}

export function isProduction() {
    return process.env.NODE_ENV === 'production'
}

const analytics = Analytics({
    app: 'create-issue-branch', //
    plugins: [googleAnalytics({
        trackingId: 'UA-207350952-1'
    })]
})

export function pushMetric(owner: string, log: any) {
    analytics.identify(owner, () => {
        analytics.track('branch_created', {category: 'Branches'}, () => log.info('Pushed metric to Google Analytics'))
            .catch(err => log.error('Could not push metric to Google Analytics: ' + err))
    }).catch(err => log.error('Could not identify user: ' + err))
}

export function isRunningInGitHubActions() {
    return process.env.GITHUB_ACTIONS === 'true'
}

export function getStringLengthInBytes(str: string) {
    return (new TextEncoder().encode(str)).length
}

export function trimStringToByteLength(str: string, length: number) {
    if (getStringLengthInBytes(str) <= length) {
        return str
    } else {
        let result = str.substring(0, length)
        while (getStringLengthInBytes(result) > length) {
            result = Array.from(str).slice(0, [...result].length - 1).join('')
        }
        return result
    }
}

export function logMemoryUsage(app: Probot) {
    const usage = Math.round(process.memoryUsage().rss / 1024 / 1024)
    if (usage >= 150) {
        app.log.info(`Total memory: ${usage} Mb`)
    } else {
        app.log.debug(`Total memory: ${usage} Mb`)
    }
}

export function formatAsExpandingMarkdown(title: string, content: string) {
    let result = ''
    result += '<details>\n'
    result += `<summary><b>${title}</b></summary>\n`
    result += '\n'
    result += `${content}\n`
    result += '</details>\n'
    return result
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}