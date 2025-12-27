import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import Card from '../common/Card';
import { FaRedo, FaRobot } from 'react-icons/fa';

// --- Styled Components & Animations ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const TitleWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
`;

const RefreshButton = styled.button`
  background: transparent;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
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

// The 4-quadrant grid layout
const SwotGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background-color: var(--color-border);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-in;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SwotQuadrant = styled.div`
  background-color: var(--color-secondary);
  padding: 1.5rem;
  min-height: 200px;
  position: relative;
`;

const QuadrantTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: ${({ color }) => color};
  border-bottom: 2px solid ${({ color }) => color};
  padding-bottom: 0.5rem;
  display: inline-block;
`;

const SwotList = styled.ul`
  list-style-type: none;
  padding-left: 0;
  margin-top: 0;
`;

const SwotListItem = styled.li`
  margin-bottom: 0.75rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding-left: 1.5rem;
  position: relative;
  font-size: 0.95rem;

  &::before {
    content: '•';
    color: var(--color-primary);
    position: absolute;
    left: 0;
    top: 0;
    font-size: 1.2rem;
    line-height: 1.6;
  }
`;

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-primary);
  gap: 1rem;
`;

const ErrorText = styled.p`
  color: var(--color-text-secondary);
  font-style: italic;
  padding: 2rem;
  text-align: center;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
`;

// --- The Component ---

const SwotAnalysis = ({ analysisText, isLoading, onRegenerate }) => {

  // --- PARSER ---
  const swotData = useMemo(() => {
    if (!analysisText || isLoading) return null;

    const data = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
    const lines = analysisText.split('\n');
    let currentSection = null;

    lines.forEach(line => {
      const cleanLine = line.trim();
      const lowerLine = cleanLine.toLowerCase();

      if (lowerLine.includes('strength')) currentSection = 'Strengths';
      else if (lowerLine.includes('weakness')) currentSection = 'Weaknesses';
      else if (lowerLine.includes('opportunit')) currentSection = 'Opportunities';
      else if (lowerLine.includes('threat')) currentSection = 'Threats';
      
      else if (currentSection && (cleanLine.startsWith('-') || cleanLine.startsWith('*') || cleanLine.startsWith('•'))) {
        const content = cleanLine.replace(/^[\-\*\•]\s?/, '').replace(/\*\*.*?\*\*/g, '').trim();
        if (content.length > 2) data[currentSection].push(content);
      }
    });
    return data;
  }, [analysisText, isLoading]);

  // --- RENDER ---
  
  return (
    <Card>
      {/* Header with Regenerate Button */}
      <HeaderContainer>
        <TitleWrapper>
            <FaRobot size={20} color="var(--color-primary)" />
            <SectionTitle>AI-Powered SWOT Analysis</SectionTitle>
        </TitleWrapper>
        <RefreshButton onClick={onRegenerate} disabled={isLoading} isLoading={isLoading}>
            <FaRedo /> {isLoading ? 'Analyzing...' : 'Regenerate'}
        </RefreshButton>
      </HeaderContainer>

      {/* Content */}
      {isLoading ? (
        <LoaderContainer>
            <FaRedo className="fa-spin" size={30} />
            <p>Scanning news and financials...</p>
        </LoaderContainer>
      ) : (!swotData || Object.values(swotData).every(arr => arr.length === 0)) ? (
        <ErrorText>
          {analysisText && !analysisText.includes("generate") 
            ? analysisText 
            : "SWOT analysis is currently unavailable. Please click Regenerate."}
        </ErrorText>
      ) : (
        <SwotGrid>
          <SwotQuadrant>
            <QuadrantTitle color="var(--color-success)">Strengths</QuadrantTitle>
            <SwotList>{swotData.Strengths.map((item, i) => <SwotListItem key={`s-${i}`}>{item}</SwotListItem>)}</SwotList>
          </SwotQuadrant>
          
          <SwotQuadrant>
            <QuadrantTitle color="var(--color-danger)">Weaknesses</QuadrantTitle>
            <SwotList>{swotData.Weaknesses.map((item, i) => <SwotListItem key={`w-${i}`}>{item}</SwotListItem>)}</SwotList>
          </SwotQuadrant>
          
          <SwotQuadrant>
            <QuadrantTitle color="var(--color-primary)">Opportunities</QuadrantTitle>
            <SwotList>{swotData.Opportunities.map((item, i) => <SwotListItem key={`o-${i}`}>{item}</SwotListItem>)}</SwotList>
          </SwotQuadrant>
          
          <SwotQuadrant>
            <QuadrantTitle color="#EDBB5A">Threats</QuadrantTitle>
            <SwotList>{swotData.Threats.map((item, i) => <SwotListItem key={`t-${i}`}>{item}</SwotListItem>)}</SwotList>
          </SwotQuadrant>
        </SwotGrid>
      )}
    </Card>
  );
};

export default SwotAnalysis;