import os
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

FMP_API_KEY = os.getenv("FMP_API_KEY")
BASE_URL = "https://financialmodelingprep.com/api/v3"
BASE_URL_V4 = "https://financialmodelingprep.com/api/v4"

# ==========================================
# 1. CORE COMPANY DATA
# ==========================================

def get_company_profile(symbol: str):
    """
    Fetches company profile (description, industry, CEO, etc.).
    """
    if not FMP_API_KEY: return {}
    try:
        url = f"{BASE_URL}/profile/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data[0] if data and isinstance(data, list) else {}
    except Exception as e:
        print(f"FMP Profile Error for {symbol}: {e}")
        return {}

def get_quote(symbol: str):
    """
    Fetches real-time price, change, and volume.
    """
    if not FMP_API_KEY: return {}
    try:
        url = f"{BASE_URL}/quote/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data[0] if data and isinstance(data, list) else {}
    except Exception as e:
        print(f"FMP Quote Error for {symbol}: {e}")
        return {}

# ==========================================
# 2. FINANCIALS & FUNDAMENTALS
# ==========================================

def get_financial_statements(symbol: str, statement_type: str, period: str = "annual", limit: int = 5):
    """
    Fetches Income Statement, Balance Sheet, or Cash Flow.
    statement_type options: 'income-statement', 'balance-sheet-statement', 'cash-flow-statement'
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/{statement_type}/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception:
        return []

def get_key_metrics(symbol: str, period: str = "annual", limit: int = 5):
    """
    Fetches key valuation metrics (P/E, P/B, ROE, etc.).
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/key-metrics/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except Exception:
        return []

def get_financial_ratios(symbol: str, period: str = "annual", limit: int = 5):
    """
    Fetches advanced financial ratios.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/ratios/{symbol}?period={period}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

# ==========================================
# 3. ANALYST & INSIDER DATA
# ==========================================

def get_analyst_ratings(symbol: str, limit: int = 100):
    """
    Fetches Buy/Sell/Hold ratings.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/rating/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

def get_analyst_estimates(symbol: str, limit: int = 1):
    """
    Fetches revenue and EPS estimates.
    """
    if not FMP_API_KEY: return {}
    try:
        url = f"{BASE_URL}/analyst-estimates/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        data = response.json()
        return data[0] if data else {}
    except Exception:
        return {}

def get_price_target_consensus(symbol: str):
    """
    Fetches high, low, and average price targets.
    """
    if not FMP_API_KEY: return {}
    try:
        url = f"{BASE_URL}/price-target-consensus/{symbol}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        data = response.json()
        return data[0] if data else {}
    except Exception:
        return {}

def get_shareholding_data(symbol: str, limit: int = 100):
    """
    Fetches institutional holders.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/institutional-holder/{symbol}?limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

# ==========================================
# 4. PEER COMPARISON (UPDATED)
# ==========================================

def get_stock_peers(symbol: str):
    """
    Fetches the official peer list from FMP v4 API.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL_V4}/stock_peers?symbol={symbol}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        data = response.json()
        # API returns: [{"peersList": ["AAPL", "MSFT", ...]}]
        if data and isinstance(data, list) and 'peersList' in data[0]:
            return data[0]['peersList']
        return []
    except Exception:
        return []

def get_peers_with_metrics(symbols: list):
    """
    Efficiently fetches metrics for multiple companies in ONE API call.
    Uses TTM (Trailing Twelve Months) for best comparison.
    """
    if not FMP_API_KEY or not symbols: return []
    try:
        symbols_str = ",".join(symbols)
        url = f"{BASE_URL}/key-metrics-ttm/{symbols_str}?apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

# ==========================================
# 5. SEARCH & NEWS
# ==========================================

def search_ticker(query: str, limit: int = 10):
    """
    Used for the Search Bar autocomplete.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/search?query={query}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

def get_stock_news(symbol: str, limit: int = 10):
    """
    Fetches specific news for a stock.
    """
    if not FMP_API_KEY: return []
    try:
        url = f"{BASE_URL}/stock_news?tickers={symbol}&limit={limit}&apikey={FMP_API_KEY}"
        response = requests.get(url)
        return response.json()
    except Exception:
        return []

# ==========================================
# 6. CHARTING ENGINE (HIGH PERFORMANCE)
# ==========================================

def get_historical_candles(symbol: str, timeframe: str = "1D"):
    """
    Fetches OHLCV candles specifically formatted for the Lightweight Charts frontend.
    
    INTELLIGENT ROUTING:
    - If timeframe is 5M, 15M, 1H, 4H -> Uses FMP Intraday API.
    - If timeframe is 1D -> Uses FMP Daily Historical API.
    
    Returns:
    - List of { time: UnixTimestamp, open, high, low, close, volume }
    - Sorted Oldest -> Newest (ready for chart).
    """
    if not FMP_API_KEY: return []
    
    try:
        # 1. Map Frontend Timeframe to FMP Endpoint
        endpoint = ""
        is_intraday = True
        
        # FMP supports: 1min, 5min, 15min, 30min, 1hour, 4hour
        if timeframe == "5M":
            endpoint = f"historical-chart/5min/{symbol}"
        elif timeframe == "15M":
            endpoint = f"historical-chart/15min/{symbol}"
        elif timeframe == "30M":
            endpoint = f"historical-chart/30min/{symbol}"
        elif timeframe == "1H":
            endpoint = f"historical-chart/1hour/{symbol}"
        elif timeframe == "4H":
            endpoint = f"historical-chart/4hour/{symbol}"
        else:
            # Default to Daily (Handles 1D, 1W, 1M, 1Y views via zooming)
            is_intraday = False
            endpoint = f"historical-price-full/{symbol}"

        url = f"{BASE_URL}/{endpoint}?apikey={FMP_API_KEY}"
        
        # Optimize Daily fetch: limit to last 3 years to keep response fast
        if not is_intraday:
            start_date = (datetime.now() - timedelta(days=1095)).strftime('%Y-%m-%d')
            url += f"&from={start_date}"

        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        # 2. Extract specific list based on endpoint type
        # Intraday returns list directly: [...]
        # Daily returns object: { symbol: 'AAP', historical: [...] }
        raw_candles = data if is_intraday else data.get('historical', [])
        
        if not raw_candles:
            return []

        formatted_data = []
        
        # 3. Process and Format Data
        for candle in raw_candles:
            date_str = candle.get('date')
            
            # FMP Date Formats:
            # Intraday: "2025-11-08 10:30:00"
            # Daily: "2025-11-08"
            
            try:
                if is_intraday:
                    # Parse full datetime string
                    dt_obj = datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
                else:
                    # Parse date string and set time to midnight UTC (standard for daily charts)
                    dt_obj = datetime.strptime(date_str, "%Y-%m-%d")
                
                # Convert to Unix Timestamp (Seconds)
                timestamp = int(dt_obj.timestamp())

                formatted_data.append({
                    "time": timestamp,
                    "open": candle.get('open'),
                    "high": candle.get('high'),
                    "low": candle.get('low'),
                    "close": candle.get('close'),
                    "volume": candle.get('volume')
                })
            except ValueError:
                # Skip malformed dates
                continue

        # 4. Sort: FMP usually sends Newest First. Charts need Oldest First.
        formatted_data.sort(key=lambda x: x['time'])
        
        return formatted_data

    except Exception as e:
        print(f"Error fetching FMP candles for {symbol} ({timeframe}): {e}")
        return []