import {createProbot} from "probot";
import app from "../../probot";
import {VercelRequest, VercelResponse} from "@vercel/node";

const probot = createProbot()
const loadingApp = probot.load(app)

function getBody(request: VercelRequest): Promise<string> {
    return new Promise((resolve) => {
        const bodyParts: Uint8Array[] = [];
        let body;
        request.on('data', (chunk) => {
            bodyParts.push(chunk);
        }).on('end', async () => {
            body = Buffer.concat(bodyParts).toString();
            resolve(body)
        });
    });
}

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function (request: VercelRequest, response: VercelResponse) {
    try {
        await loadingApp;
        const payload = await getBody(request);
        const id = request.headers['X-GitHub-Delivery'] || request.headers['x-github-delivery'];
        const eventName = request.headers['X-GitHub-Event'] || request.headers['x-github-event'];
        const signature = request.headers['X-Hub-Signature-256'] || request.headers['x-hub-signature-256'];
        probot.webhooks.onError((error) => {
            probot.log.info(error.message);
        });
        await probot.webhooks.verifyAndReceive({
            id: id,
            name: eventName,
            signature: signature,
            payload: payload
        } as any);
        response.status(200).json({ok: 'true'});
    } catch (error: any) {
        probot.log.info(error);
        response.status(error.status || 500);
    }
}