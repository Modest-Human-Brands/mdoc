FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
COPY nitro.config.ts ./

ENV NITRO_PRESET=bun
ENV NITRO_PUBLIC_SITE_URL=$SITE_URL

RUN bun install

COPY . .

RUN bun run build

FROM oven/bun:1-alpine AS runner

ARG VERSION
ARG BUILD_TIME

WORKDIR /app

COPY --from=builder /app/.output ./.output

RUN apk add --no-cache \
  weasyprint \
  ttf-freefont \
  fontconfig \
  pango \
  cairo \
  libxml2 \
  libxslt

ENV NODE_ENV=production
ENV NITRO_APP_VERSION=$VERSION
ENV NITRO_APP_BUILD_TIME=$BUILD_TIME

EXPOSE 3000

ENTRYPOINT ["bun", ".output/server/index.mjs"]