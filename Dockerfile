FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY nitro.config.ts ./

ENV NITRO_PRESET=node-server
ENV NITRO_PUBLIC_SITE_URL=$SITE_URL

RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

RUN mkdir -p .output/server/node_modules && \
  cp -R node_modules/mupdf .output/server/node_modules/ && \
  cp -R node_modules/@napi-rs .output/server/node_modules/

FROM node:22-alpine AS runner

ARG VERSION
ARG BUILD_TIME

WORKDIR /app

RUN apk add --no-cache fontconfig freetype ttf-liberation ttf-dejavu

COPY --from=builder /app/.output ./.output

ENV NODE_ENV=production
ENV NITRO_APP_VERSION=$VERSION
ENV NITRO_APP_BUILD_TIME=$BUILD_TIME

EXPOSE 3000

ENTRYPOINT ["node", ".output/server/index.mjs"]