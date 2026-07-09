# syntax=docker/dockerfile:1.7
# DEMO: "build once, package N times" runtime image.
#
# The agent runs `pnpm install` + `nx run-many -t build` ONCE for all affected
# services, then `pnpm --filter <svc> deploy --prod` into out/<svc>/ — and each
# image build is just a COPY of that prebuilt output. No corepack, no install,
# no compile inside any image. Context: the prebuilt /out directory itself.

FROM node:24-bookworm-slim

ENV NODE_ENV=production
ENV NODE_OPTIONS=--enable-source-maps

WORKDIR /app
COPY . .

RUN test -f dist/main.js || (echo "FATAL: dist/main.js missing" && exit 1)

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
