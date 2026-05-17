FROM node:20-alpine

# Necessary for Next.js on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Next.js default port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV development

CMD ["npm", "run", "dev"]