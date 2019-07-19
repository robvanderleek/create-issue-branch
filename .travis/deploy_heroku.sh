#!/bin/sh
echo "Deploying to Heroku..."
wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sh
heroku push --app $HEROKU_APP_NAME
