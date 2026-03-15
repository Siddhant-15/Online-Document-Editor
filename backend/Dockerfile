FROM node:18-alpine

WORKDIR /usr/src/app

# Install Pandoc
RUN apk add --no-cache pandoc

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose port 3000 mapping to the backend server
EXPOSE 3001

# Run the node application
CMD ["node", "src/server.js"]
