import {Probot} from "probot";
import issueOpenedPayload from "../test-fixtures/issues.opened.json";
import {initNock, initProbot, nockConfig, nockEmptyConfig, nockExistingBranch} from "../test-helpers";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if not configured', async () => {
    nockEmptyConfig();
    const payload = issueOpenedPayload;
    payload.action = 'closed';
    const deleteRef = jest.fn()
    // @ts-ignore
    probot.state.octokit.git.deleteRef = deleteRef

    await probot.receive({id: '', name: 'issues', payload: payload as any});

    expect(deleteRef).toHaveBeenCalledTimes(0);
});

test('do delete branch', async () => {
    nockConfig('autoDeleteBranch: true');
    nockExistingBranch('issue-1-Test_issue', 'abcd1234');
    const payload = issueOpenedPayload;
    payload.action = 'closed';
    const deleteRef = jest.fn()
    // @ts-ignore
    probot.state.octokit.git.deleteRef = deleteRef

    await probot.receive({id: '', name: 'issues', payload: payload as any});

    expect(deleteRef).toHaveBeenCalledTimes(1);
});
