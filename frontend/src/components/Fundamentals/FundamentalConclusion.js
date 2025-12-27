import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import GaugeChart from 'react-gauge-chart';

// --- Styled Components & Animations ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const SectionContainer = styled.div`
  animation: ${fadeIn} 0.5s ease-out;
  padding: 1rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 2rem;
  color: var(--color-text-primary);
  text-align: center;
`;

const ConclusionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 3rem;
  align-items: start;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

// --- METER SECTION ---
const MeterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 2rem 1.5rem;
  position: relative;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

const GradeLabel = styled.div`
  font-size: 3.5rem;
  font-weight: 800;
  margin-top: -30px;
  color: ${({ color }) => color};
  text-shadow: 0 0 20px ${({ color }) => color}44;
`;

const GradeSubtitle = styled.span`
  font-size: 1rem;
  color: var(--color-text-secondary);
  margin-top: 0.5rem;
  font-weight: 500;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
`;

// --- NEW: GRADE LEGEND TABLE ---
const LegendContainer = styled.div`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const LegendHeader = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  opacity: 0.7;
  margin-bottom: 0.25rem;
  text-align: center;
  letter-spacing: 1px;
`;

const LegendItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const LegendGrade = styled.span`
  font-weight: 700;
  color: ${({ color }) => color};
  width: 30px;
`;

const LegendMeaning = styled.span`
  color: var(--color-text-secondary);
`;

// --- RIGHT SIDE CONTENT ---
const ThesisBox = styled.div`
  background: linear-gradient(135deg, rgba(22, 27, 34, 0.8), rgba(30, 41, 59, 0.4));
  border-left: 4px solid var(--color-primary);
  padding: 1.5rem;
  border-radius: 0 8px 8px 0;
  margin-bottom: 2rem;
`;

const ThesisText = styled.p`
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.8;
  font-style: italic;
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
  background: rgba(255,255,255,0.03);
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-border);
    transform: translateX(5px);
  }

  &::before {
    content: 'Analyzed';
    background-color: var(--color-primary);
    color: #000;
    font-size: 0.6rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    margin-right: 12px;
    margin-top: 4px;
    text-transform: uppercase;
  }
`;

// --- HELPERS ---
const getScoreFromGrade = (grade) => {
    if (!grade) return 0;
    const g = grade.toUpperCase().replace(/[^A-F]/g, '');
    if (g === 'A') return 0.95;
    if (g === 'B') return 0.80;
    if (g === 'C') return 0.60;
    if (g === 'D') return 0.40;
    if (g === 'F') return 0.15;
    return 0.50;
};

const getGradeColor = (grade) => {
    if (!grade) return 'var(--color-text-secondary)';
    const g = grade.toUpperCase();
    if (g.includes('A')) return 'var(--color-success)'; 
    if (g.includes('B')) return '#34D399'; 
    if (g.includes('C')) return '#EDBB5A'; 
    if (g.includes('D')) return '#F88149'; 
    if (g.includes('F')) return 'var(--color-danger)'; 
    return 'var(--color-text-secondary)';
};

// --- MAIN COMPONENT ---

const FundamentalConclusion = ({ conclusionData }) => {
  
  const parsedConclusion = useMemo(() => {
    if (!conclusionData) {
      return { grade: 'N/A', thesis: 'AI is analyzing the financial structure...', takeaways: [] };
    }
    
    const cleanText = "\n" + conclusionData.replace(/\*\*/g, '').replace(/\*/g, '');

    const gradeMatch = cleanText.match(/GRADE:\s*([A-F][+-]?)/i);
    const grade = gradeMatch ? gradeMatch[1].toUpperCase() : 'N/A';

    const thesisMatch = cleanText.match(/THESIS:\s*([\s\S]*?)(?=TAKEAWAYS:|$)/i);
    const thesis = thesisMatch ? thesisMatch[1].trim() : 'No thesis generated.';

    const takeawaysMatch = cleanText.match(/TAKEAWAYS:\s*([\s\S]*)/i);
    const rawTakeaways = takeawaysMatch ? takeawaysMatch[1].trim() : '';
    
    const takeaways = rawTakeaways
        .split(/\n\s*[-•]\s*/)
        .map(t => t.trim())
        .filter(t => t.length > 10); 

    return { grade, thesis, takeaways };
  }, [conclusionData]);

  const scorePercent = getScoreFromGrade(parsedConclusion.grade);
  const gradeColor = getGradeColor(parsedConclusion.grade);

  return (
    <SectionContainer>
      <SectionTitle>AI Investment Verdict</SectionTitle>
      
      <ConclusionGrid>
        
        {/* --- LEFT: METER + LEGEND --- */}
        <MeterWrapper>
            <GaugeChart 
                id="fundamental-grade-gauge"
                nrOfLevels={5}
                colors={['#F85149', '#F88149', '#EDBB5A', '#34D399', '#3FB950']}
                arcWidth={0.3}
                percent={scorePercent}
                textColor="transparent"
                needleBaseColor="#C9D1D9"
                needleColor="#C9D1D9"
                animate={true}
            />
            <GradeLabel color={gradeColor}>{parsedConclusion.grade}</GradeLabel>
            <GradeSubtitle>Fundamental Grade</GradeSubtitle>

            {/* --- NEW LEGEND TABLE --- */}
            <LegendContainer>
                <LegendHeader>Grade Scale Guide</LegendHeader>
                <LegendItem>
                    <LegendGrade color="var(--color-success)">A</LegendGrade>
                    <LegendMeaning>Excellent / Strong Buy</LegendMeaning>
                </LegendItem>
                <LegendItem>
                    <LegendGrade color="#34D399">B</LegendGrade>
                    <LegendMeaning>Good / Accumulate</LegendMeaning>
                </LegendItem>
                <LegendItem>
                    <LegendGrade color="#EDBB5A">C</LegendGrade>
                    <LegendMeaning>Neutral / Hold</LegendMeaning>
                </LegendItem>
                <LegendItem>
                    <LegendGrade color="#F88149">D</LegendGrade>
                    <LegendMeaning>Weak / Reduce</LegendMeaning>
                </LegendItem>
                <LegendItem>
                    <LegendGrade color="var(--color-danger)">E</LegendGrade>
                    <LegendMeaning>Critical / Sell</LegendMeaning>
                </LegendItem>
            </LegendContainer>

        </MeterWrapper>

        {/* --- RIGHT: TEXT CONTENT --- */}
        <div>
          <ThesisBox>
            <ThesisText>"{parsedConclusion.thesis}"</ThesisText>
          </ThesisBox>
          
          <h4 style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
             Key Takeaways
          </h4>
          <TakeawaysList>
            {parsedConclusion.takeaways.length > 0 ? (
                parsedConclusion.takeaways.map((item, index) => (
                <TakeawayItem key={index}>{item}</TakeawayItem>
                ))
            ) : (
                <p style={{color: 'var(--color-text-secondary)', fontStyle: 'italic'}}>No specific takeaways generated.</p>
            )}
          </TakeawaysList>
        </div>

      </ConclusionGrid>
    </SectionContainer>
  );
};

export default FundamentalConclusion;