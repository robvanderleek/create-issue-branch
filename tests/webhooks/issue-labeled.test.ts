import {Probot} from "probot";
import issueLabeledPayload from "../test-fixtures/issues.labeled.json" with {type: "json"};
import {initNock, initProbot, nockConfig, nockEmptyConfig, nockPulls, nockUpdatePull} from "../test-helpers.ts";
import {beforeAll, beforeEach, expect, test} from "vitest";


let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if not configured', async () => {
    nockEmptyConfig()

    await probot.receive({id: '', name: 'issues', payload: issueLabeledPayload as any})
})

test('prefix PR title', async () => {
    nockConfig('conventionalPrTitles: true');
    nockPulls('issue-44-New_issue', [{number: 45, title: 'New issue', labels: []}]);
    const nockMock = nockUpdatePull(45);

    await probot.receive({id: '', name: 'issues', payload: issueLabeledPayload as any});

    expect(nockMock.pendingMocks()).toHaveLength(0);
})

test('prefix PR title semver-no-gitmoji style', async () => {
    nockConfig('conventionalPrTitles: true\nconventionalStyle: semver-no-gitmoji');
    nockPulls('issue-44-New_issue', [{number: 45, title: 'New issue', labels: []}]);
    const nockMock = nockUpdatePull(45);

    await probot.receive({id: '', name: 'issues', payload: issueLabeledPayload as any});

    expect(nockMock.pendingMocks()).toHaveLength(0);
})
