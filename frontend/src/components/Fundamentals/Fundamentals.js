import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import Card from '../common/Card';
import axios from 'axios';

// --- (All Styled Components are unchanged) ---
const fadeIn = keyframes`from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }`;
const SectionContainer = styled.div`margin-bottom: 3rem; animation: ${fadeIn} 0.5s ease-out; &:last-child { margin-bottom: 0; }`;
const SectionTitle = styled.h3`font-size: 1.5rem; font-weight: 600; margin-bottom: 1.5rem; color: var(--color-text-primary);`;
const PiotroskiGrid = styled.div`display: grid; grid-template-columns: 1fr 2fr; gap: 2rem; align-items: center; @media (max-width: 768px) { grid-template-columns: 1fr; }`;
const ScoreCard = styled.div`display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; background-color: var(--color-background); border-radius: 50%; width: 180px; height: 180px; border: 4px solid ${({ scoreColor }) => scoreColor}; margin: 0 auto;`;
const ScoreValue = styled.span`font-size: 4rem; font-weight: 800; color: ${({ scoreColor }) => scoreColor};`;
const ScoreLabel = styled.span`font-size: 1rem; font-weight: 500; color: var(--color-text-secondary);`;
const CriteriaList = styled.ul`list-style-type: none; padding-left: 0;`;
const CriteriaListItem = styled.li`margin-bottom: 0.75rem; color: var(--color-text-primary); display: flex; align-items: center; &::before { content: '✓'; color: var(--color-success); margin-right: 12px; font-size: 1.2rem; font-weight: bold; }`;
const AssessmentTable = styled.div`display: grid; grid-template-columns: 1fr 3fr; gap: 1px; background-color: var(--color-border); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; & > div { background-color: var(--color-secondary); padding: 1rem; } & > .header { font-weight: 600; color: var(--color-text-secondary); background-color: var(--color-background); }`;
const Loader = styled.div`color: var(--color-primary); animation: ${fadeIn} 0.5s ease-in;`;
const CanslimTable = styled(AssessmentTable)`grid-template-columns: 1fr 3fr 1fr;`;
const ResultCell = styled.div`font-weight: 700; color: ${({ result }) => { if (result === 'Pass') return 'var(--color-success)'; if (result === 'Fail') return 'var(--color-danger)'; return 'var(--color-text-secondary)'; }};`;

// --- The Final, Correct React Component ---
const Fundamentals = ({ symbol, profile, quote, keyMetrics, piotroskiData, quarterlyEarnings, annualEarnings, shareholding, delay }) => {
  // --- We now have separate state for each AI feature ---
  const [philosophyAssessment, setPhilosophyAssessment] = useState('');
  const [canslimAssessment, setCanslimAssessment] = useState('');
  const [isLoadingPhilosophy, setIsLoadingPhilosophy] = useState(true);
  const [isLoadingCanslim, setIsLoadingCanslim] = useState(true);

  // --- HOOK #1: AI Call for Investment Philosophies (RESTORED) ---
  useEffect(() => {
    const fetchPhilosophyAssessment = async () => {
      if (!symbol || !profile || !keyMetrics) { setIsLoadingPhilosophy(false); return; }
      setIsLoadingPhilosophy(true);
      try {
        const payload = { companyName: profile.companyName, keyMetrics: keyMetrics };
        const response = await axios.post(`/api/stocks/${symbol}/fundamental-analysis`, payload);
        setPhilosophyAssessment(response.data.assessment);
      } catch (error) { setPhilosophyAssessment("Could not generate AI assessment."); } finally { setIsLoadingPhilosophy(false); }
    };
    const timer = setTimeout(() => { fetchPhilosophyAssessment(); }, delay || 0);
    return () => clearTimeout(timer);
  }, [symbol, profile, keyMetrics, delay]);

  // --- HOOK #2: AI Call for CANSLIM Assessment ---
  useEffect(() => {
    const fetchCanslimAssessment = async () => {
      if (!symbol || !profile || !quote || !quarterlyEarnings || !annualEarnings || !shareholding) {
        setIsLoadingCanslim(false); return;
      }
      setIsLoadingCanslim(true);
      try {
        const payload = {
          companyName: profile.companyName, quote: quote, quarterlyEarnings: quarterlyEarnings,
          annualEarnings: annualEarnings, institutionalHolders: shareholding.length,
        };
        const response = await axios.post(`/api/stocks/${symbol}/canslim-analysis`, payload);
        setCanslimAssessment(response.data.assessment);
      } catch (error) { setCanslimAssessment("Could not generate CANSLIM assessment."); } finally { setIsLoadingCanslim(false); }
    };
    const timer = setTimeout(() => { fetchCanslimAssessment(); }, (delay || 0) + 200); // Stagger this call
    return () => clearTimeout(timer);
  }, [symbol, profile, quote, quarterlyEarnings, annualEarnings, shareholding, delay]);

  // --- (Piotroski logic is unchanged and correct) ---
  const { score, criteria } = piotroskiData || {};
  const getScoreColor = () => {
    if (score >= 7) return 'var(--color-success)';
    if (score >= 4) return '#EDBB5A';
    return 'var(--color-danger)';
  };
  const scoreColor = getScoreColor();
  
  // --- (Parsers are unchanged and correct) ---
  const parsedPhilosophy = useMemo(() => {
    if (!philosophyAssessment || typeof philosophyAssessment !== 'string') return [];
    return philosophyAssessment.split('\n').map(r => r.split('|').map(c => c.trim())).filter(r => r.length > 2 && !r[1].includes('---'));
  }, [philosophyAssessment]);
  const parsedCanslim = useMemo(() => {
    if (!canslimAssessment || typeof canslimAssessment !== 'string') return [];
    return canslimAssessment.split('\n').map(r => r.split('|').map(c => c.trim())).filter(r => r.length > 3 && !r[1].includes('---'));
  }, [canslimAssessment]);

  return (
    <Card>
      {/* --- Section 1: CANSLIM --- */}
      <SectionContainer>
        <SectionTitle>CANSLIM Analysis (William J. O'Neil)</SectionTitle>
        {isLoadingCanslim ? ( <Loader>Generating CANSLIM assessment...</Loader> ) : (
          parsedCanslim.length > 0 ? (
            <CanslimTable>
              <div className="header">Criteria</div><div className="header">Assessment</div><div className="header">Result</div>
              {parsedCanslim.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div>{row[1]}</div><div>{row[2]}</div><ResultCell result={row[3]}>{row[3]}</ResultCell>
                </React.Fragment>
              ))}
            </CanslimTable>
          ) : <p>{canslimAssessment}</p>
        )}
      </SectionContainer>
      
      {/* --- Section 2: Piotroski F-Score (RESTORED and CORRECT) --- */}
      <SectionContainer>
        <SectionTitle>Piotroski F-Score</SectionTitle>
        {piotroskiData && piotroskiData.score > 0 ? (
          <PiotroskiGrid>
            <ScoreCard scoreColor={scoreColor}>
              <ScoreValue scoreColor={scoreColor}>{score}</ScoreValue>
              <ScoreLabel>/ 9</ScoreLabel>
            </ScoreCard>
            <div>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                The F-Score reflects financial strength based on 9 criteria. A high score (7-9) suggests a healthy company.
              </p>
              <CriteriaList>
                {criteria && criteria.map((item, index) => (
                  <CriteriaListItem key={index}>{item}</CriteriaListItem>
                ))}
              </CriteriaList>
            </div>
          </PiotroskiGrid>
        ) : <p>Piotroski F-Score data is not available for this stock.</p>}
      </SectionContainer>

      {/* --- Section 3: Investment Philosophy Summary (RESTORED and CORRECT) --- */}
      <SectionContainer>
        <SectionTitle>Investment Philosophy Summary</SectionTitle>
        {isLoadingPhilosophy ? ( <Loader>Generating AI analysis summary...</Loader> ) : (
          parsedPhilosophy.length > 0 ? (
            <AssessmentTable>
              <div className="header">Formula</div><div className="header">Assessment</div>
              {parsedPhilosophy.map((row, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div>{row[1]}</div><div>{row[2]}</div>
                </React.Fragment>
              ))}
            </AssessmentTable>
          ) : <p>{philosophyAssessment}</p>
        )}
      </SectionContainer>
    </Card>
  );
};

export default Fundamentals;