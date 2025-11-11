import asyncio
from fastapi import APIRouter, HTTPException, Query, Body
from ..services import fmp_service, yahoo_service, news_service, gemini_service, fundamental_service
from pydantic import BaseModel
from typing import List, Dict, Any

# --- (All models are unchanged, just adding a new one) ---
class SwotRequest(BaseModel): companyName: str; description: str
class ForecastRequest(BaseModel): companyName: str; analystRatings: List[Dict[str, Any]]; priceTarget: Dict[str, Any]; keyStats: Dict[str, Any]; newsHeadlines: List[str]
class FundamentalRequest(BaseModel): companyName: str; keyMetrics: Dict[str, Any]

# --- NEW DATA MODEL for CANSLIM ---
class CanslimRequest(BaseModel):
    companyName: str
    quote: Dict[str, Any]
    quarterlyEarnings: List[Dict[str, Any]]
    annualEarnings: List[Dict[str, Any]]
    institutionalHolders: int

router = APIRouter()

# --- (search, swot, forecast, fundamental endpoints are unchanged) ---
@router.get("/search")
async def search_stock_ticker(query: str = Query(..., min_length=2)):
    # ... code unchanged
    ticker = gemini_service.get_ticker_from_query(query)
    if ticker in ["NOT_FOUND", "ERROR"]: raise HTTPException(status_code=404, detail=f"Could not find a ticker for '{query}'")
    return {"symbol": ticker}
@router.post("/{symbol}/swot")
async def get_swot_analysis(symbol: str, request_data: SwotRequest = Body(...)):
    # ... code unchanged
    print(f"Received SWOT request for {symbol}...")
    news_articles = await asyncio.to_thread(news_service.get_company_news, request_data.companyName)
    news_headlines = [article.get('title', '') for article in news_articles[:10]]
    swot_analysis = await asyncio.to_thread(gemini_service.generate_swot_analysis, request_data.companyName, request_data.description, news_headlines)
    return {"swot_analysis": swot_analysis}
@router.post("/{symbol}/forecast-analysis")
async def get_forecast_analysis(symbol: str, request_data: ForecastRequest = Body(...)):
    # ... code unchanged
    print(f"Received AI Forecast Analysis request for {symbol}...")
    analysis = await asyncio.to_thread(gemini_service.generate_forecast_analysis, company_name=request_data.companyName, analyst_ratings=request_data.analystRatings, price_target=request_data.priceTarget, key_stats=request_data.keyStats, news_headlines=request_data.newsHeadlines)
    return {"analysis": analysis}
@router.post("/{symbol}/fundamental-analysis")
async def get_fundamental_analysis(symbol: str, request_data: FundamentalRequest = Body(...)):
    # ... code unchanged
    print(f"Received AI Fundamental Analysis request for {symbol}...")
    assessment = await asyncio.to_thread(gemini_service.generate_investment_philosophy_assessment, company_name=request_data.companyName, key_metrics=request_data.keyMetrics)
    return {"assessment": assessment}

# --- NEW DEDICATED ENDPOINT FOR AI CANSLIM ANALYSIS ---
@router.post("/{symbol}/canslim-analysis")
async def get_canslim_analysis(symbol: str, request_data: CanslimRequest = Body(...)):
    """
    This endpoint is dedicated to generating the AI-powered CANSLIM assessment.
    """
    print(f"Received AI CANSLIM Analysis request for {symbol}...")
    
    assessment = await asyncio.to_thread(
        gemini_service.generate_canslim_assessment,
        company_name=request_data.companyName,
        quote=request_data.quote,
        quarterly_earnings=request_data.quarterlyEarnings,
        annual_earnings=request_data.annualEarnings,
        institutional_holders=request_data.institutionalHolders
    )
    return {"assessment": assessment}


@router.get("/{symbol}/all")
async def get_all_stock_data(symbol: str):
    """
    Main endpoint, now upgraded to fetch QUARTERLY financial data for CANSLIM analysis.
    """
    tasks = {
        "profile": asyncio.to_thread(fmp_service.get_company_profile, symbol),
        "quote": asyncio.to_thread(fmp_service.get_quote, symbol),
        "key_metrics": asyncio.to_thread(fmp_service.get_key_metrics, symbol, "annual", 1),
        "analyst_estimates": asyncio.to_thread(fmp_service.get_analyst_estimates, symbol),
        "shareholding": asyncio.to_thread(fmp_service.get_shareholding_data, symbol),
        "news": asyncio.to_thread(news_service.get_company_news, symbol),
        "analyst_ratings": asyncio.to_thread(yahoo_service.get_analyst_recommendations, symbol),
        "price_target_consensus": asyncio.to_thread(yahoo_service.get_price_target_data, symbol),
        "annual_income_statements": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "annual", 3),
        "annual_balance_sheets": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "balance-sheet-statement", "annual", 3),
        "annual_cash_flow_statements": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "cash-flow-statement", "annual", 3),
        # --- NEW TASK FOR CANSLIM ---
        "quarterly_income_statements": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "quarter", 5),
    }
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)
    data = dict(zip(tasks.keys(), results))
    data['annual_revenue_and_profit'] = data.pop('annual_income_statements')
    
    # ... (Fallback, Error Handling, and all other processing is unchanged) ...
    for key, value in data.items():
        if isinstance(value, Exception): data[key] = {} if isinstance(data[key], dict) else []
    
    key_metrics = data.get('key_metrics', [{}])[0] if isinstance(data.get('key_metrics'), list) else data.get('key_metrics', {})
    if not key_metrics or not key_metrics.get('peRatioTTM') or not key_metrics.get('earningsYieldTTM'):
        yahoo_fundamentals = await asyncio.to_thread(yahoo_service.get_key_fundamentals, symbol)
        key_metrics.update(yahoo_fundamentals)
    data['key_metrics'] = key_metrics
    
    hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, symbol, "1y")
    data['technical_indicators'] = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df)
    
    piotroski_data = fundamental_service.calculate_piotroski_f_score(data.get("annual_revenue_and_profit", []), data.get("annual_balance_sheets", []), data.get("annual_cash_flow_statements", []))
    data['piotroski_f_score'] = piotroski_data

    profile_data = data.get('profile', [{}])[0] if isinstance(data.get('profile'), list) else data.get('profile', {})
    tv_symbol = symbol
    if symbol.endswith(".NS"): tv_symbol = "BSE:" + symbol.replace(".NS", "")
    elif symbol.endswith(".BO"): tv_symbol = "BSE:" + symbol.replace(".BO", "")
    profile_data['tradingview_symbol'] = tv_symbol
    data['profile'] = profile_data
    
    data['quote'] = data['quote'][0] if isinstance(data['quote'], list) and data['quote'] else data.get('quote', {})
    
    quote_data, metrics_data, estimates_data = data.get('quote',{}), data.get('key_metrics',{}), data.get('analyst_estimates',{})
    data['keyStats'] = {
        "marketCap": profile_data.get('mktCap'), "dividendYield": metrics_data.get('dividendYieldTTM'),
        "peRatio": metrics_data.get('peRatioTTM'), "basicEPS": metrics_data.get('epsTTM'),
        "netIncome": metrics_data.get('netIncomePerShareTTM'), "revenue": metrics_data.get('revenuePerShareTTM'),
        "sharesFloat": quote_data.get('sharesOutstanding'), "beta": profile_data.get('beta'),
        "employees": profile_data.get('fullTimeEmployees'), "nextReportDate": estimates_data.get('date'),
        "epsEstimate": estimates_data.get('estimatedEpsAvg'), "revenueEstimate": estimates_data.get('estimatedRevenueAvg'),
    }
    
    return data