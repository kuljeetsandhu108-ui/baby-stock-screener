import yfinance as yf
import pandas as pd
import pandas_ta as ta

def get_historical_data(symbol: str, period: str = "1y", interval: str = "1d"):
    """
    Fetches historical stock price data from Yahoo Finance for a given ticker.
    This returns a pandas DataFrame, which is ideal for calculations.
    """
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        if hist.empty:
            print(f"Warning: No historical data found for symbol '{symbol}'.")
            return None
        
        # Ensure all column names are lowercase for compatibility with pandas_ta
        hist.columns = [col.lower() for col in hist.columns]
        return hist

    except Exception as e:
        print(f"An error occurred while fetching historical data for {symbol} from yfinance: {e}")
        return None

def calculate_technical_indicators(df: pd.DataFrame):
    """
    Calculates a set of technical indicators from a DataFrame of historical price data.
    """
    if df is None or df.empty:
        return {}

    try:
        # Use pandas_ta to calculate all indicators and append them to the DataFrame
        df.ta.rsi(length=14, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
        df.ta.stoch(k=14, d=3, smooth_k=3, append=True)
        df.ta.adx(length=14, append=True)
        df.ta.atr(length=14, append=True)
        df.ta.willr(length=14, append=True)
        df.ta.bbands(length=20, std=2, append=True)
        
        latest_indicators = df.iloc[-1]

        return {
            "rsi": latest_indicators.get('RSI_14'),
            "macd": latest_indicators.get('MACD_12_26_9'),
            "macdsignal": latest_indicators.get('MACDs_12_26_9'),
            "stochasticsk": latest_indicators.get('STOCHk_14_3_3'),
            "adx": latest_indicators.get('ADX_14'),
            "atr": latest_indicators.get('ATRr_14'),
            "williamsr": latest_indicators.get('WILLR_14'),
            "bollingerBands": {
                "upperBand": latest_indicators.get('BBU_20_2.0'),
                "middleBand": latest_indicators.get('BBM_20_2.0'),
                "lowerBand": latest_indicators.get('BBL_20_2.0'),
            }
        }
    except Exception as e:
        print(f"Error calculating technical indicators: {e}")
        return {}

def get_analyst_recommendations(symbol: str):
    """
    Fetches analyst recommendation data (strong buy, buy, hold, etc.) from Yahoo Finance.
    """
    try:
        ticker = yf.Ticker(symbol)
        recommendations = ticker.recommendations
        if recommendations is None or recommendations.empty:
            return []
        
        latest_summary = recommendations.iloc[-1]
        
        return [{
            "ratingStrongBuy": int(latest_summary.get('strong buy', 0)),
            "ratingBuy": int(latest_summary.get('buy', 0)),
            "ratingHold": int(latest_summary.get('hold', 0)),
            "ratingSell": int(latest_summary.get('sell', 0)),
            "ratingStrongSell": int(latest_summary.get('strong sell', 0)),
        }]
    except Exception as e:
        print(f"Error fetching yfinance recommendations for {symbol}: {e}")
        return []

def get_price_target_data(symbol: str):
    """
    Fetches price target data (high, low, average) from Yahoo Finance's analysis info.
    """
    try:
        ticker = yf.Ticker(symbol)
        analysis = ticker.info
        
        if not analysis or 'targetMeanPrice' not in analysis or analysis.get('targetMeanPrice') is None:
            return {}
            
        return {
            "targetHigh": analysis.get('targetHighPrice'),
            "targetLow": analysis.get('targetLowPrice'),
            "targetConsensus": analysis.get('targetMeanPrice'),
        }
    except Exception as e:
        print(f"Error fetching yfinance price target for {symbol}: {e}")
        return {}

def get_key_fundamentals(symbol: str):
    """
    This is our fallback function. It gets essential metrics
    directly from Yahoo Finance's reliable .info dictionary.
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        trailing_eps = info.get('trailingEps')
        market_price = info.get('regularMarketPrice')
        
        earnings_yield = None
        if trailing_eps is not None and market_price is not None and market_price != 0:
            earnings_yield = trailing_eps / market_price
        
        roe = info.get('returnOnEquity')

        print(f"Yahoo Fallback: PE={info.get('trailingPE')}, EY={earnings_yield}, ROE={roe}")

        return {
            "peRatioTTM": info.get('trailingPE'),
            "earningsYieldTTM": earnings_yield,
            "returnOnCapitalEmployedTTM": roe,
        }
    except Exception as e:
        print(f"Error fetching yfinance key fundamentals for {symbol}: {e}")
        return {}

def get_historical_financials(symbol: str):
    """
    Fetches historical Income Statements, Balance Sheets, and Cash Flow statements
    from Yahoo Finance. This is our robust fallback for Piotroski calculations.
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Fetch annual data
        income_stmt_raw = ticker.financials
        balance_sheet_raw = ticker.balance_sheet
        cash_flow_raw = ticker.cashflow

        # Transpose to have dates as rows and select latest 3 years
        income_stmt = income_stmt_raw.transpose().reset_index().head(3)
        balance_sheet = balance_sheet_raw.transpose().reset_index().head(3)
        cash_flow = cash_flow_raw.transpose().reset_index().head(3)

        # --- Standardize the data to match the FMP API format ---
        # This is the "intelligence" that makes merging seamless.
        
        # Rename columns and format date. Use .get() to avoid errors on missing columns.
        income_stmt.rename(columns={'index': 'date', 'Net Income': 'netIncome', 'Total Revenue': 'revenue', 'Gross Profit': 'grossProfit', 'sharesIssued': 'weightedAverageShsOut'}, inplace=True)
        balance_sheet.rename(columns={'index': 'date', 'Total Assets': 'totalAssets', 'Long Term Debt': 'longTermDebt', 'Total Current Assets': 'totalCurrentAssets', 'Total Current Liabilities': 'totalCurrentLiabilities'}, inplace=True)
        cash_flow.rename(columns={'index': 'date', 'Operating Cash Flow': 'operatingCashFlow'}, inplace=True)
        
        # Convert Timestamps to string format 'YYYY-MM-DD'
        if 'date' in income_stmt.columns: income_stmt['date'] = income_stmt['date'].astype(str)
        if 'date' in balance_sheet.columns: balance_sheet['date'] = balance_sheet['date'].astype(str)
        if 'date' in cash_flow.columns: cash_flow['date'] = cash_flow['date'].astype(str)

        # Convert DataFrames to a list of dictionaries, which is what our calculator expects
        return {
            "income": income_stmt.to_dict('records'),
            "balance": balance_sheet.to_dict('records'),
            "cash_flow": cash_flow.to_dict('records'),
        }

    except Exception as e:
        print(f"Error fetching yfinance historical financials for {symbol}: {e}")
        return {"income": [], "balance": [], "cash_flow": []}