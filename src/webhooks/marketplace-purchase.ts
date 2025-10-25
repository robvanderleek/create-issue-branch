import {Context, Probot} from "probot";
import {message} from "../discord.ts";

export async function marketplacePurchase(app: Probot, ctx: Context<any>) {
    const {
        action, marketplace_purchase: {account, plan}, previous_marketplace_purchase: previous
    } = ctx.payload;
    const changeEmoji = getChangeEmoji(action, plan, previous);
    const change = action === 'changed' ? 'changed to' : action;
    const msg = `${changeEmoji} ${account.type} ${account.login} ${change} ${plan.name}`;
    app.log.info(msg);
    await message(msg);
}

function getChangeEmoji(action: string, plan: any, previous: any) {
    switch (action) {
        case 'purchased':
            return '✅';
        case 'cancelled':
            return '🚫';
        default:
            return plan.monthly_price_in_cents >= previous.plan.monthly_price_in_cents ? '⬆️ ' : '⬇️ ';
    }
}