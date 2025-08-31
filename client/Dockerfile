FROM node:20

# Set working directory
WORKDIR /app

# Instalează pnpm global
RUN npm install -g pnpm

# Copiază fișierele și package.json
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Instalează dependențele
RUN pnpm install

# Copiază restul aplicației
COPY . .

# Expune portul
EXPOSE 3000

# Rulează aplicația
CMD ["pnpm", "dev"]
