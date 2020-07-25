const AWS = require('aws-sdk')

function makePrefixGitSafe (s) {
  const regexp = /(?![-/])[\W]+/g
  return trim(s, ' ').replace(regexp, '_')
}

function makeGitSafe (s) {
  const regexp = /(?![-/])[\W]+/g
  const result = trim(s, ' ').replace(regexp, '_').replace(/[/]+$/, '')
  return trim(result, '_')
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
      properties = path.substring(0, path.length - 1).split('.');
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
  const regExp = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  return regExp.test(s)
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

module.exports = {
  makePrefixGitSafe: makePrefixGitSafe,
  makeGitSafe: makeGitSafe,
  interpolate: interpolate,
  wildcardMatch: wildcardMatch,
  isProduction: isProduction,
  pushMetric: pushMetric
}
