from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services import gemini_service, yahoo_service, technical_service
import asyncio

router = APIRouter()

# Define the timeframes we want and the amount of data needed for them
TIMEFRAMES_CONFIG = {
    "5m": "5d",    # 5 minutes, last 5 days
    "15m": "10d",  # 15 minutes, last 10 days
    "30m": "1mo",  # 30 minutes, last 1 month
    "1h": "1mo",   # 1 hour, last 1 month
    "4h": "3mo",   # 4 hours, last 3 months
    "1d": "1y",    # Daily, last 1 year
    "1w": "2y",    # Weekly, last 2 years
    "1mo": "5y"    # Monthly, last 5 years
}

@router.post("/analyze")
async def analyze_chart_image(chart_image: UploadFile = File(...)):
    """
    Master endpoint:
    1. Visual AI Analysis of the image.
    2. Symbol Detection.
    3. Multi-Timeframe Technical Data Calculation.
    """
    print("Received chart image for analysis...")

    if not chart_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    image_bytes = await chart_image.read()

    # --- Step 1: Identify Symbol (AI) ---
    print("Task 1: Identifying symbol...")
    identified_symbol = await asyncio.to_thread(gemini_service.identify_ticker_from_image, image_bytes)

    if not identified_symbol or identified_symbol == "NOT_FOUND":
        return {"identified_symbol": "NOT_FOUND", "analysis_data": None, "technical_data": None}
    
    print(f"Symbol identified: {identified_symbol}")

    # --- Step 2: Visual Analysis (AI) ---
    print("Task 2: Performing visual analysis...")
    analysis_task = asyncio.to_thread(gemini_service.analyze_chart_technicals_from_image, image_bytes)

    # --- Step 3: Multi-Timeframe Data Fetching (Math) ---
    print("Task 3: Fetching multi-timeframe data...")
    
    async def fetch_and_calculate(tf, period):
        # Fetch history
        df = await asyncio.to_thread(yahoo_service.get_historical_data, identified_symbol, period, tf)
        # Calculate indicators
        return tf, technical_service.calculate_extended_technicals(df)

    # Create tasks for all timeframes
    technical_tasks = [fetch_and_calculate(tf, period) for tf, period in TIMEFRAMES_CONFIG.items()]

    # Run AI and Data tasks concurrently for maximum speed
    results = await asyncio.gather(analysis_task, *technical_tasks)

    # Unpack results
    analysis_data = results[0] # The AI text result
    technical_results = results[1:] # The list of (timeframe, data) tuples

    # Convert technical results into a clean dictionary
    technical_data = {tf: data for tf, data in technical_results if data is not None}

    return {
        "identified_symbol": identified_symbol,
        "analysis_data": analysis_data,
        "technical_data": technical_data # The new power feature
    }