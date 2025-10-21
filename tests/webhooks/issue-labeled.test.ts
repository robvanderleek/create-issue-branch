import {Probot} from "probot";
import issueLabeledPayload from "../test-fixtures/issues.labeled.json";
import {initNock, initProbot, nockConfig, nockEmptyConfig, nockPulls, nockUpdatePull} from "../test-helpers.ts";
import {beforeAll, beforeEach, expect, test, vi} from "vitest";


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
    nockUpdatePull(45);
    const updatePr = vi.fn();
    // @ts-ignore
    probot.state.octokit.pulls.update = updatePr;

    await probot.receive({id: '', name: 'issues', payload: issueLabeledPayload as any});

    expect(updatePr).toHaveBeenCalledWith({
        pull_number: 45, title: 'fix: 🐛 New issue', owner: 'robvanderleek', repo: 'create-issue-branch'
    });
})

test('prefix PR title semver-no-gitmoji style', async () => {
    nockConfig('conventionalPrTitles: true\nconventionalStyle: semver-no-gitmoji')
    nockPulls('issue-44-New_issue', [{number: 45, title: 'New issue', labels: []}])
    nockUpdatePull(45)
    const updatePr = vi.fn()
    // @ts-ignore
    probot.state.octokit.pulls.update = updatePr

    await probot.receive({id: '', name: 'issues', payload: issueLabeledPayload as any})

    expect(updatePr).toHaveBeenCalledWith({
        pull_number: 45, title: 'fix: New issue', owner: 'robvanderleek', repo: 'create-issue-branch'
    })
})
