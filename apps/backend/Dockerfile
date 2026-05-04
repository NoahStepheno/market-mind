FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/utils/package.json ./packages/utils/
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "--watch", "apps/backend/src/index.ts"]
