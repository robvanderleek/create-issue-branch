## Contributing

[fork]: /fork
[pr]: /compare
[style]: https://standardjs.com/
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Development setup & configuration

After forking the repository you can deploy the project service to your own Heroku backend environments for production and staging. To be able to do so, you must first create the prerequisite environments using a Heroku account and login through the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) using the following steps.

A) Use the following command to create a staging environment:

`heroku create --remote staging`

Note the name of the Heroku git repository created e.g `git.heroku.com/strong-river-216.git`, this is to be used as the Heroku staging environment name in Section C below.

Push to staging with the following command:

`heroku push staging master`

B) Use the following command to create a production environment:

`heroku create --remote production`

Note the name of the Heroku git repository created e.g `git.heroku.com/fierce-ice-327.git`, this is to be used as the Heroku production environment name in Section C below.

`heroku push production master`

C) Then you must add the following GitHub secrets:

1. HEROKU_AUTH_TOKEN : Retrieved using command `heroku auth:token`
2. HEROKU_PROD_ENV_NAME : the production Heroku git repository created above (A)
3. HEROKU_STAGING_ENV_NAME : the staging Heroku git repository created above (B)

Any following commits will leverage the workflow files for prod and dev respectively to update and deploy to production and staging environments created automatically. Both can be used to test and use the service and verify functionality works ahead of creating a PR.

## Issues and PRs

If you have suggestions for how this project could be improved, or want to report a bug, open an issue! We'd love all and any contributions. If you have questions, too, we'd love to hear them.

We'd also love PRs. If you're thinking of a large PR, we advise opening up an issue first to talk about it, though! Look at the links below if you're not sure how to open a PR.

## Submitting a pull request

1. [Fork][fork] and clone the repository.
1. Configure and install the dependencies: `npm install`.
1. Make sure the tests pass on your machine: `npm test`, note: these tests also apply the linter, so there's no need to lint separately. Alternatively, you can run the tests in a docker container:`npm run test:docker`
1. Create a new branch: `git checkout -b my-branch-name`.
1. Make your change, add tests, and make sure the tests still pass.
1. Push to your fork and [submit a pull request][pr].
1. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

-   Follow the [style guide][style] which is using standard. Any linting errors should be shown when running `npm test`.
-   Write and update tests.
-   Keep your changes as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
-   Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

Work in Progress pull requests are also welcome to get feedback early on, or if there is something blocked you.

## Resources

-   [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
-   [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
-   [GitHub Help](https://help.github.com)
