FROM node:20-alpine
RUN mkdir /app
COPY server-dist /app/server-dist
WORKDIR /app
RUN npm install pm2 -g
CMD ["pm2-runtime", "./server-dist/index.js"]
