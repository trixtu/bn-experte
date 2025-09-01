FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# IMPORTANT: Next 13+/15: build pentru producție
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Next produce .next/standalone pe versiunile noi; dacă nu, folosește start clasic
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]

# # Instalează pnpm global
# RUN npm install -g pnpm

# # Copiază fișierele și package.json
# COPY package*.json ./
# COPY pnpm-lock.yaml ./

# # Instalează dependențele
# RUN pnpm install

# # Copiază restul aplicației
# COPY . .

# # Expune portul
# EXPOSE 3000

# # Rulează aplicația
# CMD ["pnpm", "dev"]
