const jsTokens = require('js-tokens')

const isEnvironmentVariableReference = tokens => tokens.length > 0 && tokens[0].value === '%'

const containsLowerCaseOperator = tokens => tokens.length > 0 && tokens[tokens.length - 1].value === ','

const containsUpperCaseOperator = tokens => tokens.length > 0 && tokens[tokens.length - 1].value === '^'

function interpolate (s, obj, env) {
  return s.replace(/[$]{([^}]+)}/g, (_, expression) => interpolateExpression(expression, obj, env))
}

function interpolateExpression (expression, obj, env) {
  const tokens = Array.from(jsTokens(expression)).filter(t => t.type !== 'WhiteSpace')
  const property = tokens.filter(t => t.type === 'IdentifierName').map(t => t.value)
  let value
  if (isEnvironmentVariableReference(tokens)) {
    value = interpolateEnvironmentVariable(property, env)
  } else {
    value = interpolateProperty(property, obj)
  }
  return checkOperators(tokens, value)
}

function interpolateEnvironmentVariable (property, env) {
  return env[property[0]]
}

function interpolateProperty (property, obj) {
  return property.reduce((prev, curr) => prev && prev[curr], obj)
}

function checkOperators (tokens, value) {
  if (containsLowerCaseOperator(tokens)) {
    value = value.toLowerCase()
  } else if (containsUpperCaseOperator(tokens)) {
    value = value.toUpperCase()
  }
  value = slice(tokens, value)
  return value
}

function slice (tokens, value) {
  const startOperator = tokens.findIndex(t => t.value === '[')
  const endOperator = tokens.findIndex(t => t.value === ']')
  if (startOperator === -1 || endOperator === -1 || endOperator <= startOperator) {
    return value
  }
  const rangeTokens = rewriteSignedNumbers(tokens.slice(startOperator + 1, endOperator))
  if (rangeTokens.length < 1) {
    return value
  }
  let start, end
  if (rangeTokens[0].type === 'NumericLiteral') {
    start = Number.parseInt(rangeTokens[0].value)
    if (rangeTokens.length === 3 && rangeTokens[2].type === 'NumericLiteral') {
      end = Number.parseInt(rangeTokens[2].value)
    }
  } else if (rangeTokens[0].value === ',' && rangeTokens.length === 2 && rangeTokens[1].type === 'NumericLiteral') {
    end = Number.parseInt(rangeTokens[1].value)
  }
  return value.slice(start, end)
}

function rewriteSignedNumbers (tokens) {
  const isSignToken = token => (token.value === '-' || token.value === '+')
  const result = []
  for (let i = 0; i < tokens.length; i++) {
    if (isSignToken(tokens[i]) && i < tokens.length - 1 && tokens[i + 1].type === 'NumericLiteral') {
      result.push({ type: 'NumericLiteral', value: `${tokens[i].value}${tokens[i + 1].value}` })
      i++
    } else {
      result.push(tokens[i])
    }
  }
  return result
}

module.exports = {
  interpolate: interpolate
}
