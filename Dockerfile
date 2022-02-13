FROM node:16-slim AS builder
RUN npm install -g pnpm
WORKDIR /ddns
COPY pnpm-lock.yaml ./
RUN pnpm fetch
ADD . ./
RUN pnpm install --offline && pnpm run build

FROM node:16-slim
RUN npm install -g pnpm
WORKDIR /ddns
COPY pnpm-lock.yaml ./
RUN pnpm fetch --prod
COPY package.json ./
COPY --from=builder /ddns/dist ./dist
RUN pnpm install --offline --prod

CMD ["node", "dist/index.js"]