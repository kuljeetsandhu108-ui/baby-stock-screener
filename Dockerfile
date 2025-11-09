# Stage 1: Build the React Frontend
# This stage correctly builds our static frontend files.
FROM node:18-alpine AS builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Final Python Application Image
# This stage takes the built frontend and combines it with our Python backend.
FROM python:3.12-slim

# This is a best-practice environment variable for Python in Docker.
ENV PYTHONUNBUFFERED 1

# Set the working directory for the application.
WORKDIR /app

# Copy the Python dependency list first.
# This optimizes Docker's caching, so dependencies are only re-installed if this file changes.
COPY ./backend/requirements.txt .

# Install all Python dependencies from the requirements file.
RUN pip install --no-cache-dir --upgrade pip -r requirements.txt

# Now, copy all of your application code into the image.
COPY ./backend ./backend

# --- THIS IS THE CORRECTED LINE ---
# Copy the built frontend files from the 'builder' stage into the correct location.
COPY --from=builder /app/frontend/build ./frontend/build

# Set the final command to run the Uvicorn server.
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8080"]