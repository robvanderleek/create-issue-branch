const { run } = require("@probot/github-action");
const app = require('./probot')
run(app).catch((error) => {
  console.error(error);
  process.exit(1);
});
