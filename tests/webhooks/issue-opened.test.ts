import {Probot} from "probot";
import issueOpenedPayload from "../test-fixtures/issues.opened.json" with {type: "json"};
import {
    initNock,
    initProbot,
    nockConfig,
    nockCreateBranch,
    nockCreateComment,
    nockCreatePR,
    nockExistingBranch,
    nockNonExistingBranch
} from "../test-helpers.ts";
import {beforeAll, beforeEach, expect, test} from "vitest";

let probot: Probot

beforeAll(() => {
    initNock();
})

beforeEach(() => {
    probot = initProbot();
})

test('do nothing if configured to skip', async () => {
    nockConfig('mode: immediate\nbranches:\n  - label: bug\n    skip: true\n');

    await probot.receive({id: '', name: 'issues', payload: issueOpenedPayload as any});
})

test('conventional PR title', async () => {
    nockConfig('mode: immediate\nopenDraftPR: true\nconventionalPrTitles: true');
    nockNonExistingBranch('issue-1-Test_issue');
    nockExistingBranch('main', '12345678');
    nockCreateBranch();
    nockCreateComment();
    nockExistingBranch('main', '12345678');
    nockExistingBranch('issue-1-Test_issue', '87654321');
    const nockMock = nockCreatePR(2);

    await probot.receive({id: '', name: 'issues', payload: issueOpenedPayload as any})

    expect(nockMock.pendingMocks()).toHaveLength(0);
})
