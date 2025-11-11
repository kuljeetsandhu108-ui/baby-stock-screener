import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure the Gemini API with your key from the .env file
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    genai.configure(api_key=GEMINI_API_KEY)
except ValueError as e:
    print(f"Error: {e}")


def get_ticker_from_query(query: str):
    """
    Uses the Gemini model to intelligently find a stock ticker symbol from a natural language query.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    prompt = f"""
    Analyze the following user query to identify the company and its official stock ticker symbol.
    
    Query: "{query}"

    Return ONLY the stock ticker symbol. For example, if the company is Apple, return "AAPL". 
    If it's Reliance Industries in India, return "RELIANCE.NS". 
    If you cannot determine a clear ticker, return "NOT_FOUND".
    """
    
    try:
        response = model.generate_content(prompt)
        ticker = response.text.strip().replace("`", "").upper()
        return ticker
    except Exception as e:
        print(f"An error occurred while calling the Gemini API: {e}")
        return "ERROR"

def generate_swot_analysis(company_name: str, description: str, news_headlines: list):
    """
    Generates a SWOT analysis for a given company using its description and recent news.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    news_string = "\n- ".join(news_headlines)
    
    prompt = f"""
    Based on the following company information and recent news headlines, generate a SWOT analysis.
    The output should be in four distinct sections: Strengths, Weaknesses, Opportunities, and Threats.
    For each section, provide at least 3-4 concise bullet points.

    Company Name: {company_name}

    Company Description: {description}

    Recent News Headlines:
    - {news_string}

    Generate the SWOT analysis now.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating SWOT analysis: {e}")
        return "Could not generate AI-powered analysis at this time."

def generate_forecast_analysis(company_name: str, analyst_ratings: list, price_target: dict, key_stats: dict, news_headlines: list):
    """
    Generates a comprehensive summary of the analyst forecast using Gemini.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    ratings_summary = "\n".join([f"- {r.get('ratingStrongBuy', 0)} Strong Buy, {r.get('ratingBuy', 0)} Buy, {r.get('ratingHold', 0)} Hold" for r in analyst_ratings[:1]])
    news_string = "\n- ".join(news_headlines)
    
    prompt = f"""
    Act as a professional financial analyst. Based on the following data for {company_name}, provide a concise, insightful summary of the analyst forecast.
    The summary should be easy for a retail investor to understand.
    Structure your response in two paragraphs:
    1.  **Analyst Sentiment:** Briefly describe the overall analyst sentiment based on the ratings breakdown and consensus.
    2.  **Price Target Analysis:** Explain the 1-year price target, including the high, average, and low estimates, and what this implies for the stock's potential.

    **DATA:**
    - **Analyst Ratings Breakdown:**
    {ratings_summary}
    - **Price Target Consensus:**
    - High: ${price_target.get('targetHigh')}
    - Average: ${price_target.get('targetConsensus')}
    - Low: ${price_target.get('targetLow')}
    - **Key Financials:**
    - P/E Ratio: {key_stats.get('peRatio')}
    - EPS: {key_stats.get('basicEPS')}
    - **Recent News Headlines:**
    - {news_string}

    Generate the two-paragraph summary now.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating forecast analysis: {e}")
        return "Could not generate AI-powered forecast analysis at this time."

def generate_investment_philosophy_assessment(company_name: str, key_metrics: dict):
    """
    Generates a qualitative assessment of a company against famous investment philosophies.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    pe_ratio = key_metrics.get('peRatioTTM')
    earnings_yield = key_metrics.get('earningsYieldTTM')
    roc = key_metrics.get('returnOnCapitalEmployedTTM')
    
    if pe_ratio is None or earnings_yield is None or roc is None:
        return "Could not generate assessment due to missing key financial metrics (P/E, ROC, Earnings Yield)."

    data_summary = f"""
    - Price to Earnings (P/E) Ratio: {pe_ratio:.2f}
    - Earnings Yield (E/P): {earnings_yield:.4f}
    - Return on Capital (ROC): {roc:.4f}
    """
    
    prompt = f"""
    Act as a financial analyst. Based on the following key metrics for {company_name}, provide a one-line qualitative assessment for each of the three investment philosophies.
    The output must be a clean, two-column Markdown table with the headers: "Formula", "Assessment".
    In your assessment, naturally incorporate the relevant metric values in parentheses.

    **Key Metrics:**
    {data_summary}

    **Your Task:**
    1.  **Magic Formula:** Based on the Earnings Yield and Return on Capital, what is the assessment? (e.g., "Good, with a high ROC of [value] but a low Earnings Yield of [value]")
    2.  **Warren Buffett:** Considering the high ROC as a proxy for a good business, what is the assessment? (e.g., "Appears solid and dependable with a ROC of [value], but P/E of [value] suggests it is not undervalued.")
    3.  **Coffee Can:** Based on the ROC, does this seem like a stable, well-run company? (e.g., "Shows signs of a quality company with a consistent ROC of [value].")

    Generate the two-column Markdown table now.
    """
    
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating investment philosophy assessment: {e}")
        return "Could not generate AI-powered assessment at this time."

def generate_canslim_assessment(company_name: str, quote: dict, quarterly_earnings: list, annual_earnings: list, institutional_holders: int):
    """
    Generates a qualitative, point-by-point CANSLIM assessment using Gemini AI.
    """
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # --- Prepare the data for the AI prompt ---
    
    # C: Current Quarterly Earnings Growth
    c_growth = "N/A"
    if len(quarterly_earnings) >= 2:
        latest_q = quarterly_earnings[0].get('eps', 0)
        previous_q_same_period = quarterly_earnings[4] if len(quarterly_earnings) > 4 else None # Year-over-year
        if previous_q_same_period and previous_q_same_period.get('eps', 0) != 0:
            previous_eps = previous_q_same_period.get('eps', 0)
            c_growth_val = ((latest_q - previous_eps) / abs(previous_eps)) * 100
            c_growth = f"{c_growth_val:.2f}% (Year-over-Year)"

    # A: Annual Earnings Growth
    a_growth = "N/A"
    if len(annual_earnings) >= 2:
        latest_y = annual_earnings[0].get('eps', 0)
        previous_y = annual_earnings[1].get('eps', 0)
        if previous_y != 0:
            a_growth_val = ((latest_y - previous_y) / abs(previous_y)) * 100
            a_growth = f"{a_growth_val:.2f}%"

    # N: New Highs
    price = quote.get('price')
    year_high = quote.get('yearHigh')
    is_new_high = "No"
    percent_from_high = 100
    if price and year_high:
        percent_from_high = ((price - year_high) / year_high) * 100
        if percent_from_high >= -15: # Within 15% of 52-week high
            is_new_high = f"Yes, trading within {abs(percent_from_high):.2f}% of its 52-week high"
        
    # S: Supply and Demand (Volume)
    volume = quote.get('volume')
    avg_volume = quote.get('avgVolume')
    is_high_demand = "No"
    if volume and avg_volume and volume > avg_volume:
        volume_increase = ((volume - avg_volume) / avg_volume) * 100
        is_high_demand = f"Yes, current volume is {volume_increase:.2f}% above average"

    # I: Institutional Sponsorship
    i_sponsorship = f"{institutional_holders} institutions hold this stock."

    # --- The AI Prompt ---
    prompt = f"""
    Act as a financial analyst applying William J. O'Neil's CANSLIM methodology to {company_name}.
    Based *only* on the data provided, generate a 7-point checklist assessing the stock.
    For each of the 7 letters in CANSLIM, provide a one-line assessment and a conclusion of "Pass", "Fail", or "Neutral".
    The output must be a clean, three-column Markdown table with the headers: "Criteria", "Assessment", "Result".

    **DATA:**
    - **C (Current Earnings):** Quarterly EPS Growth is {c_growth}. (Target: >25%)
    - **A (Annual Earnings):** Annual EPS Growth is {a_growth}. (Target: >25% for 3 years)
    - **N (New Highs):** The stock is trading near its 52-week high: {is_new_high}. (Target: Yes)
    - **S (Supply & Demand):** The stock is experiencing high demand (volume): {is_high_demand}. (Target: Yes)
    - **L (Leader/Laggard):** (You must infer this) Is {company_name} a well-known leader in its industry?
    - **I (Institutional Sponsorship):** {i_sponsorship}. (Target: Increasing number of quality institutions)
    - **M (Market Direction):** (You must infer this based on general knowledge) Is the overall stock market currently in a confirmed uptrend?

    Generate the 7-point Markdown table now.
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating CANSLIM assessment: {e}")
        return "Could not generate CANSLIM assessment at this time."