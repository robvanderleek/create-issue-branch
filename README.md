# Create Issue Branch

![Logo](static/logo.png)

[![BCH compliance](https://bettercodehub.com/edge/badge/robvanderleek/create-issue-branch?branch=master)](https://bettercodehub.com/)
[![Build Status](https://github.com/robvanderleek/create-issue-branch/workflows/Prod/badge.svg)](https://github.com/robvanderleek/create-issue-branch/actions)
[![Build Status](https://github.com/robvanderleek/create-issue-branch/workflows/Create%20Release/badge.svg)](https://github.com/robvanderleek/create-issue-branch/actions)
[![Dependabot](https://badgen.net/badge/Dependabot/enabled/green?icon=dependabot)](https://dependabot.com/)
[![Sentry](https://img.shields.io/badge/sentry-enabled-green)](https://sentry.io)

A GitHub App/Action that automates the creation of issue branches (either automatically after assigning an issue or after commenting on an issue with a ChatOps command: `/create-issue-branch` or `/cib`).

Built in response to this feature request issue: https://github.com/isaacs/github/issues/1125

* [Installation](#installation)
* [Usage](#usage)
* [Configuration](#configuration)
* [Feedback, suggestions and bug reports](#feedback-suggestions-and-bug-reports)
* [Contributing](#contributing)
* [License](#license)

# Installation

There are two options to run this app as part of your development workflow:

1. [Install](https://github.com/apps/create-issue-branch) it as an *app* for your organization/account/repository
2. Run it as an *action* in your GitHub action YAML configuration

Option 1 is easiest if you're developing on GitHub.com, option 2 gives you full control how and when the app runs in your development workflow.

## Option 1. Install the GitHub App

You can install the app for your organization/account/repository from [*this page*](https://github.com/apps/create-issue-branch)

## Option 2. Configure GitHub Action

Add this to your workflow YAML configuration:

```yaml
on:
    issues:
        types: [assigned]
    issue_comment:
        types: [created]
    pull_request:
        types: [closed]

jobs:
    create_issue_branch_job:
        runs-on: ubuntu-latest
        steps:
        - name: Create Issue Branch
          uses: robvanderleek/create-issue-branch@master
          env:
            GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitHub Action output variable

The GitHub Action has one output variable: `branchName`, which contains the name of the branch that was created. You can use this output in downstream actions. For a trivial example see [this workflow](https://github.com/robvanderleek/robvanderleek.github.io/blob/2af5f90d94d81e942382892a6b6149467184b38b/.github/workflows/issue-branch.yml).

# Usage

This app can support your development workflow in two ways (modes): auto and chatops.

In "auto" mode the typical development workflow is:

 1. An issue is created, for example: Issue 15: Fix nasty bug!

 *some time may pass*

 2. The issue is assigned
 3. When the issue is assigned this app will create a new issue branch
    (for the example issue this branch will be called `issue-15-Fix_nasty_bug`)

In "chatops" mode the typical development workflow is:

 1. An issue is created, for example: Issue 15: Fix nasty bug!

 *some time may pass*

 2. A developer that wants to work on this issue gives the ChatOps command `/cib` as a comment on the issue
 3. This app will create a new issue branch
    (for the example issue this branch will be called `issue-15-Fix_nasty_bug`)
    By default the app notifies creation is completed with a comment on the issue.

## Advanced usage with other Apps & Actions

GitHub Apps & Actions allow you to define custom and advanced automated workflows. Examples of Apps & Actions that can be used alongside this app to compose tailored issue workflows are:

- [project-bot](https://github.com/philschatz/project-bot): App for project automation
- [github-actions-automate-projects](https://github.com/takanabe/github-actions-automate-projects): Action for project automation
- [auto-card-labeler](https://github.com/technote-space/auto-card-labeler): Automatically label issues/PRs

To get inspired of what is possible with Actions workflows, see [this configuration](https://github.com/takeshape/.github/blob/4ecfb2fb54164934ad70822c709ab1917541114d/.github/workflows/_pm_issues.yml). 

_Remember to always pick the simplest issue workflow that fits your poject_.

# Configuration

This app does not require a configuration. However, if you want to override 
the default behaviour you can do so by placing a YAML file in your repository 
at the location: `.github/issue-branch.yml` with the overrides.

If the app has a problem with your configuration YAML (e.g.: invalid content) it will create an issue 
with the title "Error in Create Issue Branch app configuration" in the repo. Subsequent runs with an 
invalid configuration will not create new issues, only one stays open. 

## Organization/User wide configuration

Organization/user wide configuration prevents a configuration in every individual repo and is supported by putting the YAML file `.github/issue-branch.yml`
in a repository called `.github`. So, if your organization/username is `acme`, the full path becomes:
`https://github.com/acme/.github/blob/master/.github/issue-branch.yml`. 

## Mode: auto or chatops

The default mode is "auto", meaning a new issue branch is created after an issue is assigned.

You can change the mode to "chatops", meaning a new issue branch is created after commenting on an issue with `/create-issue-branch` or `/cib`, by putting the following line in your `issue-branch.yml`:

```yaml
mode: chatops
```

## Silent or chatty

By default the app comments on the issue after creating a branch.

You can change this default behaviour, and make the app silent, by putting the following line in your `issue-branch.yml`:

```yaml
silent: true
```

## Branch names

Branch names are generated from the issue, there are 3 built-in flavours or it can 
be customized.

The 3 built-in flavours are:

 1. `tiny` => an `i` followed by the issue number, for example: `i15`
 2. `short` => the word `issue` followed by the issue number, for example:
    `issue-15`
 3. `full` => the word issue followed by the issue number followed by the
    issue title, for example: `issue-15-Fix_nasty_bug`
    
The default is `full`, other types can be configured in the YAML like this:

```yaml
branchName: tiny
```

or

```yaml
branchName: short
```

To customize branch names you can give `branchName` a string value where `${...}`
placeholders are substituted with fields from the GitHub issue assignment JSON 
object.

For example, if you would like to have your branch names contain only the issue 
number and title (similar to the GitLab branch naming convention), confgure it like
this:

```yaml
branchName: '${issue.number}-${issue.title}'
```

See 
[test/fixtures/issues.assigned.json](tests/test-fixtures/issues.assigned.json) for
all possible placeholder names.

### Change replacement for illegal characters in branch title

Characters that are not allowed in Git branch names are replaced by default with an underscore (`_`) character. You can configure a different replacement character as follows:

```yaml
gitSafeReplacementChar: '-'
```

The above configuration would generate the following branch name for issue 15 that has the title "Fix nasty bug": `issue-15-Fix-nasty-bug`.

### Lowercase and uppercase substitutions

Substitutions for `${...}` placeholders can be lowercased by putting a `,` before the closing curly. Likewise, substitutions can be uppercased by putting a `^` before the closing curly.

For example, issue titles can be lowercased in branch names like this:

```yaml
branchName: '${issue.number}-${issue.title,}'
```

or if you want the complete title in uppercase:

```yaml
branchName: '${issue.number}-${issue.title^}'
```

## Automatically close issues after a pull request merge

This app can close issues automatically for you when a pull request for an issue 
branch is merged. You can enable this feature with:

```yaml
autoCloseIssue: true
```

Be aware that the app needs to be able to find the issue number in the branch name,
otherwise this feature will not work. This feature only works if one of the following
is true for your app configuration:

- You use the default `branchName` setting
- Your `branchName` setting is `tiny`, `short` or `full`
- Your branch name starts with the issue number
- Your branch name contains the string `issue-` (case insensitive) followed by the 
  issue number, for example: `Project-A-Issue-123-Rewrite_in_Clojure`

## Source branch based on issue label

You can override the source branch (by default the "default branch" of the
repository is used) based on the issue label.

For example, if you want branches for issues with the `enhancement` label to
have the `dev` branch as a source, and branches for issues with the `bug`
label to have the `staging` branch as a source, add this to your configuration
YAML:

```yaml
branches:
  - label: enhancement
    name: dev
  - label: bug
    name: staging
```

The `label` field also takes a list of label names. In that case all labels in the list must be matched by labels of the issue. For example:

```yaml
branches:
  - label: 
    - enhancement
    - docs
    name: docs
  - label: enhancement
    name: dev
```

In the configuration above issues with the labels `enhancement` _and_ `docs` will have the `docs` branch as a source, while issues with an `enhancement` label _but not_ a `docs` label will have the `dev` branch as a source.

When issues have multiple labels the branch of the first match (based on the 
order in the configuration YAML will be used).

If a configured branch does not exist in the repository the "default branch"
is used.

## Branch name prefix based on issue label

Branch names can be prefixed based on the label of an issue.

For example, if you want branches for issues with the `enhancement` label to
have the `feature/` prefix and branches for issues with the `bug` label to 
have the `bugfix/` prefix, add this to your configuration YAML:

```yaml
branches:
  - label: enhancement
    prefix: feature/
  - label: bug
    prefix: bugfix/
```

You can use `${...}` placeholders in the prefix to substitute fields from the
GitHub issue assignment JSON object. For example, if you want the GitHub login name of the user that created
the issue in the branch prefix, add this to your configuration YAML:

```yaml
branches:
  - label: enhancement
    prefix: feature/${issue.user.login}/
```

See 
[test/fixtures/issues.assigned.json](tests/test-fixtures/issues.assigned.json) for
all possible placeholder names.

## Skip branch creation based on issue label

In mode "auto" branch creation can be skipped based on the label of an issue.

For example, if you don't want to automatically create branches for issues with the
`question` label, add this to your configuration YAML:

```yaml
branches:
  - label: question
    skip: true
```

## Unit Test Coverage

#### Jest/Istanbul:

Unit Tests and coverage are implemented using Jest and Istanbul. 

The snippet below shows the script which, upon execution, generates a coverage directory with coverage reports that are then used by CodeCov to generate a dashboard (*description for CodeCov below the snippet*)

```javascript 
"coverage": "jest --collect-coverage"
```

#### CodeCov
Note: CodeCov is a third-party test coverage tool which can be associated to your GitHub repository to create a dashboard based on visual representations of test coverage. CodeCov also tracks improvements in coverage on every push once linked.
For more information: https://docs.codecov.io/docs

Used CodeCov to generate a coverage dashboard through a bash command run in the prod/dev pipelines.

The bash script can only run if:

* You have a 'codecov' account (just log in with your GitHub account)
* The repository on your GitHub account is linked to your CodeCov account.
* You have a GitHub secret named `CODECOV_SECRET_TOKEN` which has the value of the token generated by CodeCov

Please note that once your repository is linked with your CodeCov account you will receive an authentication token generated by CodeCov which you will have to save as `CODECOV_SECRET_TOKEN` in your GitHub secrets for this repository.
The bash script upon execution will provide a link to your CodeCov dashboard on your account.

The snippet below shows the workflow which runs the coverage command through yarn and bash script to generate a dashboard on CodeCov.io:

```yaml
 - run: yarn run coverage
 - run: bash <(curl -s https://codecov.io/bash) -t ${{secrets.CODECOV_SECRET_TOKEN }}
```

## Matching labels with wildcards

Wildcard characters '?' (matches any single character) and '*' (matches any sequence of characters, 
including the empty sequence) can be used in the label field.

For example, to set the default/fallback prefix `issues/` for issues that do not have the `enhancement`  or `bug`
label, use this configuration:

```yaml
branches:
  - label: enhancement
    prefix: feature/
  - label: bug
    prefix: bugfix/
  - label: '*'
    prefix: issues/
```

*Remember to put quotes around a single asterisk ('\*') in YAML*

## Experimental features

The features below are experimental and may be removed some day or promoted to 
standard features.

### Branch name as ChatOps command argument

As discussed in [this issue](https://github.com/robvanderleek/create-issue-branch/issues/127) determines the branch name 
on the `/cib` ChatOps command argument, e.g.: `/cib Simple NPE fix will create a branch names `issue-1-Simple_NPE_fix`  
```yaml
experimental:
  branchNameArgument: true
```

# Feedback, suggestions and bug reports

Please create an issue here: https://github.com/robvanderleek/create-issue-branch/issues

## Features under consideration

The list below contains features that might or might not be implemented in the future.
Comment or +1 if this feature is useful for your use-case.

- Add Projects integration (see issue [#142](https://github.com/robvanderleek/create-issue-branch/issues/142))
- Automatically open a PR (see issue [#80](https://github.com/robvanderleek/create-issue-branch/issues/80))
- Add issue label management functionality (see issue [#177](https://github.com/robvanderleek/create-issue-branch/issues/177))
- Choose branch to branch from in ChatOps mode (see issues [#155](https://github.com/robvanderleek/create-issue-branch/issues/155) and [#213](https://github.com/robvanderleek/create-issue-branch/issues/213))

# Contributing

If you have suggestions for how create-issue-branch could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

# License

[ISC](LICENSE) © 2019 Rob van der Leek <robvanderleek@gmail.com> (https://twitter.com/robvanderleek)
