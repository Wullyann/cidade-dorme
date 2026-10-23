FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json server.mjs engine.mjs challenges.mjs ./
COPY --chown=node:node public ./public
RUN mkdir /data && chown node:node /data
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
