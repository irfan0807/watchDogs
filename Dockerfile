# Use official Node.js image as the base
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose ports (adjust as needed)
EXPOSE 8081 8080 19000 19001 19002

# Start the app (adjust script as needed)
CMD ["npm", "run", "all:dev"]
