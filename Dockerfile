# Dockerfile cho Discord Cowoncy Bot
# Sử dụng Node.js 18 Alpine để tối ưu kích thước

# -------------------- STAGE 1: Builder --------------------
FROM node:18-alpine AS builder

# Cài đặt các công cụ và thư viện cần thiết cho canvas
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    giflib-dev \
    librsvg-dev \
    libpng-dev

# Tạo thư mục làm việc
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Cài đặt tất cả dependencies (bao gồm dev dependencies)
RUN npm install

# Copy toàn bộ source code
COPY . .

# Build ứng dụng (nếu cần)
# RUN npm run build

# -------------------- STAGE 2: Production --------------------
FROM node:18-alpine

# Cài đặt các gói cần thiết cho production
RUN apk add --no-cache tzdata

# Thiết lập múi giờ
ENV TZ=Asia/Ho_Chi_Minh

# Cài đặt thư viện runtime cho canvas
RUN apk add --no-cache \
    cairo \
    pango \
    jpeg \
    giflib \
    librsvg \
    libpng

# Tạo user và group không root để chạy ứng dụng an toàn hơn
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Tạo thư mục làm việc
WORKDIR /usr/src/app

# Copy package files và cài đặt production dependencies
COPY --from=builder /usr/src/app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code từ builder
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/config ./config
COPY --from=builder /usr/src/app/assets ./assets 2>/dev/null || true

# Tạo các thư mục cần thiết
RUN mkdir -p logs backup

# Set quyền sở hữu cho thư mục
RUN chown -R nodejs:nodejs /usr/src/app

# Switch sang user nodejs
USER nodejs

# Mở cổng cho health check
EXPOSE 3000

# Biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info

# Lệnh khởi chạy bot
CMD ["node", "src/index.js"]
