# Stage 1: Build the React Frontend (This stage is perfect and does not change)
FROM node:18-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Python Backend (This stage is completely rewritten)
FROM python:3.12-slim

# Set the working directory for the entire stage
WORKDIR /app

# 1. Copy ONLY the requirements file first.
# This is a critical optimization for Docker's caching.
# The dependencies will only be re-installed if this file changes.
COPY ./backend/requirements.txt .

# 2. Install all Python dependencies.
# We add --no-cache-dir to keep the image slim and --upgrade pip for best practice.
RUN pip install --no-cache-dir --upgrade pip -r requirements.txt

# 3. Now, copy all of your application code into the image.
# This includes the backend code AND the built frontend from the previous stage.
COPY ./backend ./backend
COPY --from=builder /app/frontend/build ./frontend/build

# 4. Set the command to run the Uvicorn server.
# This is the same robust command from before.
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]