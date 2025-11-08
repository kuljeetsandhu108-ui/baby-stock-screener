import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

// --- Styled Components ---

// A subtle animation for the title
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const HomePageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 4.5rem;
  font-weight: 800;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
  animation: ${fadeIn} 1s ease-out;
  letter-spacing: -2px;
`;

const Subtitle = styled.p`
  font-size: 1.25rem;
  color: var(--color-text-secondary);
  margin-bottom: 3rem;
  max-width: 600px;
  animation: ${fadeIn} 1.5s ease-out;
`;

const SearchInput = styled.input`
  width: 100%;
  max-width: 650px;
  padding: 20px 30px;
  font-size: 1.2rem;
  color: var(--color-text-primary);
  background-color: var(--color-secondary);
  border: 1px solid var(--color-border);
  border-radius: 50px;
  outline: none;
  transition: all 0.3s ease;

  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 15px rgba(88, 166, 255, 0.3);
  }

  &::placeholder {
    color: var(--color-text-secondary);
  }
`;

const LoadingText = styled.p`
  color: var(--color-primary);
  margin-top: 1rem;
  height: 20px; /* Reserve space to prevent layout shift */
`;

// --- React Component ---

const HomePage = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = async (event) => {
    // Only trigger search on "Enter" key press
    if (event.key === 'Enter' && query.trim() !== '') {
      setIsLoading(true);
      setError('');
      try {
        // Call our backend's AI-powered search endpoint
        const response = await axios.get(`/api/stocks/search?query=${query}`);
        const symbol = response.data.symbol;
        // Navigate to the detail page for the found symbol
        navigate(`/stock/${symbol}`);
      } catch (err) {
        setError('Could not find a stock for that query. Please try again.');
        console.error("Search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <HomePageContainer>
      <Title>Stellar Stock Screener</Title>
      <Subtitle>
        Leveraging AI to provide comprehensive financial insights.
        Enter a company name like "Tesla" or "Reliance India" to begin.
      </Subtitle>
      <SearchInput
        type="text"
        placeholder="Search for a company..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleSearch}
        disabled={isLoading}
      />
      <LoadingText>
        {isLoading ? 'Searching with AI...' : error || ''}
      </LoadingText>
    </HomePageContainer>
  );
};

export default HomePage;