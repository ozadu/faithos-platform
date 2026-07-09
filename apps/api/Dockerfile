# syntax=docker/dockerfile:1.7
FROM node:24-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.7.0 --activate

WORKDIR /workspace

COPY . .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter @faithos/database build

EXPOSE 3001

CMD ["sh", "-c", "pnpm db:migrate:deploy && pnpm db:seed && pnpm --filter @faithos/api dev"]
