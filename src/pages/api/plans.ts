import {createProbot} from "probot";
import app from "../../probot.ts";
import {listAppSubscriptions} from "../../plans.ts";
import {message} from "../../discord.ts";
import {VercelRequest, VercelResponse} from "@vercel/node";

const probot = createProbot();
const loadingApp = probot.load(app);

export default async function (_: VercelRequest, response: VercelResponse) {
    try {
        await loadingApp;
        const octokit = await probot.auth();
        const installation = await octokit.rest.apps.getInstallation();
        console.log('Authenticated as installation id:', installation.data.id);
        const subscriptions = await listAppSubscriptions(octokit)
        await message(subscriptions)
        response.status(200).json({result: 'OK'})
    } catch (error: any) {
        probot.log.error(error)
        response.status(error.status || 500).json({error: error})
    }
}