# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置文件
COPY package*.json ./
RUN npm ci --frozen-lockfile

# 复制源代码并构建
COPY . .
RUN npm run build

# 运行阶段
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# 创建非 root 用户运行
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 复制 standalone 输出内容
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]