import {Probot} from "probot";

import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import marketplaceProPlan from "./test-fixtures/marketplace_pro_plan.json";
import {initNock, initProbot} from "./test-helpers.ts";
import {isFreePaidSubscription, isPaidPlan} from "../src/plans.ts";
import {beforeAll, beforeEach, expect, test} from "vitest";


let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('installed as marketplace pro (trial) plan', async () => {
    const ctx = {
        octokit: {
            apps: {getSubscriptionPlanForAccount: () => ({data: marketplaceProPlan})}
        }, //
        payload: issueAssignedPayload
    }

    const result = await isPaidPlan(probot, ctx as any)

    expect(result).toBeTruthy()
})

test('free Pro subscription', async () => {
    const issueAssignedPayloadCopy = JSON.parse(JSON.stringify(issueAssignedPayload));
    issueAssignedPayloadCopy.repository.owner.login = 'PWrInSpace';
    const ctx = {
        payload: issueAssignedPayloadCopy
    };

    const result = isFreePaidSubscription(probot, ctx as any);

    expect(result).toBeTruthy();
})
