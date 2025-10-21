import {Probot} from "probot";
import marketplacePurchasePayload from "./test-fixtures/marketplace_purchase.json";
import marketplaceCancellationPayload from "./test-fixtures/marketplace_cancellation.json";
import marketplaceDowngradePayload from "./test-fixtures/marketplace_downgrade.json";
import marketplacePendingChangePayload from "./test-fixtures/marketplace_pending_change.json";
import {initNock, initProbot} from "./test-helpers.ts";
import {beforeAll, beforeEach, test} from "vitest";


let probot: Probot;

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('handle marketplace purchase', async () => {
    await probot.receive({id: '', name: 'marketplace_purchase', payload: marketplacePurchasePayload as any})
})

test('handle marketplace cancellation', async () => {
    await probot.receive({id: '', name: 'marketplace_purchase', payload: marketplaceCancellationPayload as any})
})

test('handle marketplace downgrade', async () => {
    await probot.receive({id: '', name: 'marketplace_purchase', payload: marketplaceDowngradePayload as any})
})

test('handle pending change', async () => {
    await probot.receive({id: '', name: 'marketplace_purchase', payload: marketplacePendingChangePayload as any})
})
