import pandas as pd

def get_currency_symbol(currency_code: str):
    """
    Converts a currency code (e.g., 'INR') into its corresponding symbol (e.g., '₹').
    This is a centralized helper function to ensure consistency.
    """
    symbols = {
        "INR": "₹",
        "USD": "$",
        "JPY": "¥",
        "EUR": "€",
        "GBP": "£",
    }
    # If the currency code is not in our map, we default to a dollar sign.
    return symbols.get(currency_code, "$")

def calculate_darvas_box(hist_df: pd.DataFrame, quote: dict, currency_code: str):
    """
    Analyzes historical price data to identify a Darvas Box pattern.
    This function is now "currency-aware" and will use the correct symbol in its messages.
    """
    # We need at least 30 days of data and the latest quote to perform the scan.
    if hist_df is None or len(hist_df) < 30 or not quote:
        return {"status": "Insufficient Data", "message": "Not enough historical data to perform scan."}

    try:
        current_price = quote.get('price')
        year_high = quote.get('yearHigh')
        avg_volume = quote.get('avgVolume')
        current_volume = quote.get('volume')

        # If any of the core data points are missing, we cannot proceed.
        if not all([current_price, year_high, avg_volume, current_volume]):
             return {"status": "Insufficient Data", "message": "Missing key price or volume data."}
        
        # Get the correct currency symbol for formatting our messages.
        currency_symbol = get_currency_symbol(currency_code)

        # Core Darvas Criteria: Stock must be trading near its 52-Week High.
        if current_price < (year_high * 0.90):
            return {
                "status": "Not a Candidate",
                "message": f"Stock price ({currency_symbol}{current_price:.2f}) is not within 10% of its 52-week high ({currency_symbol}{year_high:.2f})."
            }

        # Identify the "Box" by looking at the price range of the last 15 trading days.
        recent_period = hist_df.tail(15)
        box_top = recent_period['high'].max()
        box_bottom = recent_period['low'].min()

        # A valid Darvas box should be a narrow consolidation (e.g., less than 8% range).
        if box_top > box_bottom * 1.08:
            return {
                "status": "No Box Formed",
                "message": "Stock is too volatile and has not formed a narrow consolidation box recently."
            }

        # Determine the status based on where the current price is relative to the box.
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
    Calculates a standard set of Simple Moving Averages (SMA) from historical price data.
    """
    if hist_df is None or hist_df.empty or len(hist_df) < 200:
        return {} # Not enough data for a full calculation
    
    try:
        return {
            "5": hist_df['close'].rolling(window=5).mean().iloc[-1],
            "10": hist_df['close'].rolling(window=10).mean().iloc[-1],
            "20": hist_df['close'].rolling(window=20).mean().iloc[-1],
            "50": hist_df['close'].rolling(window=50).mean().iloc[-1],
            "100": hist_df['close'].rolling(window=100).mean().iloc[-1],
            "200": hist_df['close'].rolling(window=200).mean().iloc[-1],
        }
    except Exception as e:
        print(f"Error calculating moving averages: {e}")
        return {}

def calculate_pivot_points(hist_df: pd.DataFrame):
    """
    Calculates Classic, Fibonacci, and Camarilla Pivot Points based on the
    previous trading day's High, Low, and Close prices.
    """
    if hist_df is None or len(hist_df) < 2:
        return {} # We need at least 2 days of data
        
    try:
        prev_day = hist_df.iloc[-2]
        high, low, close = prev_day['high'], prev_day['low'], prev_day['close']
        price_range = high - low

        # Classic Calculations
        pivot_classic = (high + low + close) / 3
        classic = {
            "pp": pivot_classic, "r1": (2 * pivot_classic) - low, "s1": (2 * pivot_classic) - high,
            "r2": pivot_classic + price_range, "s2": pivot_classic - price_range,
            "r3": high + 2 * (pivot_classic - low), "s3": low - 2 * (high - pivot_classic)
        }

        # Fibonacci Calculations
        fibonacci = {
            "pp": pivot_classic, "r1": pivot_classic + (0.382 * price_range), "s1": pivot_classic - (0.382 * price_range),
            "r2": pivot_classic + (0.618 * price_range), "s2": pivot_classic - (0.618 * price_range),
            "r3": pivot_classic + (1.000 * price_range), "s3": pivot_classic - (1.000 * price_range)
        }

        # Camarilla Calculations
        camarilla = {
            "pp": pivot_classic,
            "r1": close + (price_range * 1.1 / 12), "s1": close - (price_range * 1.1 / 12),
            "r2": close + (price_range * 1.1 / 6), "s2": close - (price_range * 1.1 / 6),
            "r3": close + (price_range * 1.1 / 4), "s3": close - (price_range * 1.1 / 4)
        }

        return {
            "classic": classic,
            "fibonacci": fibonacci,
            "camarilla": camarilla
        }
    except Exception as e:
        print(f"Error calculating pivot points: {e}")
        return {}