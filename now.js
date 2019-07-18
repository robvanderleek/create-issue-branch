var { serverless } = require('@chadfawcett/probot-serverless-now')
const appFn = require('./probot')
module.exports = serverless(appFn)
