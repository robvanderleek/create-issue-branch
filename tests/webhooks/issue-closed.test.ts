import {Probot} from "probot";
import issueOpenedPayload from "../test-fixtures/issues.opened.json" with {type: "json"};
import {
    initNock,
    initProbot,
    nockConfig,
    nockDeleteBranch,
    nockEmptyConfig,
    nockExistingBranch
} from "../test-helpers.ts";
import {beforeAll, beforeEach, expect, test} from "vitest";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if not configured', async () => {
    nockEmptyConfig();
    const nockMock = nockDeleteBranch('issue-1-Test_issue');
    const payload = issueOpenedPayload;
    payload.action = 'closed';

    await probot.receive({id: '', name: 'issues', payload: payload as any});

    expect(nockMock.pendingMocks()).toHaveLength(1);
});

test('do delete branch', async () => {
    nockConfig('autoDeleteBranch: true');
    nockExistingBranch('issue-1-Test_issue', 'abcd1234');
    const nockMock = nockDeleteBranch('issue-1-Test_issue');
    const payload = issueOpenedPayload;
    payload.action = 'closed';

    await probot.receive({id: '', name: 'issues', payload: payload as any});

    expect(nockMock.pendingMocks()).toHaveLength(0);
});
