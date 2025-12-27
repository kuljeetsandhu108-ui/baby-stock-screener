import asyncio
from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
from ..services import yahoo_service, fmp_service

router = APIRouter()

# --- THE UPDATED MASTER LIST ---
# Added: Bitcoin, Gold, Crude Oil
INDEX_MAP = {
    "Nifty 50":           {"symbol": "^NSEI",     "proxy_etf": "INDA", "currency": "INR", "tradingview_symbol": "NSE:NIFTY"},
    "Bank Nifty":         {"symbol": "^NSEBANK",  "proxy_etf": "INDA", "currency": "INR", "tradingview_symbol": "NSE:BANKNIFTY"},
    "Sensex":             {"symbol": "^BSESN",    "proxy_etf": "INDA", "currency": "INR", "tradingview_symbol": "BSE:SENSEX"},
    
    # Global
    "Dow Jones":          {"symbol": "^DJI",      "proxy_etf": "DIA",  "currency": "USD", "tradingview_symbol": "DJ:DJI"},
    "Nasdaq":             {"symbol": "^IXIC",     "proxy_etf": "QQQ",  "currency": "USD", "tradingview_symbol": "NASDAQ:IXIC"},
    "Nikkei 225":         {"symbol": "^N225",     "proxy_etf": "EWJ",  "currency": "JPY", "tradingview_symbol": "NIKKEI:NI225"},
    
    # Commodities & Crypto (NEW)
    "Gold":               {"symbol": "GC=F",      "proxy_etf": "GLD",  "currency": "USD", "tradingview_symbol": "TVC:GOLD"},
    "Crude Oil":          {"symbol": "CL=F",      "proxy_etf": "USO",  "currency": "USD", "tradingview_symbol": "TVC:USOIL"},
    "Bitcoin":            {"symbol": "BTC-USD",   "proxy_etf": "BITO", "currency": "USD", "tradingview_symbol": "BINANCE:BTCUSD"},
    
    # Others
    "Gift Nifty":         {"symbol": "NIFTY=F",   "proxy_etf": "INDA", "currency": "USD", "tradingview_symbol": "SGX:IN1!"},
    "India VIX":          {"symbol": "^INDIAVIX", "proxy_etf": None, "currency": "INR", "tradingview_symbol": "NSE:INDIAVIX"},
}

def fetch_summary_data_simple_and_robust():
    """
    Fetches live price and change for all indices in the map.
    """
    summary_list = []
    # Join all symbols with space for batch fetching
    symbols_string = " ".join([info["symbol"] for info in INDEX_MAP.values()])
    
    try:
        # Batch fetch from Yahoo is much faster
        tickers = yf.Tickers(symbols_string)
        
        for name, info in INDEX_MAP.items():
            symbol = info["symbol"]
            try:
                # Access specific ticker data
                ticker = tickers.tickers[symbol]
                
                # Yahoo 'fast_info' is often more reliable for indices/commodities
                # We try multiple keys to ensure we get a price
                current_price = None
                previous_close = None

                # Strategy 1: fast_info (Newer Yahoo API)
                if hasattr(ticker, 'fast_info'):
                    current_price = ticker.fast_info.last_price
                    previous_close = ticker.fast_info.previous_close

                # Strategy 2: info dict (Classic Fallback)
                if current_price is None:
                    info_dict = ticker.info
                    current_price = info_dict.get('regularMarketPrice') or info_dict.get('currentPrice')
                    previous_close = info_dict.get('previousClose') or info_dict.get('regularMarketPreviousClose')

                if current_price is None or previous_close is None:
                    continue

                change = current_price - previous_close
                percent_change = (change / previous_close) * 100
                
                summary_list.append({
                    "name": name, 
                    "symbol": symbol, 
                    "price": current_price,
                    "change": change, 
                    "percent_change": percent_change,
                    "currency": info["currency"]
                })
            except Exception as e:
                print(f"Could not process summary for {name} ({symbol}): {e}")
                continue
                
    except Exception as e:
        print(f"Global Index Fetch Error: {e}")
        return []
        
    return summary_list

@router.get("/summary")
async def get_indices_summary():
    summary_data = await asyncio.to_thread(fetch_summary_data_simple_and_robust)
    return summary_data

@router.get("/{index_symbol:path}/live-price")
async def get_index_live_price(index_symbol: str):
    try:
        ticker = yf.Ticker(index_symbol)
        
        # Fast Info is better for live indices
        if hasattr(ticker, 'fast_info'):
            price = ticker.fast_info.last_price
            prev = ticker.fast_info.previous_close
            if price and prev:
                change = price - prev
                pct = (change / prev) * 100
                return {"price": price, "change": change, "changesPercentage": pct}

        # Fallback
        info = ticker.info
        current_price = info.get('regularMarketPrice')
        previous_close = info.get('previousClose')
        
        if current_price is None or previous_close is None: 
            raise HTTPException(status_code=404, detail="Live price not available.")
            
        change = current_price - previous_close
        percent_change = (change / previous_close) * 100
        return {"price": current_price, "change": change, "changesPercentage": percent_change}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch live price.")

@router.get("/{index_symbol:path}/details")
async def get_index_details(index_symbol: str):
    index_name, proxy_etf, currency, tv_symbol = "Index", None, "USD", index_symbol
    
    # Lookup in our map
    found = False
    for name, data in INDEX_MAP.items():
        if data["symbol"] == index_symbol:
            index_name = name
            proxy_etf = data["proxy_etf"]
            currency = data["currency"]
            tv_symbol = data["tradingview_symbol"]
            found = True
            break
    
    # If not in our map (user searched manually), try to guess defaults
    if not found:
        if ".NS" in index_symbol or "^NSE" in index_symbol: currency = "INR"

    hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, index_symbol, "5y")
    technicals = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df.copy() if hist_df is not None else None)
    
    # If we have a proxy ETF (like GLD for Gold), fetch its profile data for rich UI
    if proxy_etf:
        proxy_tasks = {
            "profile": asyncio.to_thread(fmp_service.get_company_profile, proxy_etf),
            "quote": asyncio.to_thread(fmp_service.get_quote, proxy_etf),
            "analyst_ratings": asyncio.to_thread(yahoo_service.get_analyst_recommendations, proxy_etf),
        }
        proxy_results = await asyncio.gather(*proxy_tasks.values(), return_exceptions=True)
        proxy_data = dict(zip(proxy_tasks.keys(), proxy_results))
        
        # Clean results
        for key, value in proxy_data.items():
            if isinstance(value, Exception): 
                proxy_data[key] = {} if isinstance(proxy_data[key], dict) else []
                
        # Flatten list results
        if isinstance(proxy_data['profile'], list) and proxy_data['profile']:
            proxy_data['profile'] = proxy_data['profile'][0]
    else:
        proxy_data = {"profile": {}, "quote": {}, "analyst_ratings": []}

    combined_data = {
        "profile": {
            "companyName": index_name,
            "symbol": index_symbol,
            "image": proxy_data.get("profile", {}).get("image"),
            "currency": currency,
            "tradingview_symbol": tv_symbol,
            "description": f"Detailed market data for {index_name}."
        },
        "quote": proxy_data.get("quote", {}),
        "technical_indicators": technicals,
        "analyst_ratings": proxy_data.get("analyst_ratings", []),
    }
    
    return combined_data