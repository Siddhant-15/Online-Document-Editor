# Stage 1: Build the React App
FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Build the app. The local .env file will be used during the build process
# so that the environment variables (like API URL) are baked into the static files.
RUN npm run build

# Stage 2: Serve the build output with Nginx
FROM nginx:alpine

# Copy the static build output from the builder stage over to nginx's default html directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose Nginx's default port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
