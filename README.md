![Logo](static/logo.png)

# create-issue-branch

[![BCH compliance](https://bettercodehub.com/edge/badge/robvanderleek/create-issue-branch?branch=master)](https://bettercodehub.com/)
[![Build Status](https://travis-ci.com/robvanderleek/create-issue-branch.svg?branch=master)](https://travis-ci.com/robvanderleek/create-issue-branch)

> A GitHub App built with [Probot](https://github.com/probot/probot) that creates a new branch after assigning an issue

Built in response to this feature reuest issue:
https://github.com/isaacs/github/issues/1125

## What does this app do?

The typical workflow is:
 1. An issue is created, for example: Issue 15: Fix nasty bug!

 *some time may pass*

 2. The issue is assigned
 3. When the issue is assigned this app will create a new issue branch
    (`issue-15-Fix_nasty_bug` for the example issue)

If the issue is re-assigned no new branch will be created.

## Installation

You can install the app directly from [*this page*](https://github.com/apps/create-issue-branch)

## Feedback, suggestions and bug reports

Please create an issue here: https://github.com/robvanderleek/create-issue-branch/issues

## Setup

```sh
# Install dependencies
npm install

# Run the bot
npm start
```

## Contributing

If you have suggestions for how create-issue-branch could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2019 Rob van der Leek <robvanderleek@gmail.com> (https://twitter.com/robvanderleek)
