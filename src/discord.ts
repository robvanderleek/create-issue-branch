import nodeFetch from "node-fetch";

export async function message (s: string) {
  if (process.env.DISCORD_WEBHOOK_URL) {
    await nodeFetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: s })
    })
  }
}