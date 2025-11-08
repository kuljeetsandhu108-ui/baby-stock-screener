import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

// --- Final Imports ---
import StockHeader from '../components/Header/StockHeader';
import Financials from '../components/Financials/Financials';
import Shareholding from '../components/Shareholding/Shareholding';
import Technicals from '../components/Technicals/Technicals';
import TradingViewChart from '../components/Chart/TradingViewChart';
import SwotAnalysis from '../components/SWOT/SwotAnalysis';
import NewsList from '../components/News/NewsList'; // <-- FINAL COMPONENT

// --- Styled Components (no changes) ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const StockDetailPageContainer = styled.div`
  padding: 2rem 3rem;
  max-width: 1800px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-in;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1200px) {
    grid-template-columns: 2fr 1fr; 
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

// --- React Component (useEffect is unchanged) ---

const StockDetailPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stockData, setStockData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axios.get(`/api/stocks/${symbol}/all`);
        setStockData(response.data);
      } catch (err) {
        setError(`Could not retrieve data for ${symbol}. Please check the symbol and try again.`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [symbol]);

  // --- Final Render Logic ---

  if (isLoading) {
    return <LoadingContainer><p>Loading Financial Universe for {symbol}...</p></LoadingContainer>;
  }

  if (error) {
    return (
      <ErrorContainer>
        <h2>An Error Occurred</h2>
        <p>{error}</p>
        <BackButton style={{marginTop: '2rem'}} onClick={() => navigate('/')}>
            Go Back to Search
        </BackButton>
      </ErrorContainer>
    );
  }

  if (!stockData) {
    return null;
  }

  return (
    <StockDetailPageContainer>
        <BackButton onClick={() => navigate('/')}>
            &larr; Back to Search
        </BackButton>
        
        <StockHeader profile={stockData.profile} quote={stockData.quote} />
        
        <MainGrid>
          <LeftColumn>
            <TradingViewChart symbol={symbol} />
            <Technicals analystRatings={stockData.analyst_ratings} />
            <Financials financialData={stockData.annual_revenue_and_profit} />
          </LeftColumn>

          <RightColumn>
            <SwotAnalysis analysisText={stockData.swot_analysis} />
            <Shareholding shareholdingData={stockData.shareholding} />
            
            {/* --- FINAL ADDITION --- */}
            {/* The NewsList component completes our page */}
            {/* The data comes from the `news` key in our API response */}
            <NewsList newsArticles={stockData.news} />
            
          </RightColumn>
        </MainGrid>

    </StockDetailPageContainer>
  );
};

export default StockDetailPage;