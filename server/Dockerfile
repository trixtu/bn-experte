# imagine de bază Node.js
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 8000
# index.js pornește API-ul; worker-ul e separat ca Background Worker
CMD ["node", "index.js"]