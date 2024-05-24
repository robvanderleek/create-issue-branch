import {createProbot} from "probot";
import app from "../../probot";
import {listAppSubscriptions} from "../../plans";
import {message} from "../../discord";
import {VercelRequest, VercelResponse} from "@vercel/node";

export const config = {
    api: {
        bodyParser: false,
    },
};

const probot = createProbot()
const loadingApp = probot.load(app)

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