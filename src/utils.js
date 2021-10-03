const { Analytics } = require('analytics')
const googleAnalytics = require('@analytics/google-analytics').default
const wcMatch = require('wildcard-match')

// Regexp below is a stricter implementation of https://git-scm.com/docs/git-check-ref-format
const GIT_SAFE_REGEXP = /([.~^:?*[\]@{}\\"()`,]|\s)+/g

function makePrefixGitSafe (s) {
  return trim(s, ' ').replace(GIT_SAFE_REGEXP, '_')
}

function makeGitSafe (s, replacementChar = '_') {
  const result = trim(s, ' ').replace(GIT_SAFE_REGEXP, replacementChar).replace(/[/]+$/, '')
  return trim(result, replacementChar)
}

function trim (str, ch) {
  let start = 0
  let end = str.length
  while (start < end && str[start] === ch) ++start
  while (end > start && str[end - 1] === ch) --end
  return (start > 0 || end < str.length) ? str.substring(start, end) : str
}

function interpolate (s, obj) {
  const containsLowerCaseOperator = path => path.length > 0 && path.endsWith(',')
  const containsUpperCaseOperator = path => path.length > 0 && path.endsWith('^')
  return s.replace(/[$]{([^}]+)}/g, function (_, path) {
    let properties
    if (containsLowerCaseOperator(path) || containsUpperCaseOperator(path)) {
      properties = path.substring(0, path.length - 1).split('.')
    } else {
      properties = path.split('.')
    }
    const interpolated = properties.reduce((prev, curr) => prev && prev[curr], obj)
    if (containsLowerCaseOperator(path)) {
      return interpolated.toLowerCase()
    } else if (containsUpperCaseOperator(path)) {
      return interpolated.toUpperCase()
    } else {
      return interpolated
    }
  })
}

function wildcardMatch (pattern, s) {
  const isMatch = wcMatch(pattern, false)
  return isMatch(s)
}

function isProduction () {
  return process.env.NODE_ENV === 'production'
}

const analytics = Analytics({
  app: 'create-issue-branch', //
  plugins: [googleAnalytics({
    trackingId: 'UA-207350952-1'
  })]
})

function pushMetric (owner, log) {
  analytics.identify(owner, () => {
    analytics.track('branch_created', { category: 'Branches' }, () => log.info('Pushed metric to Google Analytics'))
      .catch(err => log.error('Could not push metric to Google Analytics: ' + err))
  }).catch(err => log.error('Could not identify user: ' + err))
}

function isRunningInGitHubActions () {
  return process.env.GITHUB_ACTIONS === 'true'
}

function getStringLengthInBytes (str) {
  return (new TextEncoder().encode(str)).length
}

function trimStringToByteLength (str, length) {
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

function logMemoryUsage (app) {
  const usage = Math.round(process.memoryUsage().rss / 1024 / 1024)
  if (usage >= 150) {
    app.log.info(`Total memory: ${usage} Mb`)
  } else {
    app.log.debug(`Total memory: ${usage} Mb`)
  }
}

module.exports = {
  makePrefixGitSafe: makePrefixGitSafe,
  makeGitSafe: makeGitSafe,
  interpolate: interpolate,
  wildcardMatch: wildcardMatch,
  isProduction: isProduction,
  pushMetric: pushMetric,
  isRunningInGitHubActions: isRunningInGitHubActions,
  getStringLengthInBytes: getStringLengthInBytes,
  trimStringToByteLength: trimStringToByteLength,
  logMemoryUsage: logMemoryUsage
}
