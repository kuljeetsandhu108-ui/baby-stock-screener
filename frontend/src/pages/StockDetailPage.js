import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

// --- Imports for all our high-end components ---
import StockHeader from '../components/Header/StockHeader';
import Financials from '../components/Financials/Financials';
import Shareholding from '../components/Shareholding/Shareholding';
import Technicals from '../components/Technicals/Technicals';
import TradingViewChart from '../components/Chart/TradingViewChart';
import SwotAnalysis from '../components/SWOT/SwotAnalysis';
import NewsList from '../components/News/NewsList';
import { Tabs, TabPanel } from '../components/common/Tabs/Tabs';
import Forecasts from '../components/Forecasts/Forecasts';
import Fundamentals from '../components/Fundamentals/Fundamentals';
import OverallSentiment from '../components/Sentiment/OverallSentiment';
import PeersComparison from '../components/Peers/PeersComparison';

// --- Styled Components for the page layout ---

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const StockDetailPageContainer = styled.div`
  padding: 2rem 3rem;
  max-width: 1800px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-in;
`;

const TabContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;

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
`;

const ErrorContainer = styled(LoadingContainer)`
  color: var(--color-danger);
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

  &:hover {
    background-color: var(--color-secondary);
    color: var(--color-text-primary);
  }
`;

// --- The Final, Architecturally Correct Page Component ---

const StockDetailPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [swotAnalysis, setSwotAnalysis] = useState('');
  const [isLoadingSwot, setIsLoadingSwot] = useState(true);
  const [philosophyAssessment, setPhilosophyAssessment] = useState('');
  const [canslimAssessment, setCanslimAssessment] = useState('');
  const [isLoadingPhilosophy, setIsLoadingPhilosophy] = useState(true);
  const [isLoadingCanslim, setIsLoadingCanslim] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      setSwotAnalysis('');
      setPhilosophyAssessment('');
      setCanslimAssessment('');
      try {
        const response = await axios.get(`/api/stocks/${symbol}/all`);
        setStockData(response.data);
      } catch (err) {
        console.error("Failed to fetch stock data:", err);
        setError(`Could not retrieve data for ${symbol}. Please check the symbol and try again.`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [symbol]);

  useEffect(() => {
    if (!stockData) return;

    const fetchSwotAnalysis = async () => {
      if (!stockData.profile?.description) { setIsLoadingSwot(false); return; }
      setIsLoadingSwot(true);
      try {
        const payload = { companyName: stockData.profile.companyName, description: stockData.profile.description };
        const response = await axios.post(`/api/stocks/${symbol}/swot`, payload);
        setSwotAnalysis(response.data.swot_analysis);
      } catch (error) { setSwotAnalysis("Could not generate SWOT analysis."); } finally { setIsLoadingSwot(false); }
    };

    const fetchPhilosophyAssessment = async () => {
      if (!stockData.profile || !stockData.key_metrics) { setIsLoadingPhilosophy(false); return; }
      setIsLoadingPhilosophy(true);
      try {
        const payload = { companyName: stockData.profile.companyName, keyMetrics: stockData.key_metrics };
        const response = await axios.post(`/api/stocks/${symbol}/fundamental-analysis`, payload);
        setPhilosophyAssessment(response.data.assessment);
      } catch (error) { setPhilosophyAssessment("Could not generate AI assessment."); } finally { setIsLoadingPhilosophy(false); }
    };
    
    const fetchCanslimAssessment = async () => {
      if (!stockData.profile || !stockData.quote || !stockData.quarterly_income_statements) { setIsLoadingCanslim(false); return; }
      setIsLoadingCanslim(true);
      try {
        const payload = {
          companyName: stockData.profile.companyName, quote: stockData.quote, quarterlyEarnings: stockData.quarterly_income_statements,
          annualEarnings: stockData.annual_revenue_and_profit, institutionalHolders: stockData.shareholding.length,
        };
        const response = await axios.post(`/api/stocks/${symbol}/canslim-analysis`, payload);
        setCanslimAssessment(response.data.assessment);
      } catch (error) { setCanslimAssessment("Could not generate CANSLIM assessment."); } finally { setIsLoadingCanslim(false); }
    };

    const swotTimer = setTimeout(fetchSwotAnalysis, 100);
    const philosophyTimer = setTimeout(fetchPhilosophyAssessment, 300);
    const canslimTimer = setTimeout(fetchCanslimAssessment, 500);

    return () => {
      clearTimeout(swotTimer);
      clearTimeout(philosophyTimer);
      clearTimeout(canslimTimer);
    };
  }, [stockData, symbol]);

  if (isLoading) {
    return (
      <LoadingContainer>
        <p>Loading Financial Universe for {symbol}...</p>
      </LoadingContainer>
    );
  }

  if (error) {
    return (
      <ErrorContainer>
        <h2>An Error Occurred</h2>
        <p>{error}</p>
        <BackButton style={{ marginTop: '2rem' }} onClick={() => navigate('/')}>
          Go Back to Search
        </BackButton>
      </ErrorContainer>
    );
  }

  if (!stockData) {
    return null;
  }

  const tradingViewSymbol = stockData.profile?.tradingview_symbol || symbol;

  return (
    <StockDetailPageContainer>
      <BackButton onClick={() => navigate('/')}>&larr; Back to Search</BackButton>
      
      <StockHeader profile={stockData.profile} quote={stockData.quote} />
      
      <Tabs>
        <TabPanel label="Overview">
          <TabContentGrid>
            <LeftColumn>
              <TradingViewChart symbol={tradingViewSymbol} />
              <SwotAnalysis
                analysisText={swotAnalysis}
                isLoading={isLoadingSwot}
              />
            </LeftColumn>
            <RightColumn>
              <OverallSentiment sentimentData={stockData.overall_sentiment} />
              <NewsList newsArticles={stockData.news} />
            </RightColumn>
          </TabContentGrid>
        </TabPanel>
        
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
            />
        </TabPanel>

        <TabPanel label="Financials">
          <Financials 
            profile={stockData.profile}
            keyStats={stockData.keyStats}
            financialData={stockData.annual_revenue_and_profit} 
            balanceSheetData={stockData.annual_balance_sheets}
          />
        </TabPanel>
        
        <TabPanel label="Forecasts">
            <Forecasts 
                symbol={symbol}
                quote={stockData.quote}
                analystRatings={stockData.analyst_ratings}
                priceTarget={stockData.price_target_consensus}
                keyStats={stockData.keyStats}
                news={stockData.news}
                delay={200}
            />
        </TabPanel>

        <TabPanel label="Peers">
            <PeersComparison symbol={symbol} />
        </TabPanel>
        
        <TabPanel label="Shareholding">
            <Shareholding 
                shareholdingData={stockData.shareholding}
                historicalStatements={stockData.annual_revenue_and_profit}
            />
        </TabPanel>
        
        <TabPanel label="Technicals">
            <Technicals 
              analystRatings={stockData.analyst_ratings} 
              technicalIndicators={stockData.technical_indicators} 
            />
        </TabPanel>
      </Tabs>
    </StockDetailPageContainer>
  );
};

export default StockDetailPage;