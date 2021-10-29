FROM node:14-alpine
COPY dist dist
ENTRYPOINT ["node", "/dist/index.js"]
