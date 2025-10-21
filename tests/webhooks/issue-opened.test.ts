import {Probot} from "probot";
import issueOpenedPayload from "../test-fixtures/issues.opened.json";
import {
    initNock,
    initProbot,
    nockConfig,
    nockCreateBranch,
    nockCreateComment,
    nockExistingBranch,
    nockNonExistingBranch
} from "../test-helpers";

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

    const createPr = jest.fn();
    createPr.mockResolvedValue({data: {number: 2}});
    // @ts-ignore
    probot.state.octokit.pulls.create = createPr;

    await probot.receive({id: '', name: 'issues', payload: issueOpenedPayload as any})

    expect(createPr).toHaveBeenCalledWith({
        owner: 'robvanderleek',
        repo: 'create-issue-branch',
        head: 'issue-1-Test_issue',
        base: 'main',
        title: 'fix: 🐛 Test issue...',
        body: 'closes #1',
        draft: true
    });
})