FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for ts-node)
RUN npm install

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate
RUN npx prisma migrate deploy

# Set environment variables
ENV NODE_ENV=production

EXPOSE 3000

# Run directly with ts-node
CMD ["ts-node", "./src/app.ts"]