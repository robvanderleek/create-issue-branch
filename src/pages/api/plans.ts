import {createProbot} from "probot";
import app from "../../probot.ts";
import {listAppSubscriptions} from "../../plans.ts";
import {message} from "../../discord.ts";
import {VercelRequest, VercelResponse} from "@vercel/node";

const probot = createProbot();
const loadingApp = probot.load(app);

export default async function (_: VercelRequest, response: VercelResponse) {
    try {
        await loadingApp
        const subscriptions = await listAppSubscriptions(probot)
        await message(subscriptions)
        response.status(200).json({result: 'OK'})
    } catch (error: any) {
        probot.log.error(error)
        response.status(error.status || 500).json({error: error})
    }
}