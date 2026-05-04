FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/datasource/package.json ./apps/datasource/
RUN bun install --frozen-lockfile
COPY . .
CMD ["bun", "run", "apps/datasource/src/index.ts"]
