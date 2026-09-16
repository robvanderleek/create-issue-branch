FROM node:24-alpine
RUN apk update && apk add git
RUN mkdir /app
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY tsconfig.json /app/tsconfig.json
COPY src /app/src
COPY .git /app/.git
COPY public /app/public
WORKDIR /app
RUN npm install
RUN npm run compile
RUN npm install pm2 -g
ENV HOST=0.0.0.0
CMD ["pm2-runtime", "./build/server.js"]
