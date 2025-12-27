import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// --- Styled Components & Animations ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const BannerContainer = styled.div`
  width: 100%;
  padding: 1.5rem 0;
  margin-bottom: 3rem;
  overflow: hidden;
`;

const CardScroller = styled.div`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;

  /* Hide scrollbar */
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const IndexCard = styled.div`
  flex-shrink: 0;
  width: 220px;
  padding: 1rem;
  background-color: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: ${fadeIn} 0.5s ease-out;
  position: relative;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
    border-color: var(--color-primary);
  }
`;

const IndexHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const IndexName = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  margin: 0;
`;

const CurrencyBadge = styled.span`
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-weight: 600;
`;

const IndexPrice = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
  font-family: 'Roboto Mono', monospace; /* Monospace for numbers looks pro */
`;

const IndexChange = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  color: ${({ isPositive }) => (isPositive ? 'var(--color-success)' : 'var(--color-danger)')};
`;

// --- HELPER: Get Symbol ---
const getCurrencySymbol = (code) => {
    switch (code) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'JPY': return '¥';
        case 'EUR': return '€';
        case 'GBP': return '£';
        default: return '$';
    }
};

// --- The React Component ---

const IndicesBanner = () => {
  const [indices, setIndices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('/api/indices/summary');
        setIndices(response.data);
      } catch (error) {
        console.error("Failed to fetch indices summary:", error);
      } finally {
        if (isLoading) setIsLoading(false);
      }
    };

    fetchData(); 
    const intervalId = setInterval(fetchData, 10000); // Live Tick every 10s
    return () => clearInterval(intervalId);
  }, [isLoading]);

  const handleCardClick = (symbol) => {
    const encodedSymbol = encodeURIComponent(symbol);
    navigate(`/index/${encodedSymbol}`);
  };

  if (isLoading) {
    return <BannerContainer><p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading Global Markets...</p></BannerContainer>;
  }

  if (!indices || indices.length === 0) {
    return null; 
  }

  return (
    <BannerContainer>
      <CardScroller>
        {indices.map(index => {
          const isPositive = index.change >= 0;
          const symbol = getCurrencySymbol(index.currency);
          
          return (
            <IndexCard key={index.symbol} onClick={() => handleCardClick(index.symbol)}>
              <IndexHeader>
                <IndexName>{index.name}</IndexName>
                <CurrencyBadge>{index.currency}</CurrencyBadge>
              </IndexHeader>
              
              <IndexPrice>
                {symbol}{index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </IndexPrice>
              
              <IndexChange isPositive={isPositive}>
                {isPositive ? '▲' : '▼'} 
                {Math.abs(index.change).toFixed(2)} ({index.percent_change.toFixed(2)}%)
              </IndexChange>
            </IndexCard>
          );
        })}
      </CardScroller>
    </BannerContainer>
  );
};

export default IndicesBanner;