async function handle (app, ctx) {
  console.log(ctx.payload)
}

module.exports = {
  handle: handle
}
