from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Import Routers
from .routers import stocks, indices, charts

# Create the App
app = FastAPI(
    title="Stellar Stock Screener API",
    description="A high-performance API serving financial data for the stock screener frontend.",
    version="1.0.0"
)

# --- CORS CONFIGURATION ---
# This allows your frontend (localhost or production) to talk to this backend.
origins = [
    "http://localhost:3000",  # Local React Dev Server
    "*"                       # Allow all (Simplifies Railway deployment)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REGISTER ROUTERS ---
app.include_router(stocks.router, prefix="/api/stocks", tags=["stocks"])
app.include_router(indices.router, prefix="/api/indices", tags=["indices"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])


# --- SMART STATIC FILE SERVING (THE MAGIC SWITCH) ---
# This logic checks if the React App has been built (which happens on Railway).
# If yes, it serves the React App.
# If no (local dev), it just runs the API.

build_dir = "frontend/build"

if os.path.exists(build_dir):
    print("Production Mode: Serving React App from frontend/build")
    
    # 1. Mount the static assets (CSS, JS, Images)
    # The 'static' folder inside build contains the compiled assets
    app.mount("/static", StaticFiles(directory=os.path.join(build_dir, "static")), name="static_assets")

    # 2. Catch-All Route for React Router (Single Page Application logic)
    # Any request that ISN'T an API call goes to index.html
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        
        # Safety: Don't hijack API calls
        if full_path.startswith("api/"):
            return {"error": "API endpoint not found"}, 404
            
        # Serve index.html for all other routes so React can handle the routing
        index_path = os.path.join(build_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return {"error": "index.html not found"}, 404

else:
    print("Development Mode: Running API Only (Frontend build not found)")
    
    # Simple root message for local dev
    @app.get("/")
    async def root():
        return {"message": "Stellar Stock Screener API is Running (Dev Mode)"}