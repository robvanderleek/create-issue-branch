import {createProbot} from "probot";
import app from "../../probot";
import {VercelRequest, VercelResponse} from "@vercel/node";

const probot = createProbot()
const loadingApp = probot.load(app)

export default async function (request: VercelRequest, response: VercelResponse) {
    try {
        await loadingApp;
        const eventName = request.headers['X-GitHub-Event'] || request.headers['x-github-event'];
        await probot.webhooks.verifyAndReceive({
            id: request.headers['X-GitHub-Delivery'] || request.headers['x-github-delivery'],
            name: eventName,
            signature: request.headers['X-Hub-Signature-256'] || request.headers['x-hub-signature-256'],
            payload: request.body
        } as any);
        response.status(200).json({ok: 'true'});
    } catch (error: any) {
        probot.log.info(error);
        response.status(error.status || 500);
    }
}