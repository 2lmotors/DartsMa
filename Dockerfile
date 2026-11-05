# DartsMa Production Dockerfile
# Compatible avec Render, Railway, Fly.io, VPS (Docker / Dokku / Coolify / Portainer)

FROM node:20-alpine AS builder

WORKDIR /app

# Copie des configurations et installation des dépendances
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install
RUN npm --prefix client install
RUN npm --prefix server install

# Copie des codes sources
COPY client ./client
COPY server ./server

# Compilation du frontend React Vite en assets statiques
RUN npm --prefix client run build

# Étape finale d'exécution légère
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
COPY server ./server
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/node_modules ./server/node_modules

EXPOSE 4000

# Persistance de la base de données
VOLUME ["/app/server"]

CMD ["node", "server/index.js"]

