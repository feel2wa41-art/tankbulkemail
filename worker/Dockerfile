# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install Oracle Instant Client dependencies
RUN apk add --no-cache libaio libnsl libc6-compat

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install Oracle Instant Client dependencies
RUN apk add --no-cache libaio libnsl libc6-compat

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3002

CMD ["node", "dist/main"]
