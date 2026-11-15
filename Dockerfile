FROM node:26-alpine
WORKDIR /app
COPY package.json package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
