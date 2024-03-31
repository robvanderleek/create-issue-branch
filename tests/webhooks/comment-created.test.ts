import {Probot} from "probot";
import commentCreatedPayload from "../test-fixtures/issue_comment.created.json";
import {initNock, initProbot, nockConfig} from "../test-helpers";

let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if configured to skip', async () => {
    nockConfig('mode: immediate\nbranches:\n  - label: bug\n    skip: true\n');

    await probot.receive({id: '', name: 'issue_comment', payload: commentCreatedPayload as any});
})
