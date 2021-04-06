const helpers = require('./test-helpers')
const issueAssignedPayload = require('./test-fixtures/issues.assigned.json')
const userInstallation = require('./test-fixtures/user_installation.json')
const marketplaceFreePlan = require('./test-fixtures/marketplace_free_plan.json')
const marketplaceProPlan = require('./test-fixtures/marketplace_pro_plan.json')
const plans = require('../src/plans')

let probot

beforeAll(() => {
  helpers.initNock()
})

beforeEach(() => {
  probot = helpers.initProbot()
})

test('installed as app but before pro plan introduction', async () => {
  helpers.nockInstallation(userInstallation)

  const result = await plans.isProPlan(probot, { payload: issueAssignedPayload })

  expect(result).toBeTruthy()
})

test('installed as app but after pro plan introduction', async () => {
  const userInstallationCopy = JSON.parse(JSON.stringify(userInstallation))
  userInstallationCopy.created_at = '2021-04-08T19:51:53.000Z'
  helpers.nockInstallation(userInstallationCopy)

  const result = await plans.isProPlan(probot, { payload: issueAssignedPayload })

  expect(result).toBeFalsy()
})

test('installed as marketplace free plan', async () => {
  const ctx = {
    octokit: {
      apps: { getSubscriptionPlanForAccount: () => ({ data: marketplaceFreePlan }) }
    }, //
    payload: issueAssignedPayload
  }

  const result = await plans.isProPlan(probot, ctx)

  expect(result).toBeFalsy()
})

test('installed as marketplace pro (trial) plan', async () => {
  const ctx = {
    octokit: {
      apps: { getSubscriptionPlanForAccount: () => ({ data: marketplaceProPlan }) }
    }, //
    payload: issueAssignedPayload
  }

  const result = await plans.isProPlan(probot, ctx)

  expect(result).toBeTruthy()
})
