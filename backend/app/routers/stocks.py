import asyncio
import math
from fastapi import APIRouter, HTTPException, Query, Body
from ..services import fmp_service, yahoo_service, news_service, gemini_service, fundamental_service, technical_service, sentiment_service
from pydantic import BaseModel
from typing import List, Dict, Any

# ==========================================
# 1. DATA MODELS (Input Validation)
# ==========================================

class SwotRequest(BaseModel):
    companyName: str
    description: str

class ForecastRequest(BaseModel):
    companyName: str
    analystRatings: List[Dict[str, Any]]
    priceTarget: Dict[str, Any]
    keyStats: Dict[str, Any]
    newsHeadlines: List[str]
    currency: str = "USD" # Supports Currency Injection

class FundamentalRequest(BaseModel):
    companyName: str
    keyMetrics: Dict[str, Any]

class CanslimRequest(BaseModel):
    companyName: str
    quote: Dict[str, Any]
    quarterlyEarnings: List[Dict[str, Any]]
    annualEarnings: List[Dict[str, Any]]
    institutionalHolders: int

class ConclusionRequest(BaseModel):
    companyName: str
    piotroskiData: Dict[str, Any]
    grahamData: Dict[str, Any]
    darvasData: Dict[str, Any]
    canslimAssessment: str
    philosophyAssessment: str
    keyStats: Dict[str, Any]
    newsHeadlines: List[str]

class TimeframeRequest(BaseModel):
    timeframe: str

router = APIRouter()

# Map specific tickers to TradingView symbols if they differ
TRADINGVIEW_OVERRIDE_MAP = {
    "TATAPOWER.NS": "NSE:TATAPOWER",
    "RELIANCE.NS": "NSE:RELIANCE",
    "BAJFINANCE.NS": "NSE:BAJFINANCE",
    "HDFCBANK.NS": "NSE:HDFCBANK",
    "SBIN.NS": "NSE:SBIN",
    "INFY.NS": "NSE:INFY",
    "TCS.NS": "NSE:TCS",
}

# ==========================================
# 2. SEARCH & AUTOCOMPLETE
# ==========================================

@router.get("/autocomplete")
async def autocomplete_ticker(query: str = Query(..., min_length=1)):
    """
    Fast Autocomplete for Search Bar.
    Prioritizes NSE (.NS) and BSE (.BO) stocks over others.
    """
    # Fetch more results than needed so we can sort them
    results = await asyncio.to_thread(fmp_service.search_ticker, query, limit=30)
    
    if not results:
        return []

    # --- PRIORITY SORTING LOGIC ---
    def priority_score(item):
        symbol = item.get('symbol', '').upper()
        q = query.upper()
        
        score = 100 # Default low priority
        
        # Exact symbol match gets top priority
        if symbol == q or symbol == f"{q}.NS":
            score = 0
        elif symbol.endswith(".NS"):
            score = 10
        elif symbol.endswith(".BO"):
            score = 20
        else:
            score = 50
            
        return score

    # Sort based on score
    results.sort(key=priority_score)
    
    # Return top 10 after sorting
    return results[:10]


@router.get("/search")
async def search_stock_ticker(query: str = Query(..., min_length=2)):
    """AI-Powered Fallback Search."""
    ticker = gemini_service.get_ticker_from_query(query)
    if ticker in ["NOT_FOUND", "ERROR"]:
        results = fmp_service.search_ticker(query)
        if results: return {"symbol": results[0]['symbol']}
        raise HTTPException(status_code=404, detail=f"Could not find a ticker for '{query}'")
    return {"symbol": ticker}

# ==========================================
# 3. AI ANALYSIS ENDPOINTS
# ==========================================

@router.post("/{symbol}/swot")
async def get_swot_analysis(symbol: str, request_data: SwotRequest = Body(...)):
    """Generates SWOT Analysis."""
    news_articles = await asyncio.to_thread(news_service.get_company_news, request_data.companyName)
    news_headlines = [article.get('title', '') for article in news_articles[:10]]
    swot_analysis = await asyncio.to_thread(
        gemini_service.generate_swot_analysis,
        request_data.companyName,
        request_data.description,
        news_headlines
    )
    return {"swot_analysis": swot_analysis}

@router.post("/{symbol}/forecast-analysis")
async def get_forecast_analysis(symbol: str, request_data: ForecastRequest = Body(...)):
    """Generates AI Analyst Forecast Summary."""
    analysis = await asyncio.to_thread(
        gemini_service.generate_forecast_analysis,
        request_data.companyName,
        request_data.analystRatings,
        request_data.priceTarget,
        request_data.keyStats,
        request_data.newsHeadlines,
        request_data.currency # Pass currency
    )
    return {"analysis": analysis}

@router.post("/{symbol}/fundamental-analysis")
async def get_fundamental_analysis(symbol: str, request_data: FundamentalRequest = Body(...)):
    """Generates Investment Philosophy Match."""
    assessment = await asyncio.to_thread(
        gemini_service.generate_investment_philosophy_assessment,
        request_data.companyName,
        request_data.keyMetrics
    )
    return {"assessment": assessment}

@router.post("/{symbol}/canslim-analysis")
async def get_canslim_analysis(symbol: str, request_data: CanslimRequest = Body(...)):
    """Generates CANSLIM Strategy Checklist."""
    assessment = await asyncio.to_thread(
        gemini_service.generate_canslim_assessment,
        request_data.companyName,
        request_data.quote,
        request_data.quarterlyEarnings,
        request_data.annualEarnings,
        request_data.institutionalHolders
    )
    return {"assessment": assessment}

@router.post("/{symbol}/conclusion-analysis")
async def get_conclusion_analysis(symbol: str, request_data: ConclusionRequest = Body(...)):
    """Generates the Final Investment Grade & Thesis."""
    conclusion = await asyncio.to_thread(
        gemini_service.generate_fundamental_conclusion,
        request_data.companyName,
        request_data.piotroskiData,
        request_data.grahamData,
        request_data.darvasData,
        {k: v for k, v in request_data.dict().get('keyStats', {}).items() if v is not None},
        request_data.newsHeadlines
    )
    return {"conclusion": conclusion}

# --- TIMEFRAME AI CHART ANALYST ---
@router.post("/{symbol}/timeframe-analysis")
async def get_timeframe_analysis(symbol: str, request_data: TimeframeRequest = Body(...)):
    """
    Fetches live candles for the requested timeframe, calculates technicals, and feeds AI.
    """
    # 1. Fetch History (Yahoo is best for reliable interval data here)
    hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, symbol, period="1mo", interval=request_data.timeframe)
    
    if hist_df is None or hist_df.empty:
        return {"analysis": f"Could not fetch market data for {request_data.timeframe} timeframe."}

    # 2. Calculate Technicals
    technicals = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df)
    pivots = technical_service.calculate_pivot_points(hist_df)
    mas = technical_service.calculate_moving_averages(hist_df)
    
    # 3. Generate Analysis
    analysis = await asyncio.to_thread(
        gemini_service.generate_timeframe_analysis,
        symbol,
        request_data.timeframe,
        technicals,
        pivots,
        mas
    )
    return {"analysis": analysis}

# --- NEW: RAW TECHNICAL DATA FOR UI DASHBOARD ---
@router.post("/{symbol}/technicals-data")
async def get_technicals_data(symbol: str, request_data: TimeframeRequest = Body(...)):
    """
    Returns raw technical values (RSI, MACD, MAs, Pivots) for a specific timeframe.
    Used for the Technical Dashboard UI toggles.
    """
    # 1. Fetch History
    hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, symbol, period="1mo", interval=request_data.timeframe)
    
    if hist_df is None or hist_df.empty:
        return {"error": "No data available"}

    # 2. Calculate Everything
    technicals = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df)
    pivots = technical_service.calculate_pivot_points(hist_df)
    mas = technical_service.calculate_moving_averages(hist_df)
    
    # 3. Return structured data
    return {
        "technicalIndicators": technicals,
        "pivotPoints": pivots,
        "movingAverages": mas
    }

# ==========================================
# 4. ROBUST DATA ENDPOINTS
# ==========================================

@router.get("/{symbol}/peers")
async def get_peers_comparison(symbol: str):
    """
    Hybrid Peer Finder (FMP -> AI -> Suffix Fix).
    """
    # 1. Try FMP Peers API First
    peer_tickers = await asyncio.to_thread(fmp_service.get_stock_peers, symbol)
    
    # 2. If Empty, Ask AI
    if not peer_tickers:
        company_info = await asyncio.to_thread(yahoo_service.get_company_info, symbol)
        sector, industry, country, company_name = company_info.get('sector'), company_info.get('industry'), company_info.get('country'), company_info.get('longName', symbol)
        
        if all([sector, industry, country]):
            peer_tickers = await asyncio.to_thread(gemini_service.find_peer_tickers_by_industry, company_name, sector, industry, country)

    if not peer_tickers: return []
    
    # 3. Suffix Intelligence (Critical for International Stocks)
    if "." in symbol:
        suffix = "." + symbol.split(".")[-1] # e.g., .NS or .BO
        corrected_peers = []
        for peer in peer_tickers:
            peer = peer.strip().upper()
            if "." not in peer:
                peer = peer + suffix
            corrected_peers.append(peer)
        peer_tickers = corrected_peers

    # Limit to top 5
    all_symbols_to_fetch = [symbol] + peer_tickers[:5]
    
    # 4. Fetch Data (FMP Bulk -> Yahoo Fallback)
    fmp_peers_data = await asyncio.to_thread(fmp_service.get_peers_with_metrics, all_symbols_to_fetch)
    peers_map = {item['symbol']: item for item in fmp_peers_data}
    
    tasks_to_run = []
    for peer_symbol in all_symbols_to_fetch:
        # Fetch from Yahoo if not in FMP map OR if P/E is missing
        if peer_symbol not in peers_map or not peers_map[peer_symbol].get('peRatioTTM'):
            tasks_to_run.append((peer_symbol, asyncio.to_thread(yahoo_service.get_key_fundamentals, peer_symbol)))
            
    if tasks_to_run:
        fallback_results = await asyncio.gather(*[task for _, task in tasks_to_run], return_exceptions=True)
        for (peer_symbol, _), result in zip(tasks_to_run, fallback_results):
            if not isinstance(result, Exception) and result:
                if peer_symbol not in peers_map: peers_map[peer_symbol] = {"symbol": peer_symbol}
                peers_map[peer_symbol].update(result)
                
    return list(peers_map.values())

@router.get("/{symbol}/chart")
async def get_stock_chart(symbol: str, range: str = "1D"):
    """
    Hybrid Chart Data: FMP (Paid/Fast) -> Yahoo (Backup)
    """
    data = await asyncio.to_thread(fmp_service.get_historical_candles, symbol, timeframe=range)
    
    if not data or len(data) == 0:
        data = await asyncio.to_thread(yahoo_service.get_chart_data, symbol, range_type=range.lower())
    
    return data

@router.get("/{symbol}/all")
async def get_all_stock_data(symbol: str):
    """
    THE MASTER ENDPOINT.
    Uses SMART RACE STRATEGY for International Stocks.
    """
    
    # 1. SMART RACE STRATEGY: Detect International Stock
    is_international = "." in symbol
    
    # Base Tasks (FMP)
    tasks = {
        "fmp_profile": asyncio.to_thread(fmp_service.get_company_profile, symbol),
        "fmp_quote": asyncio.to_thread(fmp_service.get_quote, symbol),
        "fmp_key_metrics": asyncio.to_thread(fmp_service.get_key_metrics, symbol, "annual", 1),
        
        "fmp_income_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "annual", 10),
        "fmp_balance_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "balance-sheet-statement", "annual", 10),
        "fmp_cash_flow_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "cash-flow-statement", "annual", 10),
        
        "fmp_quarterly_income": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "quarter", 5),
        "fmp_quarterly_balance": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "balance-sheet-statement", "quarter", 5),
        "fmp_quarterly_cash_flow": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "cash-flow-statement", "quarter", 5),
        
        "shareholding": asyncio.to_thread(fmp_service.get_shareholding_data, symbol),
        "news": asyncio.to_thread(news_service.get_company_news, symbol),
        
        "yf_recommendations": asyncio.to_thread(yahoo_service.get_analyst_recommendations, symbol),
        "yf_price_target": asyncio.to_thread(yahoo_service.get_price_target_data, symbol),
        
        # Technicals (Reduced to 260d for speed)
        "hist_df": asyncio.to_thread(yahoo_service.get_historical_data, symbol, "260d"),
    }

    # Backup Tasks (Yahoo) - Triggered concurrently if international to save time
    if is_international:
        tasks.update({
            "yf_profile": asyncio.to_thread(yahoo_service.get_company_profile, symbol),
            "yf_quote": asyncio.to_thread(yahoo_service.get_quote, symbol),
            "yf_key_fundamentals": asyncio.to_thread(yahoo_service.get_key_fundamentals, symbol),
            "yf_shareholding": asyncio.to_thread(yahoo_service.get_shareholding_summary, symbol),
            "yf_historical_financials": asyncio.to_thread(yahoo_service.get_historical_financials, symbol),
            "yf_quarterly_financials": asyncio.to_thread(yahoo_service.get_quarterly_financials, symbol),
        })
    else:
        # Standard flow: We still prep fetching fundamentals/shareholding from Yahoo as safe fallbacks
        tasks["yf_key_fundamentals"] = asyncio.to_thread(yahoo_service.get_key_fundamentals, symbol)
        tasks["yf_shareholding"] = asyncio.to_thread(yahoo_service.get_shareholding_summary, symbol)

    # 2. Execute ALL Tasks in Parallel
    try:
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        raw_data = dict(zip(tasks.keys(), results))
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail="Data fetch failed.")

    # 3. Data Processing & Merging
    final_data = {}
    
    def safe_get(key, default=None):
        val = raw_data.get(key)
        if isinstance(val, Exception) or val is None: return default
        if isinstance(val, list) and len(val) == 0: return default
        if isinstance(val, list) and isinstance(default, dict): return val[0]
        return val

    def is_valid_financials(data):
        if not data or not isinstance(data, list) or len(data) == 0: return False
        # Check first 3 years for any valid data
        for i in range(min(3, len(data))):
            if data[i].get('netIncome') is not None or data[i].get('revenue') is not None:
                return True
        return False

    # --- MERGE LOGIC ---

    # Profile & Quote
    p_fmp = safe_get('fmp_profile', {})
    q_fmp = safe_get('fmp_quote', {})
    
    if not p_fmp or not q_fmp.get('price'):
        if not is_international:
            # Did not fetch concurrently? Fetch now.
            p_yf = await asyncio.to_thread(yahoo_service.get_company_profile, symbol)
            q_yf = await asyncio.to_thread(yahoo_service.get_quote, symbol)
            final_data['profile'] = p_yf
            final_data['quote'] = q_yf
        else:
            # Already fetched concurrently
            final_data['profile'] = safe_get('yf_profile', {})
            final_data['quote'] = safe_get('yf_quote', {})
    else:
        final_data['profile'] = p_fmp
        final_data['quote'] = q_fmp

    # Metrics
    fmp_m = safe_get('fmp_key_metrics', {})
    yf_m = safe_get('yf_key_fundamentals', {})
    final_data['key_metrics'] = {**yf_m, **fmp_m}

    # Financials (FMP -> Yahoo Fallback)
    fmp_inc = safe_get('fmp_income_5y', [])
    
    if is_valid_financials(fmp_inc):
        final_data['annual_revenue_and_profit'] = fmp_inc
        final_data['annual_balance_sheets'] = safe_get('fmp_balance_5y', [])
        final_data['annual_cash_flow_statements'] = safe_get('fmp_cash_flow_5y', [])
        final_data['quarterly_income_statements'] = safe_get('fmp_quarterly_income', [])
        final_data['quarterly_balance_sheets'] = safe_get('fmp_quarterly_balance', [])
        final_data['quarterly_cash_flow_statements'] = safe_get('fmp_quarterly_cash_flow', [])
    else:
        # Use Yahoo fallback
        if not is_international:
             yf_hist = await asyncio.to_thread(yahoo_service.get_historical_financials, symbol)
             yf_q = await asyncio.to_thread(yahoo_service.get_quarterly_financials, symbol)
        else:
             yf_hist = safe_get('yf_historical_financials', {'income':[]})
             yf_q = safe_get('yf_quarterly_financials', {'income':[]})
        
        final_data['annual_revenue_and_profit'] = yf_hist.get('income', [])
        final_data['annual_balance_sheets'] = yf_hist.get('balance', [])
        final_data['annual_cash_flow_statements'] = yf_hist.get('cash_flow', [])
        final_data['quarterly_income_statements'] = yf_q.get('income', [])
        final_data['quarterly_balance_sheets'] = yf_q.get('balance', [])
        final_data['quarterly_cash_flow_statements'] = yf_q.get('cash_flow', [])

    # Calculations
    final_data['piotroski_f_score'] = fundamental_service.calculate_piotroski_f_score(
        final_data['annual_revenue_and_profit'], 
        final_data['annual_balance_sheets'], 
        final_data['annual_cash_flow_statements']
    )
    final_data['graham_scan'] = fundamental_service.calculate_graham_scan(
        final_data['profile'], final_data['key_metrics'], final_data['annual_revenue_and_profit']
    )

    # Technicals
    hist_df = raw_data.get('hist_df')
    if isinstance(hist_df, Exception) or hist_df is None:
        hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, symbol, "260d")

    final_data['technical_indicators'] = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df)
    final_data['darvas_scan'] = technical_service.calculate_darvas_box(hist_df, final_data['quote'], final_data['profile'].get('currency'))
    final_data['moving_averages'] = technical_service.calculate_moving_averages(hist_df)
    final_data['pivot_points'] = technical_service.calculate_pivot_points(hist_df)
    
    # Sentiment
    final_data['overall_sentiment'] = sentiment_service.calculate_overall_sentiment(
        piotroski_score=final_data['piotroski_f_score'].get('score'),
        key_metrics=final_data['key_metrics'],
        technicals=final_data['technical_indicators'],
        analyst_ratings=safe_get('yf_recommendations', [])
    )
    
    # Shareholding
    fmp_hold = safe_get('shareholding', [])
    if fmp_hold:
        total_inst = sum(h.get('shares', 0) for h in fmp_hold)
        final_data['shareholding_breakdown'] = {"promoter": 0, "fii": total_inst * 0.6, "dii": total_inst * 0.4, "public": 0} 
        final_data['shareholding'] = fmp_hold
    else:
        if not is_international:
             yf_hold_sum = await asyncio.to_thread(yahoo_service.get_shareholding_summary, symbol)
        else:
             yf_hold_sum = safe_get('yf_shareholding', {})
        final_data['shareholding_breakdown'] = yf_hold_sum
        final_data['shareholding'] = []

    final_data['news'] = safe_get('news', [])
    final_data['analyst_ratings'] = safe_get('yf_recommendations', [])
    final_data['price_target_consensus'] = safe_get('yf_price_target', {})

    tv_symbol = symbol
    if symbol in TRADINGVIEW_OVERRIDE_MAP: tv_symbol = TRADINGVIEW_OVERRIDE_MAP[symbol]
    elif symbol.endswith(".NS"): tv_symbol = symbol.replace(".NS", "")
    elif symbol.endswith(".BO"): tv_symbol = "BSE:" + symbol.replace(".BO", "")
    final_data['profile']['tradingview_symbol'] = tv_symbol

    k_met = final_data.get('key_metrics', {})
    k_prof = final_data.get('profile', {})
    k_quo = final_data.get('quote', {})
    k_est = safe_get('analyst_estimates', {})
    
    def sanitize_float(value):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)): return None
        return value

    raw_stats = {
        "marketCap": k_prof.get('mktCap') or k_met.get('marketCap'),
        "dividendYield": k_met.get('dividendYieldTTM'),
        "peRatio": k_met.get('peRatioTTM'),
        "basicEPS": k_met.get('epsTTM'),
        "netIncome": k_met.get('netIncomePerShareTTM'),
        "revenue": k_met.get('revenuePerShareTTM'),
        "sharesFloat": k_quo.get('sharesOutstanding') or k_met.get('sharesOutstanding'),
        "beta": k_prof.get('beta') or k_met.get('beta'),
        "employees": k_prof.get('fullTimeEmployees') or k_met.get('fullTimeEmployees'),
        "nextReportDate": k_est.get('date') if isinstance(k_est, dict) else None,
        "epsEstimate": k_est.get('estimatedEpsAvg') if isinstance(k_est, dict) else None,
        "revenueEstimate": k_est.get('estimatedRevenueAvg') if isinstance(k_est, dict) else None,
    }
    
    final_data['keyStats'] = {k: sanitize_float(v) for k, v in raw_stats.items()}
    
    def clean_nans(obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj): return None
            return obj
        elif isinstance(obj, dict): return {k: clean_nans(v) for k, v in obj.items()}
        elif isinstance(obj, list): return [clean_nans(v) for v in obj]
        return obj

    return clean_nans(final_data)