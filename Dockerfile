ARG NODE_VERSION=20.11
ARG NGINX_VERSION=1.25-alpine

FROM node:${NODE_VERSION}-alpine3.19 AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev --prefer-offline 2>&1 || \
    (echo "npm ci failed, cleaning cache and retrying..." && \
     npm cache clean --force && \
     npm ci --include=dev 2>&1)

FROM node:${NODE_VERSION}-alpine3.19 AS builder

ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE
ARG GIT_COMMIT

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV VITE_APP_VERSION=${BUILD_VERSION}
ENV VITE_BUILD_DATE=${BUILD_DATE}
ENV VITE_GIT_COMMIT=${GIT_COMMIT}

RUN npm run build && \
    if [ ! -f dist/index.html ]; then \
      echo "Build failed: dist/index.html not found"; \
      ls -la dist/ 2>/dev/null || echo "dist directory not found"; \
      exit 1; \
    fi && \
    echo "Build successful: $(ls -la dist/ | wc -l) files generated"

RUN npm run test -- --run

FROM nginx:${NGINX_VERSION} AS production

ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE
ARG GIT_COMMIT

LABEL maintainer="DSQ Calculator Team"
LABEL version="${BUILD_VERSION}"
LABEL build.date="${BUILD_DATE}"
LABEL git.commit="${GIT_COMMIT}"
LABEL description="DSP Calculator Production Image"

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    apk add --no-cache curl tzdata && \
    rm -rf /var/cache/apk/*

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY <<EOF /usr/share/nginx/html/50x.html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>服务暂时不可用</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               display: flex; justify-content: center; align-items: center; 
               min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 40px; background: white; 
                     border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e74c3c; margin-bottom: 16px; }
        p { color: #666; margin-bottom: 24px; }
        button { padding: 12px 24px; background: #3498db; color: white; 
                 border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>服务暂时不可用</h1>
        <p>请稍后重试，或联系技术支持</p>
        <button onclick="location.reload()">刷新页面</button>
    </div>
</body>
</html>
EOF

COPY <<EOF /usr/share/nginx/html/429.html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>请求过于频繁</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               display: flex; justify-content: center; align-items: center; 
               min-height: 100vh; margin: 0; background: #f5f5f5; }
        .container { text-align: center; padding: 40px; background: white; 
                     border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #f39c12; margin-bottom: 16px; }
        p { color: #666; margin-bottom: 24px; }
        button { padding: 12px 24px; background: #3498db; color: white; 
                 border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #2980b9; }
    </style>
</head>
<body>
    <div class="container">
        <h1>请求过于频繁</h1>
        <p>请稍后再试</p>
        <button onclick="location.reload()">刷新页面</button>
    </div>
</body>
</html>
EOF

RUN mkdir -p /var/log/nginx /var/cache/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appgroup /usr/share/nginx/html && \
    chown -R appuser:appgroup /var/cache/nginx && \
    chown -R appuser:appgroup /var/log/nginx && \
    chown -R appuser:appgroup /var/run/nginx.pid && \
    chmod -R 755 /usr/share/nginx/html

RUN sed -i 's/user  nginx;/user  appuser;/' /etc/nginx/nginx.conf

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health.json || exit 1

CMD ["nginx", "-g", "daemon off;"]
