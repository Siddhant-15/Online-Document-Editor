# Online Document Editor

This is a real-time collaborative document editor, similar to Google Docs. It's built with the MERN stack (MongoDB, Express, React, Node.js) and uses Socket.io and Yjs for real-time synchronization.

## Docker Setup

The application is fully containerised using Docker and Docker Compose. This means you can run the entire stack (both frontend and backend) with a single command without needing to install Node.js natively.

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) installed and running.
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop).

### Running the Application

1. Make sure you are in the root directory of the project (where this `README.md` is).
2. Ensure you have your `.env` files setup in both `./backend/.env` and `./frontend/.env`.
3. Build and spin up the containers:

   ```bash
   docker compose up --build -d
   ```

   _The `-d` flag runs the containers in detached (background) mode._

### Accessing the Application

- **Frontend:** Open your browser and navigate to [http://localhost:3001](http://localhost:3001)
- **Backend API:** Available at `http://localhost:3000`

### Useful Docker Commands

- **View Logs:**
  ```bash
  docker compose logs -f
  ```
  _(Press `Ctrl+C` to exit the log view)_

- **Stop the Application:**
  ```bash
  docker compose stop
  ```

- **Tear Down and Remove Containers:**
  ```bash
  docker compose down
  ```

## Architecture

- **Frontend (`/frontend`)**: A React application that allows users to edit documents in a rich text editor.
- **Backend (`/backend`)**: A Node.js and Express server that manages the document state, handles Socket.io connections for live updates, and interfaces with a MongoDB database.
