from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# We must import ALL of our routers to make their endpoints available.
from .routers import stocks, indices, charts

# Create the main FastAPI application instance.
# This is the central object that runs our entire backend.
app = FastAPI(
    title="Stellar Stock Screener API",
    description="A high-performance API serving financial data for the stock screener frontend.",
    version="1.0.0"
)

# --- ROUTER INCLUSION ---
# It is critical that the API routers are included BEFORE the static file routes.
# This ensures that a request like '/api/stocks/AAPL/all' is handled by our API logic
# and not misinterpreted as a request for a file on the server.

# Include the stocks router for all company-specific API calls.
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])

# Include the indices router for all market index API calls.
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])

# Include the charts router for our new AI chart analysis feature.
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])


# --- STATIC FILE SERVING (FOR REACT FRONTEND) ---
# This code block tells our single Python server to also act as a web server
# for our compiled React application when in production.

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
    # We construct the path to the index.html file within our Docker container.
    # The 'frontend/build' directory will be at the root of our application.
    index_path = os.path.join("frontend/build", "index.html")

    # This is a safety check to ensure the file exists before we try to serve it.
    if not os.path.exists(index_path):
        return {"error": "index.html not found in build directory"}, 500

    return FileResponse(index_path)