import {Probot} from "probot";
import pullRequestLabeledPayload from "../test-fixtures/pull_request.labeled.json";
import {initNock, initProbot, nockConfig, nockEmptyConfig, nockIssue, nockUpdatePull} from "../test-helpers";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if not configured', async () => {
    nockEmptyConfig()

    await probot.receive({id: '', name: 'pull_request', payload: pullRequestLabeledPayload as any})
})

test('prefix PR title', async () => {
    nockConfig('conventionalPrTitles: true')
    nockIssue(672, {labels: []})
    nockUpdatePull(675)

    await probot.receive({id: '', name: 'pull_request', payload: pullRequestLabeledPayload as any})
})
