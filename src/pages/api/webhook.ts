import {createProbot} from "probot";
import app from "../../probot";
import {VercelRequest, VercelResponse} from "@vercel/node";

// export const config = {
//     api: {
//         bodyParser: false,
//     },
// };

const probot = createProbot()
const loadingApp = probot.load(app)

export default async function (request: Request, response: VercelResponse) {
    try {
        await loadingApp;
        console.log(request.headers);
        const payload = await request.text();
        console.log(payload);
        console.log(request.headers.get('X-Hub-Signature-256') || request.headers.get('x-hub-signature-256'));
        console.log(request.headers.get('X-GitHub-Delivery') || request.headers.get('x-github-delivery'));
        const eventName = request.headers.get('X-GitHub-Event') || request.headers.get('x-github-event');
        console.log(eventName);
        await probot.webhooks.verifyAndReceive({
            id: request.headers.get('X-GitHub-Delivery') || request.headers.get('x-github-delivery'),
            name: eventName,
            signature: request.headers.get('X-Hub-Signature-256') || request.headers.get('x-hub-signature-256'),
            payload: payload
        } as any);
        response.status(200).json({ok: 'true'});
    } catch (error: any) {
        probot.log.info(error);
        response.status(error.status || 500);
    }
}