# ---- build stage ----
FROM cgr.dev/chainguard/node:20-dev AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# copy rest of frontend source
COPY . .

RUN npm run build
# Vite outputs to /app/dist

# ---- runtime stage ----
FROM cgr.dev/chainguard/nginx:latest

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
