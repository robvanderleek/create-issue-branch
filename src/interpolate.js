const containsLowerCaseOperator = path => path.length > 0 && path.endsWith(',')

const containsUpperCaseOperator = path => path.length > 0 && path.endsWith('^')

function interpolate (s, obj, env) {
  return s.replace(/[$]{([^}]+)}/g, (_, expression) => interpolateExpression(expression, obj, env))
}

function interpolateExpression (expression, obj, env) {
  expression = expression.trim()
  if (containsLowerCaseOperator(expression)) {
    const property = expression.substring(0, expression.length - 1).split('.')
    return interpolateProperty(property, obj, env).toLowerCase()
  } else if (containsUpperCaseOperator(expression)) {
    const property = expression.substring(0, expression.length - 1).split('.')
    return interpolateProperty(property, obj, env).toUpperCase()
  } else {
    const property = expression.split('.')
    return interpolateProperty(property, obj, env)
  }
}

function interpolateProperty (property, obj, env) {
  if (property[0].startsWith('%')) {
    return env[property[0].slice(1)]
  } else {
    return property.reduce((prev, curr) => prev && prev[curr], obj)
  }
}

module.exports = {
  interpolate: interpolate
}
