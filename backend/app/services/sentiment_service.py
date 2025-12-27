def calculate_technical_sentiment(technicals: dict):
    """
    Helper function to calculate technical score (0-100) and label
    based on RSI and MACD. 
    Refactored to be used by both the main sentiment engine and the specific timeframe endpoint.
    """
    if not technicals:
        return {"score": 50, "label": "Neutral"}

    rsi = technicals.get('rsi')
    macd = technicals.get('macd')
    macd_signal = technicals.get('macdsignal')
    
    # --- RSI Score (Momentum) ---
    # Standard Interpretation:
    # > 70: Strong Bullish Momentum (until overbought divergence)
    # 50-70: Bullish Zone
    # 30-50: Bearish Zone
    # < 30: Oversold (Potential Bounce, but currently weak)
    rsi_score = 50
    if rsi is not None:
        if rsi > 70: rsi_score = 85
        elif rsi > 60: rsi_score = 75
        elif rsi > 50: rsi_score = 60
        elif rsi < 30: rsi_score = 35
        elif rsi < 40: rsi_score = 40
        else: rsi_score = 45 # 40-50 range
        
    # --- MACD Score (Trend) ---
    # Bullish Crossover (MACD > Signal) vs Bearish Crossover
    macd_score = 50
    if macd is not None and macd_signal is not None:
        if macd > macd_signal: 
            macd_score = 80 # Bullish Trend
        else: 
            macd_score = 20 # Bearish Trend
        
    # Combine (Equal Weight)
    t_score = (rsi_score + macd_score) / 2
    
    # Determine Label
    label = "Neutral"
    if t_score >= 60: label = "Bullish"
    elif t_score <= 40: label = "Bearish"
    
    return {"score": t_score, "label": label}


def calculate_overall_sentiment(piotroski_score: int, key_metrics: dict, technicals: dict, analyst_ratings: list):
    """
    Calculates a detailed breakdown of 4 sentiment pillars:
    1. Fundamental (Piotroski F-Score)
    2. Financial (Valuation P/E & Efficiency ROE)
    3. Technical (Momentum & Trend)
    4. Analyst (Wall St. Consensus)
    
    Returns a unified score (0-100) and a breakdown for the Dashboard.
    """
    scores = {}
    breakdown = {}

    # --- 1. FUNDAMENTAL HEALTH (Weight: 25%) ---
    # Based on Piotroski F-Score (0-9)
    f_score = 50 # Default neutral
    if piotroski_score is not None:
        # Map 0-9 scale to 0-100
        # 9 -> 100, 0 -> 0
        f_score = (piotroski_score / 9) * 100
    
    scores['fundamental'] = f_score
    breakdown['fundamental'] = {
        "score": f_score,
        "label": "Strong" if f_score > 70 else "Weak" if f_score < 40 else "Stable"
    }

    # --- 2. FINANCIAL PERFORMANCE (Weight: 25%) ---
    # Based on Valuation (P/E) and Efficiency (ROE)
    fin_score = 50
    pe = key_metrics.get('peRatioTTM')
    roe = key_metrics.get('returnOnCapitalEmployedTTM') # Using ROCE/ROE as proxy for efficiency

    # Valuation Score (Lower P/E is usually better, assuming growth exists)
    val_score = 50
    if pe is not None and pe > 0:
        if pe < 15: val_score = 100  # Undervalued
        elif pe < 25: val_score = 75 # Fair
        elif pe < 40: val_score = 40 # Expensive
        else: val_score = 20         # Very Expensive
    elif pe is not None and pe <= 0:
        val_score = 10 # Negative earnings
    
    # Efficiency Score (Higher ROE is better)
    eff_score = 50
    if roe is not None:
        if roe > 0.20: eff_score = 100 # Excellent
        elif roe > 0.12: eff_score = 75 # Good
        elif roe > 0.05: eff_score = 50 # Average
        else: eff_score = 25 # Poor

    # Weighted: Valuation (60%) + Efficiency (40%)
    fin_score = (val_score * 0.6) + (eff_score * 0.4)
    
    scores['financial'] = fin_score
    breakdown['financial'] = {
        "score": fin_score,
        "label": "Undervalued" if val_score > 70 else "Overvalued" if val_score < 40 else "Fair Value"
    }

    # --- 3. ANALYST CONSENSUS (Weight: 25%) ---
    a_score = 50
    if analyst_ratings and len(analyst_ratings) > 0:
        latest = analyst_ratings[0]
        
        # Calculate total analysts covering
        total_votes = (
            latest.get('ratingStrongBuy', 0) + 
            latest.get('ratingBuy', 0) + 
            latest.get('ratingHold', 0) + 
            latest.get('ratingSell', 0) + 
            latest.get('ratingStrongSell', 0)
        )
        
        if total_votes > 0:
            # Weighted Sum: Strong Buy=100 ... Strong Sell=0
            weighted_sum = (
                (latest.get('ratingStrongBuy', 0) * 100) + 
                (latest.get('ratingBuy', 0) * 75) + 
                (latest.get('ratingHold', 0) * 50) + 
                (latest.get('ratingSell', 0) * 25) + 
                (latest.get('ratingStrongSell', 0) * 0)
            )
            a_score = weighted_sum / total_votes
            
    scores['analyst'] = a_score
    breakdown['analyst'] = {
        "score": a_score,
        "label": "Buy" if a_score > 60 else "Sell" if a_score < 40 else "Hold"
    }

    # --- 4. TECHNICAL MOMENTUM (Weight: 25%) ---
    # Uses the helper function we defined above
    tech_data = calculate_technical_sentiment(technicals)
    scores['technical'] = tech_data['score']
    breakdown['technical'] = tech_data

    # --- FINAL CALCULATION ---
    # Average of the 4 pillars
    total_score = (scores['fundamental'] + scores['financial'] + scores['analyst'] + scores['technical']) / 4

    # Determine Verdict
    verdict = "Neutral"
    if total_score >= 75: verdict = "Strong Buy"
    elif total_score >= 60: verdict = "Buy"
    elif total_score <= 25: verdict = "Strong Sell"
    elif total_score <= 40: verdict = "Sell"

    return {
        "score": total_score, 
        "verdict": verdict,
        "breakdown": breakdown
    }