import {Probot} from "probot";
import issueAssignedPayload from "../test-fixtures/issues.assigned.json";
import {initNock, initProbot, nockConfig} from "../test-helpers.ts";
import {beforeAll, beforeEach, test} from "vitest";


let probot: Probot

beforeAll(() => {
    initNock()
})

beforeEach(() => {
    probot = initProbot()
})

test('do nothing if configured to skip', async () => {
    nockConfig('mode: auto\nbranches:\n  - label: bug\n    skip: true\n');

    const payload = issueAssignedPayload;
    payload.issue.labels = [{
        "id": 2890444475,
        "node_id": "MDU6TGFiZWwyODkwNDQ0NDc1",
        "url": "https://api.github.com/repos/robvanderleek/create-issue-branch/labels/bug",
        "name": "bug",
        "color": "d73a4a",
        "default": true,
        "description": "Something isn't working"
    }] as any;

    await probot.receive({id: '', name: 'issues', payload: payload as any});
});
