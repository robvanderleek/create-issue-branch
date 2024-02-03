import jsTokens, {Token} from "js-tokens";

const isEnvironmentVariableReference = (tokens: Array<Token>) => tokens.length > 0 && tokens[0].value === '%';

const containsLowerCaseOperator = (tokens: Array<Token>) => tokens.length > 0 && tokens[tokens.length - 1].value === ',';

const containsUpperCaseOperator = (tokens: Array<Token>) => tokens.length > 0 && tokens[tokens.length - 1].value === '^';

const containsLeftPadOperator = (tokens: Array<Token>) => tokens.length > 2 && tokens[tokens.length - 2].value === '%' &&
    tokens[tokens.length - 1].type === 'NumericLiteral';

export function interpolate(s: string, obj: object, env?: object) {
    return s.replace(/[$]{([^}]+)}/g, (_, expression) => interpolateExpression(expression, obj, env))
}

function interpolateExpression(expression: string, obj: object, env?: object) {
    const tokens = Array.from(jsTokens(expression)).filter(t => t.type !== 'WhiteSpace')
    const property = tokens.filter(t => t.type === 'IdentifierName').map(t => t.value)
    let value
    if (isEnvironmentVariableReference(tokens)) {
        value = interpolateEnvironmentVariable(property, env)
    } else {
        value = interpolateProperty(property, obj)
    }
    return checkOperators(tokens, String(value))
}

function interpolateEnvironmentVariable(property: Array<string>, env: any) {
    return env[property[0]]
}

function interpolateProperty(property: Array<string>, obj: object) {
    return property.reduce((prev: any, curr) => prev && prev[curr], obj)
}

function checkOperators(tokens: Array<Token>, value: string) {
    if (containsLowerCaseOperator(tokens)) {
        value = value.toLowerCase()
    } else if (containsUpperCaseOperator(tokens)) {
        value = value.toUpperCase()
    } else if (containsLeftPadOperator(tokens)) {
        const padding = parseInt(tokens[tokens.length - 1].value)
        value = value.padStart(padding, '0')
    }
    value = slice(tokens, value)
    return value
}

function slice(tokens: Array<Token>, value: string) {
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

function rewriteSignedNumbers(tokens: Array<Token>) {
    const isSignToken = (token: Token) => (token.value === '-' || token.value === '+')
    const result = []
    for (let i = 0; i < tokens.length; i++) {
        if (isSignToken(tokens[i]) && i < tokens.length - 1 && tokens[i + 1].type === 'NumericLiteral') {
            result.push({type: 'NumericLiteral', value: `${tokens[i].value}${tokens[i + 1].value}`})
            i++
        } else {
            result.push(tokens[i])
        }
    }
    return result
}