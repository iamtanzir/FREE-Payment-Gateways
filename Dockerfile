# ─── Stage 1: build the embedded merchant SPA (src/dashboard) ───────────────
# Build args are optional; without them the SPA builds and renders a clear
# "backend not configured" shell (see src/dashboard/src/integrations/supabase/client.ts).
FROM node:26-alpine AS app
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts --no-audit --no-fund
COPY . .
ENV VITE_BASE_PATH=/app/
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ARG VITE_SUPABASE_PROJECT_ID=""
RUN npm run build:app

# ─── Stage 2: runtime (Node gateway + embedded /app) ────────────────────────
FROM node:26-alpine
WORKDIR /app
COPY package.json package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
COPY --from=app /build/public/app ./public/app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
