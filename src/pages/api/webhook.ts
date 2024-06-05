import {createProbot} from "probot";
import app from "../../probot";

const probot = createProbot()
const loadingApp = probot.load(app)

export default async function GET(request: Request) {
    try {
        await loadingApp;
        const payload = await request.text()
        const id = request.headers.get('X-GitHub-Delivery') || request.headers.get('x-github-delivery');
        const eventName = request.headers.get('X-GitHub-Event') || request.headers.get('x-github-event');
        const signature = request.headers.get('X-Hub-Signature-256') || request.headers.get('x-hub-signature-256');
        await probot.webhooks.verifyAndReceive({
            id: id,
            name: eventName,
            signature: signature,
            payload: payload
        } as any);
        return Response.json({ok: 'true'}, {status: 200});
    } catch (error: any) {
        probot.log.info(error);
        return new Response(null, {status: error.status || 500});
    }
}