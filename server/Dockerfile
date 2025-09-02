

# setari local

# FROM node:20-alpine

# WORKDIR /app

# # Copiem package.json și package-lock.json
# COPY package*.json ./

# # Instalăm dependențele
# RUN npm install

# # Copiem restul codului
# COPY . .

# # Expunem portul serverului
# EXPOSE 8000

# # Comanda de start
# CMD ["npm", "run", "dev"]


# setari server
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Creează folder uploads
RUN mkdir -p /app/uploads

# Rulează server și worker
CMD ["npm", "start"]  
# start rulează server și worker în paralel