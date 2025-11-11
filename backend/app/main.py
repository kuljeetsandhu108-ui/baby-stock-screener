from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# We must import both of our routers.
from .routers import stocks, indices

# Create the main FastAPI application instance
app = FastAPI(
    title="Stellar Stock Screener API",
    description="A high-performance API serving financial data for the stock screener frontend.",
    version="1.0.0"
)

# --- ROUTER INCLUSION ---
# It is critical that the API routers are included BEFORE the static file routes.
# This ensures that a request like '/api/stocks/AAPL/all' is handled by the API
# and not treated as a request for a file.

# Include the stocks router for all company-specific API calls.
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])

# Include the indices router for all market index API calls.
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])


# --- STATIC FILE SERVING (FOR REACT FRONTEND) ---
# This code block tells FastAPI to also act as a web server for our
# compiled React application when in production.

# 1. Mount the '/static' directory from our React 'build' folder.
# This is where all the compiled JavaScript (main.[hash].js), CSS (main.[hash].css),
# and other assets like images are located. This is a direct mapping.
app.mount("/static", StaticFiles(directory="frontend/build/static"), name="static_assets")


# 2. Create the "catch-all" route. This MUST BE THE LAST route in the file.
# This route is the key to making a Single-Page Application (SPA) like React work correctly.
# It matches ANY path that was not matched by the API routers or the /static mount above.
# For any such path (e.g., '/', '/stock/AAPL', '/index/^GSPC'), it will always
# serve the main 'index.html' file from our React build.
# Once the browser receives index.html, the React JavaScript code takes over
# and uses React Router to display the correct page content based on the URL.
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    return FileResponse("frontend/build/index.html")