import {Probot} from "probot";

import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import userInstallation from "./test-fixtures/user_installation.json";
import marketplaceFreePlan from "./test-fixtures/marketplace_free_plan.json";
import marketplaceProPlan from "./test-fixtures/marketplace_pro_plan.json";
import {initNock, initProbot, nockInstallation} from "./test-helpers";
import {isActivatedBeforeProPlanIntroduction, isProPlan} from "../src/plans";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('installed as app but before pro plan introduction', async () => {
    nockInstallation(userInstallation)

    let result = await isProPlan(probot, {payload: issueAssignedPayload} as any);

    expect(result).toBeFalsy();
    result = await isActivatedBeforeProPlanIntroduction(probot, {payload: issueAssignedPayload} as any);
    expect(result).toBeTruthy();
})

test('installed as app but after pro plan introduction', async () => {
    const userInstallationCopy = JSON.parse(JSON.stringify(userInstallation))
    userInstallationCopy.created_at = '2021-04-08T19:51:53.000Z'
    nockInstallation(userInstallationCopy)

    let result = await isProPlan(probot, {payload: issueAssignedPayload} as any);

    expect(result).toBeFalsy();
    result = await isActivatedBeforeProPlanIntroduction(probot, {payload: issueAssignedPayload} as any);
    expect(result).toBeFalsy();
})

test('installed as marketplace free plan but before pro plan introduction', async () => {
    const ctx = {
        octokit: {
            apps: {getSubscriptionPlanForAccount: () => ({data: marketplaceFreePlan})}
        }, //
        payload: issueAssignedPayload
    }

    let result = await isProPlan(probot, ctx as any)

    expect(result).toBeFalsy()
    result = await isActivatedBeforeProPlanIntroduction(probot, ctx as any)
    expect(result).toBeTruthy()
})

test('installed as marketplace free plan but after pro plan introduction', async () => {
    const marketplaceFreePlanCopy = JSON.parse(JSON.stringify(marketplaceFreePlan))
    marketplaceFreePlanCopy.marketplace_purchase.updated_at = '2021-04-08T19:51:53.000Z'
    const ctx = {
        octokit: {
            apps: {getSubscriptionPlanForAccount: () => ({data: marketplaceFreePlanCopy})}
        }, //
        payload: issueAssignedPayload
    }

    let result = await isProPlan(probot, ctx as any)

    expect(result).toBeFalsy()
    result = await isActivatedBeforeProPlanIntroduction(probot, ctx as any)
    expect(result).toBeFalsy()
})

test('installed as marketplace pro (trial) plan', async () => {
    const ctx = {
        octokit: {
            apps: {getSubscriptionPlanForAccount: () => ({data: marketplaceProPlan})}
        }, //
        payload: issueAssignedPayload
    }

    const result = await isProPlan(probot, ctx as any)

    expect(result).toBeTruthy()
})

test('free Pro subscription', async () => {
    const issueAssignedPayloadCopy = JSON.parse(JSON.stringify(issueAssignedPayload))
    issueAssignedPayloadCopy.repository.owner.login = 'PWrInSpace'
    const ctx = {
        payload: issueAssignedPayloadCopy
    }

    const result = await isProPlan(probot, ctx as any)

    expect(result).toBeTruthy()
})
