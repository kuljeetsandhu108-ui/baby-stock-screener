import os
import requests
from dotenv import load_dotenv

load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")
BASE_URL = "https://financialmodelingprep.com/api/v3"

def get_company_profile(symbol: str):
    """Fetches the company profile (description, industry, etc.) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/profile/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching company profile for {symbol}: {e}")
        return []

def get_quote(symbol: str):
    """Fetches the latest quote data (price, change, volume, etc.) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/quote/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching quote for {symbol}: {e}")
        return []

def get_financial_statements(symbol: str, statement_type: str, period: str = "annual", limit: int = 5):
    """Fetches financial statements (income-statement, balance-sheet, cash-flow) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/{statement_type}/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {statement_type} for {symbol}: {e}")
        return []

def get_key_metrics(symbol: str, period: str = "annual", limit: int = 5):
    """Fetches key metrics (P/E, P/B, Market Cap, ROE, etc.) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/key-metrics/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching key metrics for {symbol}: {e}")
        return []

def get_financial_ratios(symbol: str, period: str = "annual", limit: int = 5):
    """Fetches detailed financial ratios (current ratio, debt to equity, etc.) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/ratios/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching financial ratios for {symbol}: {e}")
        return []

def get_analyst_ratings(symbol: str, limit: int = 100):
    """Fetches analyst ratings and recommendations from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/rating/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching analyst ratings for {symbol}: {e}")
        return []

def get_shareholding_data(symbol: str, limit: int = 100):
    """Fetches the current list of institutional shareholders from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/institutional-holder/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching shareholding data for {symbol}: {e}")
        return []
    
def get_analyst_estimates(symbol: str, limit: int = 1):
    """Fetches analyst earnings estimates for the upcoming quarter from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/analyst-estimates/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()[0] if response.json() else {}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching analyst estimates for {symbol}: {e}")
        return {}

def get_price_target_consensus(symbol: str):
    """Fetches the price target consensus (high, low, average) from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/price-target-consensus/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()[0] if response.json() else {}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching price target consensus for {symbol}: {e}")
        return {}

def get_technical_indicators(symbol: str, period: int = 14):
    """Fetches a wide range of daily technical indicators from FMP."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/technical_indicator/daily/{symbol}?period={period}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()[0] if response.json() else {}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching technical indicators for {symbol}: {e}")
        return {}

def get_historical_institutional_ownership(symbol: str, limit: int = 8):
    """Fetches the quarterly historical ownership data for institutional investors."""
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    try:
        url = f"{BASE_URL}/institutional-ownership/symbol-ownership?symbol={symbol}&include_current_quarter=true&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching historical institutional ownership for {symbol}: {e}")
        return []

def get_peers_with_metrics(symbols: list):
    """
    This is now a utility function. It takes a LIST of symbols
    and fetches key metrics for all of them in a single, efficient batch call.
    """
    if not FMP_API_KEY:
        return {"error": "FMP API key not found."}
    if not symbols:
        return []
        
    try:
        # The FMP API allows for comma-separated symbols for high efficiency.
        symbols_str = ",".join(symbols)
        
        # We use the key-metrics-ttm endpoint to get the latest trailing-twelve-months data.
        metrics_url = f"{BASE_URL}/key-metrics-ttm/{symbols_str}?apikey={FMP_API_KEY}"
        metrics_response = requests.get(metrics_url)
        metrics_response.raise_for_status()
        
        return metrics_response.json()

    except requests.exceptions.RequestException as e:
        print(f"Error fetching peers metrics for symbols {symbols_str}: {e}")
        return []