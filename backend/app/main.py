from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# We must import both of our routers to make their endpoints available to the application.
from .routers import stocks, indices

# Create the main FastAPI application instance.
# This is the central object that runs our entire backend.
app = FastAPI(
    title="Stellar Stock Screener API",
    description="A high-performance API serving financial data for the stock screener frontend.",
    version="1.0.0"
)

# --- ROUTER INCLUSION ---
# The order here is critical for production.
# We must include our specific API routers BEFORE the generic static file routes.
# This ensures that a request like '/api/stocks/AAPL/all' is handled by our API logic
# and not misinterpreted as a request for a file on the server.

# Include the stocks router for all company-specific API calls (e.g., /api/stocks/...).
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])

# Include the indices router for all market index API calls (e.g., /api/indices/...).
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])


# --- STATIC FILE SERVING (FOR REACT FRONTEND) ---
# This block of code tells our single Python server to also act as a web server
# for our compiled React application. This is a clean, self-contained deployment strategy.

# 1. Mount the '/static' directory from our React 'build' folder.
# This is where all the compiled JavaScript (main.[hash].js), CSS (main.[hash].css),
# and other assets like images are located. This creates a direct mapping, so when the
# browser asks for '/static/js/main.123.js', FastAPI knows where to find it.
app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static_assets")


# 2. Create the "catch-all" route. This MUST BE THE LAST route defined in the file.
# This route is the key to making a Single-Page Application (SPA) like React work correctly.
# It is designed to match ANY path that was not matched by the API routers or the /static mount above.
# For any such path (e.g., the root '/', or a deep link like '/stock/AAPL' or '/index/^GSPC'),
# it will always serve the main 'index.html' file from our React build.
# Once the browser receives that index.html, the React JavaScript code takes over,
# reads the URL, and uses React Router to display the correct page content. This is what
# allows browser refreshes and direct navigation to work on a live server.
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    return FileResponse("frontend/build/index.html")