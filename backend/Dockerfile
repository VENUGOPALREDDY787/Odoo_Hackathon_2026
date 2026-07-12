# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src
RUN npm run build

# Prune non-production dependencies to optimize image size
RUN npm prune --production

# Stage 2: Production Stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built code, package maps, and production dependencies
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/prisma ./prisma

# Create upload directories and apply secure user scopes
RUN mkdir -p uploads logs && chown -R node:node /usr/src/app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { if(res.statusCode === 200) process.exit(0); else process.exit(1); })"

CMD ["npm", "run", "start"]
