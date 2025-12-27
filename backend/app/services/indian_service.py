import os
import requests
from dotenv import load_dotenv

load_dotenv()

# 1. Get the key
INDIAN_API_KEY = os.getenv("INDIAN_API_KEY")

# 2. Set your specific provider URL here (Example: A common RapidAPI endpoint)
# You will replace this URL with the specific one you subscribe to.
BASE_URL = "https://latest-stock-price.p.rapidapi.com" 

def get_indian_shareholding(symbol: str):
    """
    Fetches precise shareholding pattern for Indian stocks from a dedicated API.
    """
    if not INDIAN_API_KEY:
        return None

    # Clean the symbol: Remove .NS or .BO for many Indian APIs
    clean_symbol = symbol.replace('.NS', '').replace('.BO', '')

    headers = {
        "X-RapidAPI-Key": INDIAN_API_KEY,
        "X-RapidAPI-Host": "latest-stock-price.p.rapidapi.com" # Update this host to match your provider
    }

    try:
        # Example endpoint structure - Update based on your specific API documentation
        url = f"{BASE_URL}/shareholding-pattern?symbol={clean_symbol}"
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()

        # --- NORMALIZE DATA ---
        # Convert the specific API's response to our standard format
        # (This logic depends on the exact response format of the API you choose)
        
        return {
            "promoter": data.get('promoter', 0),
            "fii": data.get('fii', 0),
            "dii": data.get('dii', 0),
            "public": data.get('public', 0)
        }

    except Exception as e:
        print(f"Error fetching Indian shareholding for {symbol}: {e}")
        return None