# ------------------------------
# 🧩 Stage 1: Build & Setup
# ------------------------------
FROM node:18-alpine AS build

# Create app directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy backend source code
COPY backend/ .

# Copy frontend to a static folder inside backend
WORKDIR /app/backend
COPY frontend ./public

# ------------------------------
# 🚀 Stage 2: Production Image
# ------------------------------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy built backend from previous stage
COPY --from=build /app/backend .

# Expose port
EXPOSE 3000

# Define environment variables (Render or Railway override these)
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]
