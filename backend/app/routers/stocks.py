import asyncio
from fastapi import APIRouter, HTTPException, Query, Body
from ..services import fmp_service, yahoo_service, news_service, gemini_service, fundamental_service, technical_service, sentiment_service
from pydantic import BaseModel
from typing import List, Dict, Any

class ConclusionRequest(BaseModel):
    companyName: str
    piotroskiData: Dict[str, Any]
    grahamData: Dict[str, Any]
    darvasData: Dict[str, Any]
    canslimAssessment: str
    philosophyAssessment: str
class SwotRequest(BaseModel): companyName: str; description: str
class ForecastRequest(BaseModel): companyName: str; analystRatings: List[Dict[str, Any]]; priceTarget: Dict[str, Any]; keyStats: Dict[str, Any]; newsHeadlines: List[str]
class FundamentalRequest(BaseModel): companyName: str; keyMetrics: Dict[str, Any]
class CanslimRequest(BaseModel): companyName: str; quote: Dict[str, Any]; quarterlyEarnings: List[Dict[str, Any]]; annualEarnings: List[Dict[str, Any]]; institutionalHolders: int
router = APIRouter()

@router.get("/search")
async def search_stock_ticker(query: str = Query(..., min_length=2)):
    ticker = gemini_service.get_ticker_from_query(query)
    if ticker in ["NOT_FOUND", "ERROR"]: raise HTTPException(status_code=404, detail=f"Could not find a ticker for '{query}'")
    return {"symbol": ticker}
@router.post("/{symbol}/swot")
async def get_swot_analysis(symbol: str, request_data: SwotRequest = Body(...)):
    print(f"Received SWOT request for {symbol}...")
    news_articles = await asyncio.to_thread(news_service.get_company_news, request_data.companyName)
    news_headlines = [article.get('title', '') for article in news_articles[:10]]
    swot_analysis = await asyncio.to_thread(gemini_service.generate_swot_analysis, request_data.companyName, request_data.description, news_headlines)
    return {"swot_analysis": swot_analysis}
@router.post("/{symbol}/forecast-analysis")
async def get_forecast_analysis(symbol: str, request_data: ForecastRequest = Body(...)):
    print(f"Received AI Forecast Analysis request for {symbol}...")
    analysis = await asyncio.to_thread(gemini_service.generate_forecast_analysis, company_name=request_data.companyName, analyst_ratings=request_data.analystRatings, price_target=request_data.priceTarget, key_stats=request_data.keyStats, news_headlines=request_data.newsHeadlines)
    return {"analysis": analysis}
@router.post("/{symbol}/fundamental-analysis")
async def get_fundamental_analysis(symbol: str, request_data: FundamentalRequest = Body(...)):
    print(f"Received AI Fundamental Analysis request for {symbol}...")
    assessment = await asyncio.to_thread(gemini_service.generate_investment_philosophy_assessment, company_name=request_data.companyName, key_metrics=request_data.keyMetrics)
    return {"assessment": assessment}
@router.post("/{symbol}/canslim-analysis")
async def get_canslim_analysis(symbol: str, request_data: CanslimRequest = Body(...)):
    print(f"Received AI CANSLIM Analysis request for {symbol}...")
    assessment = await asyncio.to_thread(gemini_service.generate_canslim_assessment, company_name=request_data.companyName, quote=request_data.quote, quarterly_earnings=request_data.quarterlyEarnings, annual_earnings=request_data.annualEarnings, institutional_holders=request_data.institutionalHolders)
    return {"assessment": assessment}
@router.get("/{symbol}/peers")
async def get_peers_comparison(symbol: str):
    print(f"Received AI Peers Comparison request for {symbol}...")
    company_info = await asyncio.to_thread(yahoo_service.get_company_info, symbol)
    sector, industry, country, company_name = company_info.get('sector'), company_info.get('industry'), company_info.get('country'), company_info.get('longName', symbol)
    if not all([sector, industry, country]): return []
    print(f"Asking AI for peers of {company_name}...")
    peer_tickers = await asyncio.to_thread(gemini_service.find_peer_tickers_by_industry, company_name, sector, industry, country)
    if not peer_tickers: return []
    print(f"AI found peers: {peer_tickers}")
    all_symbols_to_fetch = [symbol] + peer_tickers
    fmp_peers_data = await asyncio.to_thread(fmp_service.get_peers_with_metrics, all_symbols_to_fetch)
    peers_map = {item['symbol']: item for item in fmp_peers_data}
    tasks_to_run = []
    for peer_symbol in all_symbols_to_fetch:
        if peer_symbol not in peers_map or not peers_map[peer_symbol].get('peRatioTTM'):
            tasks_to_run.append((peer_symbol, asyncio.to_thread(yahoo_service.get_key_fundamentals, peer_symbol)))
    if tasks_to_run:
        fallback_results = await asyncio.gather(*[task for _, task in tasks_to_run], return_exceptions=True)
        for (peer_symbol, _), result in zip(tasks_to_run, fallback_results):
            if not isinstance(result, Exception) and result:
                if peer_symbol not in peers_map: peers_map[peer_symbol] = {"symbol": peer_symbol}
                peers_map[peer_symbol].update(result)
    final_peers_data = list(peers_map.values())
    return final_peers_data

@router.post("/{symbol}/conclusion-analysis")
async def get_conclusion_analysis(symbol: str, request_data: ConclusionRequest = Body(...)):
    """
    This lazy-loading endpoint is dedicated to generating the final AI-powered conclusion.
    """
    print(f"Received AI Conclusion Analysis request for {symbol}...")
    
    conclusion = await asyncio.to_thread(
        gemini_service.generate_fundamental_conclusion,
        company_name=request_data.companyName,
        piotroski_data=request_data.piotroskiData,
        graham_data=request_data.grahamData,
        darvas_data=request_data.darvasData,
        canslim_assessment=request_data.canslimAssessment,
        philosophy_assessment=request_data.philosophyAssessment
    )
    return {"conclusion": conclusion}

@router.get("/{symbol}/all")
async def get_all_stock_data(symbol: str):
    tasks = {
        "fmp_profile": asyncio.to_thread(fmp_service.get_company_profile, symbol), "fmp_quote": asyncio.to_thread(fmp_service.get_quote, symbol),
        "fmp_key_metrics": asyncio.to_thread(fmp_service.get_key_metrics, symbol, "annual", 1),
        "fmp_income_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "annual", 5),
        "fmp_balance_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "balance-sheet-statement", "annual", 5),
        "fmp_cash_flow_5y": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "cash-flow-statement", "annual", 5),
        "fmp_quarterly_income": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "income-statement", "quarter", 5),
        "fmp_quarterly_balance": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "balance-sheet-statement", "quarter", 5),
        "fmp_quarterly_cash_flow": asyncio.to_thread(fmp_service.get_financial_statements, symbol, "cash-flow-statement", "quarter", 5),
        "shareholding": asyncio.to_thread(fmp_service.get_shareholding_data, symbol),
        "yf_shareholding": asyncio.to_thread(yahoo_service.get_shareholding_summary, symbol),
        "news": asyncio.to_thread(news_service.get_company_news, symbol),
        
        "yf_recommendations": asyncio.to_thread(yahoo_service.get_analyst_recommendations, symbol),
        "yf_price_target": asyncio.to_thread(yahoo_service.get_price_target_data, symbol),
        "yf_historical_financials": asyncio.to_thread(yahoo_service.get_historical_financials, symbol),
        "yf_key_fundamentals": asyncio.to_thread(yahoo_service.get_key_fundamentals, symbol),
    }

    try:
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        raw_data = dict(zip(tasks.keys(), results))
    except Exception as e:
        print(f"CRITICAL ASYNCIO ERROR: {e}")
        raise HTTPException(status_code=500, detail="A critical error occurred while fetching data.")

    final_data = {}

    # This is the new, unbreakable error handling loop.
    for key, value in raw_data.items():
        if isinstance(value, BaseException): # This now catches ALL errors, including SSLError
            print(f"HANDLED SEVERE ERROR for '{key}': {value}")
            # We replace the error with a safe, empty default value.
            raw_data[key] = {} if 'metrics' in key or 'profile' in key or 'quote' in key else []
    
    # The rest of the code is now safe because it will receive empty data instead of an error.
    final_data['profile'] = raw_data.get('fmp_profile', [{}])[0] if isinstance(raw_data.get('fmp_profile'), list) else raw_data.get('fmp_profile', {})
    final_data['quote'] = raw_data.get('fmp_quote', [{}])[0] if isinstance(raw_data.get('fmp_quote'), list) else raw_data.get('fmp_quote', {})
    fmp_metrics = raw_data.get('fmp_key_metrics', [{}])[0] if isinstance(raw_data.get('fmp_key_metrics'), list) else raw_data.get('fmp_key_metrics', {})
    yf_fundamentals = raw_data.get('yf_key_fundamentals', {})
    merged_metrics = {**yf_fundamentals, **fmp_metrics}
    final_data['key_metrics'] = merged_metrics
    fmp_income = raw_data.get('fmp_income_5y', []); yf_income = raw_data.get('yf_historical_financials', {}).get('income', [])
    income_statements = fmp_income if len(fmp_income) >= 5 else yf_income
    final_data['annual_revenue_and_profit'] = income_statements
    fmp_balance = raw_data.get('fmp_balance_5y', []); yf_balance = raw_data.get('yf_historical_financials', {}).get('balance', [])
    balance_sheets = fmp_balance if len(fmp_balance) >= 5 else yf_balance
    final_data['annual_balance_sheets'] = balance_sheets
    fmp_cash_flow = raw_data.get('fmp_cash_flow_5y', []); yf_cash_flow = raw_data.get('yf_historical_financials', {}).get('cash_flow', [])
    cash_flow_statements = fmp_cash_flow if len(fmp_cash_flow) >= 5 else yf_cash_flow
    final_data['annual_cash_flow_statements'] = cash_flow_statements
    final_data['quarterly_income_statements'] = raw_data.get('fmp_quarterly_income', [])
    final_data['quarterly_balance_sheets'] = raw_data.get('fmp_quarterly_balance', [])
    final_data['quarterly_cash_flow_statements'] = raw_data.get('fmp_quarterly_cash_flow', [])
    final_data['piotroski_f_score'] = fundamental_service.calculate_piotroski_f_score(income_statements, balance_sheets, cash_flow_statements)
    final_data['graham_scan'] = fundamental_service.calculate_graham_scan(final_data['profile'], final_data['key_metrics'], income_statements)
    hist_df = await asyncio.to_thread(yahoo_service.get_historical_data, symbol, "300d")
    final_data['technical_indicators'] = await asyncio.to_thread(yahoo_service.calculate_technical_indicators, hist_df)
    final_data['darvas_scan'] = technical_service.calculate_darvas_box(hist_df, final_data['quote'], final_data['profile'].get('currency'))

    final_data['moving_averages'] = technical_service.calculate_moving_averages(hist_df)
    final_data['pivot_points'] = technical_service.calculate_pivot_points(hist_df)
    final_data['overall_sentiment'] = sentiment_service.calculate_overall_sentiment(piotroski_score=final_data['piotroski_f_score'].get('score'), pe_ratio=final_data['key_metrics'].get('peRatioTTM'), analyst_ratings=raw_data.get('yf_recommendations', []), rsi=final_data['technical_indicators'].get('rsi'))
# --- INTELLIGENT SHAREHOLDING MERGE ---
    # We prioritize the detailed breakdown from Yahoo Finance.
    yf_shareholding = raw_data.get('yf_shareholding', {})
    if yf_shareholding and yf_shareholding.get('promoter', 0) > 0:
        print(f"Using reliable Yahoo Finance shareholding data for {symbol}.")
        final_data['shareholding_breakdown'] = yf_shareholding
    else:
        # If Yahoo fails, we fall back to a simplified calculation from FMP's institutional data.
        print(f"Falling back to FMP for shareholding data for {symbol}.")
        fmp_shareholding = raw_data.get('shareholding', [])
        total_institutional_shares = sum(h.get('shares', 0) for h in fmp_shareholding)
        # This is a rough proxy, but better than nothing.
        final_data['shareholding_breakdown'] = {
            "promoter": 0,
            "fii": total_institutional_shares * 0.6,
            "dii": total_institutional_shares * 0.4,
            "public": 0, # Cannot be determined from this data
        }
    
    # We still pass the raw FMP data for any other components that might need it
    final_data['shareholding'] = raw_data.get('shareholding', [])
    final_data['news'] = raw_data.get('news', [])
    final_data['analyst_ratings'] = raw_data.get('yf_recommendations', [])
    final_data['price_target_consensus'] = raw_data.get('yf_price_target', {})
    tv_symbol = symbol
    if symbol.endswith(".NS"): tv_symbol = symbol.split('.')[0]
    elif symbol.endswith(".BO"): tv_symbol = symbol.split('.')[0]
    final_data['profile']['tradingview_symbol'] = tv_symbol
    keyStats_metrics = final_data.get('key_metrics', {}); keyStats_profile = final_data.get('profile', {}); keyStats_quote = final_data.get('quote', {}); keyStats_estimates = raw_data.get('analyst_estimates', {})
    final_data['keyStats'] = {"marketCap": keyStats_profile.get('mktCap'), "dividendYield": keyStats_metrics.get('dividendYieldTTM'), "peRatio": keyStats_metrics.get('peRatioTTM'), "basicEPS": keyStats_metrics.get('epsTTM'), "netIncome": keyStats_metrics.get('netIncomePerShareTTM'), "revenue": keyStats_metrics.get('revenuePerShareTTM'), "sharesFloat": keyStats_quote.get('sharesOutstanding'), "beta": keyStats_profile.get('beta'), "employees": keyStats_profile.get('fullTimeEmployees'), "nextReportDate": keyStats_estimates.get('date'), "epsEstimate": keyStats_estimates.get('estimatedEpsAvg'), "revenueEstimate": keyStats_estimates.get('estimatedRevenueAvg'),}
    
    return final_data