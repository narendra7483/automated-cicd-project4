# Test stage: install all dependencies and run automated tests.
FROM node:22-alpine AS dependencies
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS test
COPY server.js ./
COPY public ./public
COPY tests ./tests
RUN npm test

# Production stage: smaller image with production dependencies only.
FROM node:22-alpine AS production
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js ./
COPY public ./public

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
  && chown -R appuser:appgroup /usr/src/app
USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
