# imagine de bază Node.js
FROM node:20-alpine

WORKDIR /app

# Copiem package.json și package-lock.json
COPY package*.json ./

# Instalăm dependențele
RUN npm install

# Copiem restul codului
COPY . .

# Expunem portul serverului
EXPOSE 8000

# Comanda de start
CMD ["npm", "run", "dev"]
