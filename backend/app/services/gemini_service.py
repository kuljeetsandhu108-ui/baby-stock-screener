import os
import google.generativeai as genai
from dotenv import load_dotenv
import itertools

load_dotenv()

# --- THE API KEY ROTATOR ---
try:
    GEMINI_API_KEYS_STR = os.getenv("GEMINI_API_KEYS")
    if not GEMINI_API_KEYS_STR:
        raise ValueError("GEMINI_API_KEYS not found in .env file. Please add it as a comma-separated list.")
    
    GEMINI_API_KEYS = [key.strip() for key in GEMINI_API_KEYS_STR.split(',')]
    
    key_cycler = itertools.cycle(GEMINI_API_KEYS)
    print(f"Successfully loaded and initialized rotator for {len(GEMINI_API_KEYS)} Gemini API keys.")

except (ValueError, AttributeError) as e:
    print(f"CRITICAL ERROR: Could not load Gemini API keys. AI features will fail. Error: {e}")
    GEMINI_API_KEYS = []
    key_cycler = None

def configure_gemini_for_request():
    """Configures the genai library with the next available key from the pool."""
    if not key_cycler:
        raise ValueError("No Gemini API keys are configured or available.")
    
    api_key = next(key_cycler)
    genai.configure(api_key=api_key)


# --- All functions are wrapped to use the rotator ---

def get_ticker_from_query(query: str):
    """Uses the Gemini model with a rotated API key to find a stock ticker."""
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = f"""Analyze the following user query: "{query}". Return ONLY the official stock ticker symbol (e.g., "AAPL" for Apple, "RELIANCE.NS" for Reliance Industries). If a clear ticker cannot be found, return the text "NOT_FOUND"."""
        response = model.generate_content(prompt)
        return response.text.strip().replace("`", "").upper()
    except Exception as e:
        print(f"An error occurred in get_ticker_from_query: {e}")
        return "ERROR"

def generate_swot_analysis(company_name: str, description: str, news_headlines: list):
    """Generates a SWOT analysis with a rotated API key."""
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')
        news_string = "\n- ".join(news_headlines)
        prompt = f"""Generate a 4-section SWOT analysis for {company_name}. Use the following data for context. Structure the output with clear headers for Strengths, Weaknesses, Opportunities, and Threats, each followed by bullet points.\n\n**Company Description:**\n{description}\n\n**Recent News Headlines:**\n- {news_string}"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred in generate_swot_analysis: {e}")
        return "Could not generate SWOT analysis."

def generate_forecast_analysis(company_name: str, analyst_ratings: list, price_target: dict, key_stats: dict, news_headlines: list):
    """Generates a forecast analysis with a rotated API key."""
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')
        ratings_summary = "\n".join([f"- {r.get('ratingStrongBuy', 0)} Strong Buy, {r.get('ratingBuy', 0)} Buy, {r.get('ratingHold', 0)} Hold, {r.get('ratingSell', 0)} Sell, {r.get('ratingStrongSell', 0)} Strong Sell" for r in analyst_ratings[:1]])
        news_string = "\n- ".join(news_headlines)
        prompt = f"""Act as a professional financial analyst. For {company_name}, write a two-paragraph summary of the analyst forecast based on the following data:\n- **Analyst Ratings:** {ratings_summary}\n- **Price Target:** High ${price_target.get('targetHigh')}, Average ${price_target.get('targetConsensus')}, Low ${price_target.get('targetLow')}\n- **Recent News:**\n- {news_string}"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred in generate_forecast_analysis: {e}")
        return "Could not generate AI forecast analysis."

def generate_investment_philosophy_assessment(company_name: str, key_metrics: dict):
    """
    Generates a qualitative assessment, now robustly handling potentially missing data.
    """
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # --- NEW RESILIENT DATA PREPARATION ---
        # We now fetch each metric, providing 'N/A' as a default if it's missing.
        pe_ratio = key_metrics.get('peRatioTTM', 'N/A')
        earnings_yield = key_metrics.get('earningsYieldTTM', 'N/A')
        roc = key_metrics.get('returnOnCapitalEmployedTTM', 'N/A')

        # Format the data, handling cases where it might not be a number
        data_summary = f"""
        - Price to Earnings (P/E) Ratio: {pe_ratio if isinstance(pe_ratio, str) else f'{pe_ratio:.2f}'}
        - Earnings Yield (E/P): {earnings_yield if isinstance(earnings_yield, str) else f'{earnings_yield:.4f}'}
        - Return on Capital (ROC): {roc if isinstance(roc, str) else f'{roc:.4f}'}
        """
        
        # --- NEW, MORE ROBUST PROMPT ---
        prompt = f"""
        Act as a financial analyst. Based on the following key metrics for {company_name}, provide a one-line qualitative assessment for each of the three investment philosophies.
        The output must be a clean, two-column Markdown table with the headers: "Formula", "Assessment".
        In your assessment, naturally incorporate the relevant metric values. If a metric is 'N/A', explicitly state that the data is missing for that part of the analysis.

        **Key Metrics:**
        {data_summary}

        **Your Task:**
        1.  **Magic Formula:** Based on the Earnings Yield and Return on Capital.
        2.  **Warren Buffett:** Considering ROC and P/E.
        3.  **Coffee Can:** Based on the ROC.

        Generate the two-column Markdown table now.
        """
        
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating investment philosophy assessment: {e}")
        return "Could not generate AI-powered assessment at this time."

def generate_canslim_assessment(company_name: str, quote: dict, quarterly_earnings: list, annual_earnings: list, institutional_holders: int):
    """Generates a CANSLIM assessment with a rotated API key."""
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        c_growth, a_growth, is_new_high, is_high_demand = "N/A", "N/A", "No", "No"
        if len(quarterly_earnings) > 4:
            latest_q_eps, previous_q_eps = quarterly_earnings[0].get('eps', 0), quarterly_earnings[4].get('eps', 0)
            if previous_q_eps not in [0, None]: c_growth = f"{((latest_q_eps - previous_q_eps) / abs(previous_q_eps)) * 100:.2f}% (YoY)"
        if len(annual_earnings) >= 2:
            latest_y_eps, previous_y_eps = annual_earnings[0].get('eps', 0), annual_earnings[1].get('eps', 0)
            if previous_y_eps not in [0, None]: a_growth = f"{((latest_y_eps - previous_y_eps) / abs(previous_y_eps)) * 100:.2f}%"
        price, year_high = quote.get('price'), quote.get('yearHigh')
        if price and year_high:
            percent_from_high = ((price - year_high) / year_high) * 100
            if percent_from_high >= -15: is_new_high = f"Yes, within {abs(percent_from_high):.2f}% of 52-week high"
        volume, avg_volume = quote.get('volume'), quote.get('avgVolume')
        if volume and avg_volume and volume > avg_volume:
            is_high_demand = f"Yes, volume is {((volume - avg_volume) / avg_volume) * 100:.2f}% above average"
        i_sponsorship = f"{institutional_holders} institutions hold this stock."

        prompt = f"""Act as an analyst applying CANSLIM to {company_name}. Based on the data, create a 7-point checklist. Output a 3-column Markdown table: "Criteria", "Assessment", "Result" (Pass/Fail/Neutral). DATA: C={c_growth}, A={a_growth}, N={is_new_high}, S={is_high_demand}, L=Infer leadership, I={i_sponsorship}, M=Infer market direction."""
        
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred in generate_canslim_assessment: {e}")
        return "Could not generate CANSLIM assessment."

def find_peer_tickers_by_industry(company_name: str, sector: str, industry: str, country: str):
    """
    Uses Gemini AI to find a list of top 5 competitor tickers based on industry and country.
    """
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')

        prompt = f"""
        Act as an expert financial data analyst.
        The company is {company_name}, in the "{industry}" industry within the "{sector}" sector in {country}.
        Identify the top 5 publicly traded competitors in the same industry and country.
        Return a single, comma-separated list of their stock ticker symbols ONLY.
        - US: AAPL, MSFT
        - India: RELIANCE.NS, TCS.NS
        - Do not include the original company or any explanation.
        Generate the list now.
        """
        response = model.generate_content(prompt)
        
        peers_str = response.text.strip().replace(" ", "").upper()
        return peers_str.split(',')

    except Exception as e:
        print(f"An error occurred while finding peer tickers with AI: {e}")
        return []

def generate_fundamental_conclusion(
    company_name: str,
    piotroski_data: dict,
    graham_data: dict,
    darvas_data: dict,
    canslim_assessment: str,
    philosophy_assessment: str
):
    """
    Performs a meta-analysis of all other fundamental scans to generate a final conclusion.
    """
    try:
        configure_gemini_for_request()
        model = genai.GenerativeModel('gemini-2.5-flash')

        # We format all the input data from our different scanners into a clean summary for the AI.
        data_summary = f"""
        - Piotroski F-Score: {piotroski_data.get('score', 'N/A')} out of 9.
        - Benjamin Graham Scan: Passed {graham_data.get('score', 'N/A')} out of 7 tenets.
        - Darvas Box Status: {darvas_data.get('status', 'N/A')}.
        - CANSLIM Assessment Results:
        {canslim_assessment}
        - Value Investing (Buffett, etc.) Assessment Results:
        {philosophy_assessment}
        """

        # This is our ultimate, high-end prompt that instructs the AI to act as a senior analyst.
        prompt = f"""
        Act as a senior portfolio manager providing a final "bottom line" conclusion on {company_name} for a client.
        You have been provided with the results of several quantitative and qualitative screening models.
        Your task is to synthesize these results into a clear, actionable summary.

        **Provided Data:**
        {data_summary}

        **Your Output MUST follow this format exactly:**

        GRADE: [Provide a single letter grade from A+ to F based on the overall strength of the data]
        THESIS: [Provide a single, powerful sentence summarizing the core investment thesis. e.g., "A financially strong, high-growth company that appears to be trading at a fair price."]
        TAKEAWAYS:
        - [Provide the first key positive or negative takeaway as a bullet point.]
        - [Provide the second key positive or negative takeaway as a bullet point.]
        - [Provide a third, conclusive takeaway that summarizes the overall picture.]
        """

        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"An error occurred while generating fundamental conclusion: {e}")
        # Provide a structured error message that our frontend can still parse gracefully.
        return "GRADE: N/A\nTHESIS: The AI analysis could not be completed at this time.\nTAKEAWAYS:\n- An error occurred while communicating with the AI engine."