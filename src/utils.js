const AWS = require('aws-sdk')
const wcMatch = require('wildcard-match')

function makePrefixGitSafe (s) {
  const regexp = /(?![-/])[\W]+/g
  return trim(s, ' ').replace(regexp, '_')
}

function makeGitSafe (s, replacementChar = '_') {
  const regexp = /(?![-/])[\W]+/g
  const result = trim(s, ' ').replace(regexp, replacementChar).replace(/[/]+$/, '')
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

function pushMetric (log) {
  const namespace = process.env.CLOUDWATCH_NAMESPACE ? process.env.CLOUDWATCH_NAMESPACE : 'create_issue_branch_staging'
  const metric = {
    MetricData: [{
      MetricName: 'branch_created', Unit: 'Count', Value: 1
    }], //
    Namespace: namespace
  }
  const cloudwatch = new AWS.CloudWatch()
  cloudwatch.putMetricData(metric, (err) => {
    if (err) {
      log.error('Could not push metric to CloudWatch: ' + err)
    } else {
      log.info('Pushed metric to CloudWatch')
    }
  })
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
  app.log('Total memory: ' + Math.round(process.memoryUsage().rss / 1024 / 1024) + ' Mb')
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
