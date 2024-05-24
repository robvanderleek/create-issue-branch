import nock from "nock";
import issueAssignedPayload from "./test-fixtures/issues.assigned.json";
import commentCreatedPayload from "./test-fixtures/issue_comment.created.json";
import myProbotApp from "../src/probot";
import {Probot, ProbotOctokit} from "probot";
import {OctokitOptions} from "probot/lib/types";

export function nockInstallation(installation: object) {
    nock('https://api.github.com')
        .persist()
        .get('/users/robvanderleek/installation')
        .reply(200, installation)
}

export function issueAssignedWithLabelsPayload(...labels: Array<string>) {
    return payloadWithLabels(issueAssignedPayload, labels)
}

export function commentCreatedWithLabelsPayload(...labels: Array<string>) {
    return payloadWithLabels(commentCreatedPayload, labels)
}

function payloadWithLabels(payload: any, labels: Array<string>) {
    const issueCopy = JSON.parse(JSON.stringify(payload))
    labels.forEach(l => issueCopy.issue.labels.push({name: l}))
    return issueCopy
}

export function privateOrganizationRepoPayload(payload: any) {
    const payloadCopy = JSON.parse(JSON.stringify(payload))
    payloadCopy.repository.private = true
    payloadCopy.repository.owner.type = 'Organization'
    return payloadCopy
}

export function nockEmptyConfig() {
    nock('https://api.github.com')
        .persist()
        .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yml')
        .reply(404)
        .get('/repos/robvanderleek/.github/contents/.github%2Fissue-branch.yml')
        .reply(404)
        .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yaml')
        .reply(404)
        .get('/repos/robvanderleek/.github/contents/.github%2Fissue-branch.yaml')
        .reply(404)
}

export function nockConfig(yamlConfig: string) {
    nock('https://api.github.com')
        .persist()
        .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yml')
        .reply(200, yamlConfig)
}

export function nockGlobalConfig(yamlConfig: string) {
    nock('https://api.github.com')
        .persist()
        .get('/repos/robvanderleek/create-issue-branch/contents/.github%2Fissue-branch.yml')
        .reply(404)
        .get('/repos/robvanderleek/.github/contents/.github%2Fissue-branch.yml')
        .reply(200, yamlConfig)
}

export function nockMarketplacePlan(plan: object) {
    nock('https://api.github.com')
        .persist()
        .get('/marketplace_listing/accounts/5324924')
        .reply(200, plan)
}

export function nockExistingBranch(name: string, sha: string) {
    nock('https://api.github.com')
        .get(`/repos/robvanderleek/create-issue-branch/git/ref/heads%2F${encodeURIComponent(name)}`)
        .reply(200, {object: {sha: sha}})
}

export function nockPulls(branch: string, result: any) {
    nock('https://api.github.com')
        .get(`/repos/robvanderleek/create-issue-branch/pulls?head=robvanderleek%3A${encodeURIComponent(branch)}`)
        .reply(200, result)
}

export function nockIssue(number: number, result: any) {
    nock('https://api.github.com')
        .get(`/repos/robvanderleek/create-issue-branch/issues/${number}`)
        .reply(200, result)
}

export function nockNonExistingBranch(name: string) {
    nock('https://api.github.com')
        .get(`/repos/robvanderleek/create-issue-branch/git/ref/heads%2F${encodeURIComponent(name)}`)
        .reply(404)
}

export function nockUpdateBranch(name: string) {
    nock('https://api.github.com').patch(`/repos/robvanderleek/create-issue-branch/git/refs/heads%2F${name}`).reply(200)
}

export function nockUpdatePull(number: number) {
    nock('https://api.github.com').patch(`/repos/robvanderleek/create-issue-branch/pulls/${number}`).reply(200)
}

export function nockCommentCreated() {
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/issues/1/comments')
        .reply(200)
}

export function nockCommitTreeSha(sha: string, treeSha: string) {
    nock('https://api.github.com').get(`/repos/robvanderleek/create-issue-branch/git/commits/${sha}`)
        .reply(200, {tree: {sha: treeSha}})
}

export function nockCommit() {
    nock('https://api.github.com').post('/repos/robvanderleek/create-issue-branch/git/commits').reply(200)
}

export function nockCreateBranch() {
    nock('https://api.github.com')
        .post('/repos/robvanderleek/create-issue-branch/git/refs')
        .reply(200)
}

export function nockCreatePR() {
    nock('https://api.github.com').post('/repos/robvanderleek/create-issue-branch/pulls').reply(200, {number: 123})
}

export function nockIssueLabels() {
    nock('https://api.github.com').post('/repos/robvanderleek/create-issue-branch/issues/123/labels').reply(200)
}

export function nockIssueAssignees() {
    nock('https://api.github.com').post('/repos/robvanderleek/create-issue-branch/issues/123/assignees').reply(200)
}

export function getDefaultContext(): any {
    return {
        payload: {
            repository: {
                owner: {
                    login: 'robvanderleek'
                }, //
                name: 'create-issue-branch', //
                default_branch: 'master'
            }, //
            issue: {number: 1, title: 'Hello world', body: '', milestone: undefined, labels: []}
        }, //
        octokit: {
            pulls: {
                create: () => {
                }
            }, //
            git: {
                getCommit: () => ({data: {tree: {sha: '1234abcd'}}}),
                createCommit: () => ({data: {sha: 'abcd1234'}}),
                createRef: () => {
                },
                updateRef: () => {
                }
            }, //
            issues: {
                createComment: () => {
                }
            },
            graphql: (_: any, {message}: { message: string }) => {
            }
        }, //
        issue: () => {
        }
    }
}

export function initNock() {
    nock.disableNetConnect()
    const logRequest = (r: any) => {
        throw new Error(`No match: ${r.path}, method: ${r.method}, host: ${r.options.host}`)
    }
    nock.emitter.on('no match', req => {
        logRequest(req)
    })
}

export function initProbot() {
    const result = new Probot({
        appId: 1, //
        githubToken: 'test', // Disable throttling & retrying requests for easier testing
        Octokit: ProbotOctokit.defaults((instanceOptions: OctokitOptions) => {
            return {
                ...instanceOptions,
                retry: {enabled: false},
                throttle: {enabled: false}
            }
        })
    });
    const app = result.load(myProbotApp);
    // @ts-ignore
    app.app = {
        getInstallationAccessToken: () => Promise.resolve('test')
    }
    nock.cleanAll();
    nockAccessToken();
    return result;
}

function nockAccessToken() {
    nock('https://api.github.com')
        .post('/app/installations/1296032/access_tokens')
        .reply(200, {token: 'test'})
}