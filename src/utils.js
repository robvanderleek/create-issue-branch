function makeGitSafe (s, isPrefix = false) {
  const regexp = isPrefix ? /(?![-/])[\W]+/g : /(?![-])[\W]+/g
  const result = trim(s, ' ').replace(regexp, '_')
  return isPrefix ? result : trim(result, '_')
}

function trim (str, ch) {
  let start = 0
  let end = str.length
  while (start < end && str[start] === ch) ++start
  while (end > start && str[end - 1] === ch) --end
  return (start > 0 || end < str.length) ? str.substring(start, end) : str
}

function interpolate (s, obj) {
  return s.replace(/[$]{([^}]+)}/g, function (_, path) {
    const properties = path.split('.')
    return properties.reduce((prev, curr) => prev && prev[curr], obj)
  })
}

function wildcardMatch (pattern, s) {
  const regExp = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
  return regExp.test(s)
}

module.exports.makeGitSafe = makeGitSafe
module.exports.interpolate = interpolate
module.exports.wildcardMatch = wildcardMatch
