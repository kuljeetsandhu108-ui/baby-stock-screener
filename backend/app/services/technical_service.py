import pandas as pd
import pandas_ta as ta
import numpy as np

def get_currency_symbol(currency_code: str):
    """
    Converts a currency code (e.g., 'INR') into its corresponding symbol (e.g., '₹').
    """
    symbols = {
        "INR": "₹",
        "USD": "$",
        "JPY": "¥",
        "EUR": "€",
        "GBP": "£",
    }
    return symbols.get(currency_code, "$")

def calculate_darvas_box(hist_df: pd.DataFrame, quote: dict, currency_code: str):
    """
    Analyzes historical price data to identify a Darvas Box pattern.
    """
    if hist_df is None or len(hist_df) < 30 or not quote:
        return {"status": "Insufficient Data", "message": "Not enough historical data to perform scan."}

    try:
        current_price = quote.get('price')
        year_high = quote.get('yearHigh')
        avg_volume = quote.get('avgVolume')
        current_volume = quote.get('volume')

        if not all([current_price, year_high, avg_volume, current_volume]):
             return {"status": "Insufficient Data", "message": "Missing key price or volume data."}
        
        currency_symbol = get_currency_symbol(currency_code)

        if current_price < (year_high * 0.90):
            return {
                "status": "Not a Candidate",
                "message": f"Stock price ({currency_symbol}{current_price:.2f}) is not within 10% of its 52-week high ({currency_symbol}{year_high:.2f})."
            }

        recent_period = hist_df.tail(15)
        box_top = recent_period['high'].max()
        box_bottom = recent_period['low'].min()

        if box_top > box_bottom * 1.08:
            return {
                "status": "No Box Formed",
                "message": "Stock is too volatile and has not formed a narrow consolidation box recently."
            }

        if current_price > box_top:
            volume_check = "on high volume" if current_volume > (avg_volume * 1.5) else "on average volume"
            return {
                "status": "Breakout!",
                "message": f"Stock has broken out above the box top of {currency_symbol}{box_top:.2f} {volume_check}.",
                "box_top": box_top, "box_bottom": box_bottom, "result": "Pass"
            }
        
        elif current_price < box_bottom:
            return {
                "status": "Breakdown",
                "message": f"Stock has broken down below the box bottom of {currency_symbol}{box_bottom:.2f}.",
                "box_top": box_top, "box_bottom": box_bottom, "result": "Fail"
            }
        
        else:
            return {
                "status": "In Box",
                "message": f"Stock is consolidating in a Darvas Box between {currency_symbol}{box_bottom:.2f} and {currency_symbol}{box_top:.2f}.",
                "box_top": box_top, "box_bottom": box_bottom, "result": "Neutral"
            }

    except Exception as e:
        print(f"Error calculating Darvas Box: {e}")
        return {"status": "Calculation Error", "message": str(e)}


def calculate_moving_averages(hist_df: pd.DataFrame):
    """
    Calculates a standard set of Simple Moving Averages (SMA).
    """
    if hist_df is None or hist_df.empty or len(hist_df) < 50: # Reduced requirement slightly
        return {} 
    
    try:
        # Calculate SMAs, checking if enough data exists for 200
        mas = {
            "5": hist_df['close'].rolling(window=5).mean().iloc[-1],
            "10": hist_df['close'].rolling(window=10).mean().iloc[-1],
            "20": hist_df['close'].rolling(window=20).mean().iloc[-1],
            "50": hist_df['close'].rolling(window=50).mean().iloc[-1],
            "100": hist_df['close'].rolling(window=100).mean().iloc[-1] if len(hist_df) >= 100 else None,
            "200": hist_df['close'].rolling(window=200).mean().iloc[-1] if len(hist_df) >= 200 else None,
        }
        return mas
    except Exception as e:
        print(f"Error calculating moving averages: {e}")
        return {}

def calculate_pivot_points(hist_df: pd.DataFrame):
    """
    Calculates Classic, Fibonacci, and Camarilla Pivot Points.
    """
    if hist_df is None or len(hist_df) < 2:
        return {} 
        
    try:
        prev_day = hist_df.iloc[-2]
        high = prev_day['high']
        low = prev_day['low']
        close = prev_day['close']
        price_range = high - low

        # Classic
        pivot_classic = (high + low + close) / 3
        classic = {
            "pp": pivot_classic, "r1": (2 * pivot_classic) - low, "s1": (2 * pivot_classic) - high,
            "r2": pivot_classic + price_range, "s2": pivot_classic - price_range,
            "r3": high + 2 * (pivot_classic - low), "s3": low - 2 * (high - pivot_classic)
        }

        # Fibonacci
        fibonacci = {
            "pp": pivot_classic, "r1": pivot_classic + (0.382 * price_range), "s1": pivot_classic - (0.382 * price_range),
            "r2": pivot_classic + (0.618 * price_range), "s2": pivot_classic - (0.618 * price_range),
            "r3": pivot_classic + (1.000 * price_range), "s3": pivot_classic - (1.000 * price_range)
        }

        # Camarilla
        camarilla = {
            "pp": pivot_classic,
            "r1": close + (price_range * 1.1 / 12), "s1": close - (price_range * 1.1 / 12),
            "r2": close + (price_range * 1.1 / 6), "s2": close - (price_range * 1.1 / 6),
            "r3": close + (price_range * 1.1 / 4), "s3": close - (price_range * 1.1 / 4)
        }

        return { "classic": classic, "fibonacci": fibonacci, "camarilla": camarilla }
    except Exception as e:
        print(f"Error calculating pivot points: {e}")
        return {}

# --- NEW: ADVANCED INDICATOR ENGINE FOR CHART AI ---
def calculate_advanced_technicals(hist_df: pd.DataFrame):
    """
    Calculates specific indicators for the Chart Analysis tab:
    MACD, RSI, Stochastic RSI, EMA.
    """
    if hist_df is None or hist_df.empty: return {}
    
    try:
        # Calculate using pandas_ta
        # We use try-except blocks for individual indicators to prevent total failure
        
        # 1. RSI (14)
        try: hist_df.ta.rsi(length=14, append=True)
        except: pass
        
        # 2. Stochastic RSI
        try: hist_df.ta.stochrsi(length=14, rsi_length=14, k=3, d=3, append=True)
        except: pass
        
        # 3. MACD
        try: hist_df.ta.macd(fast=12, slow=26, signal=9, append=True)
        except: pass
        
        # 4. EMAs
        try:
            hist_df.ta.ema(length=20, append=True)
            hist_df.ta.ema(length=50, append=True)
            hist_df.ta.ema(length=200, append=True)
        except: pass

        latest = hist_df.iloc[-1]
        
        return {
            "rsi": latest.get('RSI_14'),
            "stoch_rsi_k": latest.get('STOCHRSIk_14_14_3_3'),
            "stoch_rsi_d": latest.get('STOCHRSId_14_14_3_3'),
            "macd": latest.get('MACD_12_26_9'),
            "macd_signal": latest.get('MACDs_12_26_9'),
            "ema_20": latest.get('EMA_20'),
            "ema_50": latest.get('EMA_50'),
            "ema_200": latest.get('EMA_200'),
            "current_price": latest.get('close')
        }
    except Exception as e:
        print(f"Error calculating advanced technicals: {e}")
        return {}

# --- NEW: ALGORITHMIC SUPPORT & RESISTANCE ---
def calculate_support_resistance_levels(hist_df: pd.DataFrame):
    """
    Identifies key Support and Resistance levels using local minima and maxima (Fractals).
    """
    if hist_df is None or len(hist_df) < 20: return {"supports": [], "resistances": []}

    try:
        # We look for "Fractals" - a high surrounded by lower highs, or low surrounded by higher lows.
        window = 3 # Smaller window for faster detection
        
        levels = []
        
        for i in range(window, len(hist_df) - window):
            # Check for Support (Local Low)
            is_support = True
            for j in range(1, window + 1):
                if hist_df['low'].iloc[i] > hist_df['low'].iloc[i-j] or hist_df['low'].iloc[i] > hist_df['low'].iloc[i+j]:
                    is_support = False
                    break
            if is_support:
                levels.append((hist_df.index[i], hist_df['low'].iloc[i], "Support"))

            # Check for Resistance (Local High)
            is_resistance = True
            for j in range(1, window + 1):
                if hist_df['high'].iloc[i] < hist_df['high'].iloc[i-j] or hist_df['high'].iloc[i] < hist_df['high'].iloc[i+j]:
                    is_resistance = False
                    break
            if is_resistance:
                levels.append((hist_df.index[i], hist_df['high'].iloc[i], "Resistance"))

        current_price = hist_df['close'].iloc[-1]
        
        # Sort by proximity to current price
        # Filter for supports below price
        supports = sorted([x[1] for x in levels if x[2] == "Support" and x[1] < current_price], key=lambda x: abs(x - current_price))[:3]
        # Filter for resistances above price
        resistances = sorted([x[1] for x in levels if x[2] == "Resistance" and x[1] > current_price], key=lambda x: abs(x - current_price))[:3]
        
        return {
            "supports": sorted(supports, reverse=True), # Highest supports first
            "resistances": sorted(resistances) # Lowest resistances first
        }

    except Exception as e:
        print(f"Error calculating S/R levels: {e}")
        return {"supports": [], "resistances": []}

# ... (Keep existing calculate_darvas_box, calculate_moving_averages, calculate_pivot_points) ...

def calculate_extended_technicals(df: pd.DataFrame):
    """
    Calculates a comprehensive suite of indicators: RSI, StochRSI, MACD, EMA, and Pivots.
    Designed for multi-timeframe analysis.
    """
    if df is None or df.empty or len(df) < 50:
        return None

    try:
        # 1. Standard Indicators (RSI, MACD)
        df.ta.rsi(length=14, append=True)
        df.ta.macd(fast=12, slow=26, signal=9, append=True)
        
        # 2. Stochastic RSI (The "StochRSI" user requested)
        df.ta.stochrsi(length=14, rsi_length=14, k=3, d=3, append=True)

        # 3. Exponential Moving Averages (EMA)
        df.ta.ema(length=9, append=True)  # Fast EMA
        df.ta.ema(length=21, append=True) # Medium EMA
        df.ta.ema(length=50, append=True) # Slow EMA
        df.ta.ema(length=200, append=True) # Trend EMA

        # Get the latest row
        latest = df.iloc[-1]
        
        # 4. Calculate Pivot Points (Support/Resistance)
        # We reuse our existing logic but apply it here locally
        prev_day = df.iloc[-2]
        pp = (prev_day['high'] + prev_day['low'] + prev_day['close']) / 3
        r1 = (2 * pp) - prev_day['low']
        s1 = (2 * pp) - prev_day['high']
        r2 = pp + (prev_day['high'] - prev_day['low'])
        s2 = pp - (prev_day['high'] - prev_day['low'])

        return {
            "price": latest['close'],
            "rsi": latest.get('RSI_14'),
            "stoch_k": latest.get('STOCHRSIk_14_14_3_3'),
            "stoch_d": latest.get('STOCHRSId_14_14_3_3'),
            "macd": latest.get('MACD_12_26_9'),
            "macd_signal": latest.get('MACDs_12_26_9'),
            "ema_9": latest.get('EMA_9'),
            "ema_21": latest.get('EMA_21'),
            "ema_50": latest.get('EMA_50'),
            "ema_200": latest.get('EMA_200'),
            "support": {"s1": s1, "s2": s2},
            "resistance": {"r1": r1, "r2": r2},
            "pivot": pp
        }
    except Exception as e:
        print(f"Error calculating extended technicals: {e}")
        return None