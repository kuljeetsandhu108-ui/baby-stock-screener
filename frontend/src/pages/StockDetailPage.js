import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

// --- COMPONENT IMPORTS ---
// Header & Navigation
import StockHeader from '../components/Header/StockHeader';
import { Tabs, TabPanel } from '../components/common/Tabs/Tabs';

// Overview Components
import CustomChart from '../components/Chart/CustomChart';
import SwotAnalysis from '../components/SWOT/SwotAnalysis';
import OverallSentiment from '../components/Sentiment/OverallSentiment';
import PriceLevels from '../components/Overview/PriceLevels';
import NewsList from '../components/News/NewsList';

// Deep Dive Components
import ChartAnalysis from '../components/StockDetailPage/ChartAnalysis';
import Fundamentals from '../components/Fundamentals/Fundamentals';
import Financials from '../components/Financials/Financials';
import Forecasts from '../components/Forecasts/Forecasts';
import PeersComparison from '../components/Peers/PeersComparison';
import Shareholding from '../components/Shareholding/Shareholding';
import Technicals from '../components/Technicals/Technicals';

import { FaArrowLeft } from 'react-icons/fa';

// --- STYLED COMPONENTS ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const StockDetailPageContainer = styled.div`
  padding: 2rem 3rem;
  max-width: 1800px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-in;
  
  /* Mobile Optimization */
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TabContentGrid = styled.div`
  display: grid;
  /* Desktop: 2/3 Chart+SWOT, 1/3 Dashboard+News */
  grid-template-columns: 2fr 1fr;
  gap: 2rem;

  /* Mobile: Stack vertically */
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 90vh;
  color: var(--color-primary);
  font-size: 1.5rem;
  font-weight: 500;
  gap: 1rem;
`;

const ErrorContainer = styled(LoadingContainer)`
  color: var(--color-danger);
  text-align: center;
`;

const BackButton = styled.button`
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  margin-bottom: 2rem;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background-color: var(--color-secondary);
    color: var(--color-text-primary);
    border-color: var(--color-primary);
  }
`;

// --- MAIN COMPONENT ---

const StockDetailPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we arrived here via the Chart Upload feature
  const chartAnalysisData = location.state?.chartAnalysis;
  const chartTechnicalData = location.state?.technicalData;
  
  // --- CORE DATA STATE ---
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- AI ANALYSIS STATES ---
  const [swotAnalysis, setSwotAnalysis] = useState('');
  const [isLoadingSwot, setIsLoadingSwot] = useState(true);
  
  const [philosophyAssessment, setPhilosophyAssessment] = useState('');
  const [canslimAssessment, setCanslimAssessment] = useState('');
  const [conclusion, setConclusion] = useState('');
  
  const [isLoadingPhilosophy, setIsLoadingPhilosophy] = useState(true);
  const [isLoadingCanslim, setIsLoadingCanslim] = useState(true);
  const [isLoadingConclusion, setIsLoadingConclusion] = useState(true);

  // --- 1. FETCH MASTER DATA ---
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      // Reset AI states when switching stocks
      setSwotAnalysis(''); 
      setPhilosophyAssessment(''); 
      setCanslimAssessment(''); 
      setConclusion('');
      
      try {
        // Call the Master Endpoint
        const response = await axios.get(`/api/stocks/${symbol}/all`);
        setStockData(response.data);
      } catch (err) {
        console.error("Failed to fetch stock data:", err);
        setError(`Could not retrieve data for ${symbol}. The ticker might be invalid or the data source is momentarily down.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [symbol]);

  // --- 2. REUSABLE SWOT FETCH (For Refresh Button) ---
  const fetchSwotAnalysis = useCallback(() => {
      if (!stockData?.profile?.companyName) { 
          setIsLoadingSwot(false); 
          return; 
      }
      setIsLoadingSwot(true);
      const payload = { 
          companyName: stockData.profile.companyName, 
          description: stockData.profile.description || "No description available."
      };
      axios.post(`/api/stocks/${symbol}/swot`, payload)
        .then(res => setSwotAnalysis(res.data.swot_analysis))
        .catch(() => setSwotAnalysis("Could not generate SWOT analysis. Please try regenerating."))
        .finally(() => setIsLoadingSwot(false));
  }, [stockData, symbol]);

  // --- 3. TRIGGER AI ANALYSES (Lazy Loading) ---
  useEffect(() => {
    if (!stockData) return;

    // A. Trigger SWOT
    fetchSwotAnalysis();

    // B. Trigger Fundamentals AI (Philosophy & CANSLIM)
    const fetchFundamentalAI = () => {
        // Philosophy Check
        if (stockData.profile && stockData.key_metrics) {
            setIsLoadingPhilosophy(true);
            const payload = { companyName: stockData.profile.companyName, keyMetrics: stockData.key_metrics };
            axios.post(`/api/stocks/${symbol}/fundamental-analysis`, payload)
                .then(res => setPhilosophyAssessment(res.data.assessment))
                .catch(() => setPhilosophyAssessment("Could not generate AI assessment."))
                .finally(() => setIsLoadingPhilosophy(false));
        } else { setIsLoadingPhilosophy(false); }

        // CANSLIM Check
        if (stockData.profile && stockData.quote && stockData.quarterly_income_statements) {
             setIsLoadingCanslim(true);
             const payload = {
                companyName: stockData.profile.companyName, 
                quote: stockData.quote, 
                quarterlyEarnings: stockData.quarterly_income_statements,
                annualEarnings: stockData.annual_revenue_and_profit || [], 
                institutionalHolders: stockData.shareholding ? stockData.shareholding.length : 0,
             };
             axios.post(`/api/stocks/${symbol}/canslim-analysis`, payload)
                .then(res => setCanslimAssessment(res.data.assessment))
                .catch(() => setCanslimAssessment("Could not generate CANSLIM assessment."))
                .finally(() => setIsLoadingCanslim(false));
        } else { setIsLoadingCanslim(false); }
    };

    // C. Trigger Conclusion (Dependent on basic data)
    const fetchConclusion = () => {
        if (!stockData.piotroski_f_score || !stockData.graham_scan || !stockData.keyStats) { 
            setIsLoadingConclusion(false); 
            return; 
        }
        setIsLoadingConclusion(true);
        const payload = {
            companyName: stockData.profile.companyName, 
            piotroskiData: stockData.piotroski_f_score,
            grahamData: stockData.graham_scan, 
            darvasData: stockData.darvas_scan,
            canslimAssessment: "Generated", // Placeholder signal
            philosophyAssessment: "Generated", // Placeholder signal
            keyStats: stockData.keyStats,
            newsHeadlines: stockData.news ? stockData.news.slice(0, 5).map(n => n.title) : []
        };
        axios.post(`/api/stocks/${symbol}/conclusion-analysis`, payload)
            .then(res => setConclusion(res.data.conclusion))
            .catch(() => setConclusion("GRADE: N/A\nTHESIS: Could not generate AI conclusion."))
            .finally(() => setIsLoadingConclusion(false));
    };

    fetchFundamentalAI();
    // Delay conclusion slightly to ensure system stability
    setTimeout(fetchConclusion, 1500);

  }, [stockData, symbol, fetchSwotAnalysis]);

  // --- RENDER LOGIC ---

  if (isLoading) {
    return (
      <LoadingContainer>
        <div className="spinner" /> 
        <p>Loading Financial Universe for {symbol}...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <h2>Connection Error</h2>
        <p>{error}</p>
        <BackButton style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>
          <FaArrowLeft /> Return to Home
        </BackButton>
      </ErrorContainer>
    );
  }

  if (!stockData) return null;

  return (
    <StockDetailPageContainer>
      <BackButton onClick={() => navigate('/')}>
        <FaArrowLeft /> Back to Search
      </BackButton>
      
      <StockHeader profile={stockData.profile} quote={stockData.quote} />
      
      <Tabs>
        
        {/* --- TAB 1: CHART AI (Conditional) --- */}
        {chartAnalysisData && (
          <TabPanel label="Chart AI">
            {/* Shows the custom chart + AI Analysis */}
            <ChartAnalysis analysisData={chartAnalysisData} technicalData={chartTechnicalData} />
          </TabPanel>
        )}

        {/* --- TAB 2: OVERVIEW (The Cockpit) --- */}
        <TabPanel label="Overview">
          <TabContentGrid>
            <LeftColumn>
              {/* High-Performance Custom Chart */}
              <CustomChart symbol={symbol} />
              
              {/* AI SWOT with Regenerate Button */}
              <SwotAnalysis
                analysisText={swotAnalysis}
                isLoading={isLoadingSwot}
                onRegenerate={fetchSwotAnalysis}
              />
            </LeftColumn>
            
            <RightColumn>
              {/* Sentiment Dashboard */}
              <OverallSentiment sentimentData={stockData.overall_sentiment} />
              
              {/* Cyber-Ladder Price Levels */}
              <PriceLevels 
                pivotPoints={stockData.pivot_points} 
                quote={stockData.quote}
                profile={stockData.profile}
              />

              {/* Latest News */}
              <NewsList newsArticles={stockData.news} />
            </RightColumn>
          </TabContentGrid>
        </TabPanel>
        
        {/* --- TAB 3: FUNDAMENTALS --- */}
        <TabPanel label="Fundamentals">
            <Fundamentals
                symbol={symbol}
                profile={stockData.profile}
                quote={stockData.quote}
                keyMetrics={stockData.key_metrics}
                piotroskiData={stockData.piotroski_f_score}
                darvasScanData={stockData.darvas_scan}
                grahamScanData={stockData.graham_scan}
                quarterlyEarnings={stockData.quarterly_income_statements}
                annualEarnings={stockData.annual_revenue_and_profit}
                shareholding={stockData.shareholding}
                delay={300}
                philosophyAssessment={philosophyAssessment}
                canslimAssessment={canslimAssessment}
                isLoadingPhilosophy={isLoadingPhilosophy}
                isLoadingCanslim={isLoadingCanslim}
                isLoadingConclusion={isLoadingConclusion}
                conclusion={conclusion}
            />
        </TabPanel>

        {/* --- TAB 4: FINANCIALS --- */}
        <TabPanel label="Financials">
          <Financials 
            profile={stockData.profile}
            keyStats={stockData.keyStats}
            financialData={stockData.annual_revenue_and_profit} 
            balanceSheetData={stockData.annual_balance_sheets}
            annualCashFlow={stockData.annual_cash_flow_statements}
            quarterlyIncome={stockData.quarterly_income_statements}
            quarterlyBalance={stockData.quarterly_balance_sheets}
            quarterlyCashFlow={stockData.quarterly_cash_flow_statements}
          />
        </TabPanel>
        
        {/* --- TAB 5: FORECASTS --- */}
        <TabPanel label="Forecasts">
            <Forecasts 
                symbol={symbol}
                quote={stockData.quote}
                analystRatings={stockData.analyst_ratings}
                priceTarget={stockData.price_target_consensus}
                keyStats={stockData.keyStats}
                news={stockData.news}
                delay={200}
                currency={stockData.profile?.currency} // Passes currency for AI
            />
        </TabPanel>

        {/* --- TAB 6: PEERS --- */}
        <TabPanel label="Peers">
            <PeersComparison symbol={symbol} />
        </TabPanel>
        
        {/* --- TAB 7: SHAREHOLDING --- */}
        <TabPanel label="Shareholding">
            <Shareholding 
                shareholdingData={stockData.shareholding}
                historicalStatements={stockData.annual_revenue_and_profit}
                shareholdingBreakdown={stockData.shareholding_breakdown}
            />
        </TabPanel>
        
        {/* --- TAB 8: TECHNICALS --- */}
        <TabPanel label="Technicals">
            <Technicals 
              analystRatings={stockData.analyst_ratings} 
              technicalIndicators={stockData.technical_indicators}
              movingAverages={stockData.moving_averages}
              pivotPoints={stockData.pivot_points}
              quote={stockData.quote} // Passes price for Signal calculation
            />
        </TabPanel>

      </Tabs>
    </StockDetailPageContainer>
  );
};

export default StockDetailPage;