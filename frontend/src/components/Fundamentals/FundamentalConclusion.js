import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';

// --- Styled Components & Animations ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SectionContainer = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
`;

const Loader = styled.div`
  color: var(--color-primary);
  animation: ${fadeIn} 0.5s ease-in;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

const ConclusionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  align-items: center;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const GradeCircle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-secondary) 60%, transparent 61%);
  border: 8px solid ${({ color }) => color};
  box-shadow: 0 0 25px ${({ color }) => color}33;
  margin: 0 auto;
  transition: all 0.5s ease-in-out;
`;

const GradeText = styled.span`
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  color: ${({ color }) => color};
`;

const ThesisText = styled.p`
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.6;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const TakeawaysList = styled.ul`
  list-style-type: none;
  padding-left: 0;
`;

const TakeawayItem = styled.li`
  margin-bottom: 1rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: flex-start;
  line-height: 1.6;

  &::before {
    content: '▪';
    color: var(--color-primary);
    margin-right: 12px;
    font-size: 1.5rem;
    line-height: 1.6;
  }
`;

// --- The New Lazy-Loading React Component ---

const FundamentalConclusion = ({
  symbol,
  companyName,
  piotroskiData,
  grahamData,
  darvasData,
  canslimAssessment,
  philosophyAssessment
}) => {
  const [conclusion, setConclusion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchConclusion = async () => {
      // Guard clause: Don't run if the essential input data is missing
      if (!symbol || !piotroskiData || !grahamData || !darvasData || !canslimAssessment || !philosophyAssessment) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const payload = {
          companyName: companyName,
          piotroskiData: piotroskiData,
          grahamData: grahamData,
          darvasData: darvasData,
          canslimAssessment: canslimAssessment,
          philosophyAssessment: philosophyAssessment,
        };
        const response = await axios.post(`/api/stocks/${symbol}/conclusion-analysis`, payload);
        setConclusion(response.data.conclusion);
      } catch (error) {
        console.error("Failed to fetch AI conclusion:", error);
        setConclusion("GRADE: N/A\nTHESIS: Could not generate AI conclusion.\nTAKEAWAYS:\n- Error communicating with the analysis engine.");
      } finally {
        setIsLoading(false);
      }
    };

    // We add a longer delay to ensure all other AI calls have finished
    const timer = setTimeout(fetchConclusion, 800);
    return () => clearTimeout(timer);
  }, [symbol, companyName, piotroskiData, grahamData, darvasData, canslimAssessment, philosophyAssessment]);

  // This parser is the "brain" of our display logic
  const parsedConclusion = useMemo(() => {
    if (!conclusion) return { grade: 'N/A', thesis: 'Loading...', takeaways: [] };
    
    const lines = conclusion.split('\n');
    const grade = lines.find(l => l.startsWith('GRADE:'))?.replace('GRADE:', '').trim() || 'N/A';
    const thesis = lines.find(l => l.startsWith('THESIS:'))?.replace('THESIS:', '').trim() || 'No thesis available.';
    const takeaways = lines.filter(l => l.startsWith('- ')).map(l => l.replace('- ', '').trim());

    return { grade, thesis, takeaways };
  }, [conclusion]);

  const getGradeColor = (grade) => {
    if (grade.startsWith('A')) return 'var(--color-success)';
    if (grade.startsWith('B')) return '#34D399'; // Lighter Green
    if (grade.startsWith('C')) return '#EDBB5A'; // Yellow
    if (grade.startsWith('D')) return '#F88149'; // Orange
    if (grade.startsWith('F')) return 'var(--color-danger)';
    return 'var(--color-text-secondary)';
  };
  const gradeColor = getGradeColor(parsedConclusion.grade);

  if (isLoading) {
    return (
      <SectionContainer>
        <SectionTitle>Analyst's Conclusion</SectionTitle>
        <Loader>Synthesizing all fundamental data...</Loader>
      </SectionContainer>
    );
  }

  return (
    <SectionContainer>
      <SectionTitle>Analyst's Conclusion</SectionTitle>
      <ThesisText>"{parsedConclusion.thesis}"</ThesisText>
      <ConclusionGrid>
        <GradeCircle color={gradeColor}>
          <GradeText color={gradeColor}>{parsedConclusion.grade}</GradeText>
        </GradeCircle>
        <div>
          <h4 style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>Key Takeaways:</h4>
          <TakeawaysList>
            {parsedConclusion.takeaways.map((item, index) => (
              <TakeawayItem key={index}>{item}</TakeawayItem>
            ))}
          </TakeawaysList>
        </div>
      </ConclusionGrid>
    </SectionContainer>
  );
};

export default FundamentalConclusion;