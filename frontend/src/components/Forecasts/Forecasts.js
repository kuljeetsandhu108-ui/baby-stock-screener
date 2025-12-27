import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import axios from 'axios';
import Card from '../common/Card';
import PriceTarget from './PriceTarget';
import AnalystRating from './AnalystRating';
import { FaRedo, FaRobot } from 'react-icons/fa';

// --- Styled Components ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const ForecastGrid = styled.div`
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 3rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const LeftColumn = styled.div``;
const RightColumn = styled.div``;

const AiAnalysisContainer = styled.div`
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
  animation: ${fadeIn} 0.5s ease-in;
`;

const AnalysisHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
`;

const RegenerateButton = styled.button`
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-primary);
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    ${({ isLoading }) => isLoading && css`
      animation: ${spin} 1s linear infinite;
    `}
  }
`;

const AiSummaryText = styled.div`
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.8;
  white-space: pre-wrap; 
  background: rgba(255, 255, 255, 0.02);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
`;

const Loader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 150px;
  color: var(--color-primary);
  gap: 10px;
  font-weight: 500;
`;

// --- Main Component ---

const Forecasts = ({ symbol, quote, analystRatings, priceTarget, keyStats, news, currency, delay }) => {
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // --- REUSABLE FETCH FUNCTION ---
  const fetchAiAnalysis = useCallback(async () => {
    // Guard clause: Ensure data exists before asking AI
    if (!symbol || !analystRatings || !priceTarget || !keyStats || !news || !quote) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    
    try {
      const payload = {
        companyName: quote.name || symbol,
        analystRatings: analystRatings,
        priceTarget: priceTarget,
        keyStats: keyStats,
        newsHeadlines: news.map(n => n.title).slice(0, 10),
        currency: currency || 'USD' // Ensure currency is passed
      };

      const response = await axios.post(`/api/stocks/${symbol}/forecast-analysis`, payload);
      
      if (response.data.analysis && !response.data.analysis.includes("Could not generate")) {
          setAiAnalysis(response.data.analysis);
      } else {
          setAiAnalysis("Analysis temporarily unavailable. Please try regenerating.");
          setHasError(true);
      }

    } catch (error) {
      console.error("Failed to fetch AI forecast analysis:", error);
      setAiAnalysis("Connection error. Could not retrieve AI analysis.");
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, quote, analystRatings, priceTarget, keyStats, news, currency]);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const timer = setTimeout(() => {
        fetchAiAnalysis();
    }, delay || 0);

    return () => clearTimeout(timer);
  }, [fetchAiAnalysis, delay]);


  // --- RENDER CHECK ---
  if (!priceTarget || !analystRatings || Object.keys(priceTarget).length === 0) {
    return (
      <Card>
        <p style={{color: 'var(--color-text-secondary)'}}>Forecast data is not available for this stock.</p>
      </Card>
    );
  }

  return (
    <Card>
      <ForecastGrid>
        <LeftColumn>
          <PriceTarget consensus={priceTarget} quote={quote} currency={currency} />
        </LeftColumn>
        <RightColumn>
          <AnalystRating ratingsData={analystRatings} />
        </RightColumn>
      </ForecastGrid>

      <AiAnalysisContainer>
        <AnalysisHeader>
            <SectionTitle><FaRobot /> AI-Powered Analysis</SectionTitle>
            <RegenerateButton onClick={fetchAiAnalysis} disabled={isLoading} isLoading={isLoading}>
                <FaRedo /> {isLoading ? 'Analyzing...' : 'Regenerate'}
            </RegenerateButton>
        </AnalysisHeader>

        {isLoading ? (
          <Loader>
             <FaRedo className="fa-spin" /> Generating financial forecast...
          </Loader>
        ) : (
          <AiSummaryText style={{ borderColor: hasError ? 'var(--color-danger)' : 'var(--color-border)' }}>
              {aiAnalysis}
          </AiSummaryText>
        )}
      </AiAnalysisContainer>
    </Card>
  );
};

export default Forecasts;