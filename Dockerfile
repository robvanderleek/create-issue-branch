FROM node:12.6.0-alpine
WORKDIR /app
COPY package.json yarn.lock /app/
RUN yarn install --production
COPY . .
ENTRYPOINT ["./node_modules/.bin/probot", "run", "/app/index.js"]
