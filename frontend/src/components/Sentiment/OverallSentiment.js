import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import GaugeChart from 'react-gauge-chart';
import Card from '../common/Card';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FaClock, FaSync } from 'react-icons/fa';

// --- STYLED COMPONENTS ---

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MainMeterWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const SubMetersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr; /* Stack vertically on mobile */
    gap: 1.5rem;
  }
`;

const SubMeterItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: var(--color-background);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, border-color 0.2s ease;
  position: relative;
  overflow: hidden; /* Contains the loading overlay */

  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary);
  }
`;

const MeterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`;

const MeterTitle = styled.h4`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
`;

// --- NEW DROPDOWN STYLE ---
const TimeframeSelect = styled.select`
  background: rgba(255,255,255,0.1);
  border: 1px solid transparent;
  border-radius: 4px;
  color: var(--color-text-primary);
  font-size: 0.7rem;
  padding: 2px 6px;
  cursor: pointer;
  outline: none;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: var(--color-primary);
    color: white;
  }
  
  &:focus {
    border-color: var(--color-primary);
  }

  option {
    background: #1C2128;
    color: white;
  }
`;

const VerdictText = styled.div`
  font-size: 1.8rem;
  font-weight: 800;
  text-align: center;
  margin-top: -30px;
  color: ${({ color }) => color};
  text-shadow: 0 0 15px ${({ color }) => color}44;
`;

const SubVerdictText = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  text-align: center;
  margin-top: -15px;
  color: ${({ color }) => color};
`;

const ScoreText = styled.div`
  font-size: 0.85rem;
  font-weight: 500;
  text-align: center;
  color: var(--color-text-secondary);
  margin-top: 5px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(13, 17, 23, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  z-index: 10;
  color: var(--color-primary);
  font-size: 1.5rem;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.2s ease-in;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  svg {
    animation: spin 1s linear infinite;
    margin-bottom: 0.5rem;
  }
  
  span {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
`;

// --- Helper for Colors ---
const getColor = (score) => {
  if (score >= 75) return 'var(--color-success)'; // Strong Buy
  if (score >= 60) return '#34D399'; // Buy
  if (score <= 25) return 'var(--color-danger)'; // Strong Sell
  if (score <= 40) return '#F87171'; // Sell
  return '#EDBB5A'; // Neutral
};

// --- Reusable Gauge Component ---
const CustomGauge = ({ id, score, label, size = "small" }) => {
  const color = getColor(score);
  const percent = Math.min(Math.max(score / 100, 0), 1); // Clamp 0-1
  
  return (
    <div style={{ width: '100%', maxWidth: size === 'large' ? '350px' : '200px' }}>
      <GaugeChart
        id={id}
        nrOfLevels={20}
        colors={['#F85149', '#F88149', '#EDBB5A', '#3FB950', '#17C3B2']}
        percent={percent}
        arcPadding={0.02}
        cornerRadius={3}
        textColor={'transparent'}
        needleBaseColor={'#FFFFFF'}
        needleColor={'#C9D1D9'}
        animate={true}
        animDelay={300}
        style={{ width: '100%' }}
      />
      {size === 'large' ? (
        <VerdictText color={color}>{label}</VerdictText>
      ) : (
        <SubVerdictText color={color}>{label}</SubVerdictText>
      )}
      <ScoreText>{score.toFixed(0)} / 100</ScoreText>
    </div>
  );
};

// --- MAIN COMPONENT ---

const OverallSentiment = ({ sentimentData }) => {
  const { symbol } = useParams();
  
  // Local state for Interactive Technical Meter
  const [techTimeframe, setTechTimeframe] = useState('1d'); // Default to Daily to match main load
  const [techData, setTechData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize techData from the main sentimentData prop when it loads
  useEffect(() => {
    if (sentimentData?.breakdown?.technical) {
      setTechData(sentimentData.breakdown.technical);
    }
  }, [sentimentData]);

  // Handler for Timeframe Change
  const handleTimeframeChange = async (e) => {
    const newTf = e.target.value;
    setTechTimeframe(newTf);
    setIsUpdating(true);

    try {
      // Call the specific endpoint for technical scoring
      const response = await axios.post(`/api/stocks/${symbol}/technical-score`, {
        timeframe: newTf
      });
      setTechData(response.data);
    } catch (err) {
      console.error("Failed to update technical score", err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!sentimentData) {
    return (
      <Card title="AI Confidence Matrix">
        <p style={{color: 'var(--color-text-secondary)', padding: '1rem', textAlign: 'center'}}>
            Calculating market sentiment...
        </p>
      </Card>
    );
  }

  const { score, verdict, breakdown } = sentimentData;
  
  // Fallback defaults if breakdown is missing
  const bd = breakdown || {
      fundamental: { score: 50, label: '--' },
      financial: { score: 50, label: '--' },
      technical: { score: 50, label: '--' }
  };

  // Determine which Technical Data to show (Live vs Prop)
  const currentTech = techData || bd.technical;

  return (
    <Card title="AI Confidence Matrix">
      <DashboardContainer>
        
        {/* --- TOP: MAIN OVERALL METER --- */}
        <MainMeterWrapper>
          <MeterTitle style={{fontSize: '1rem', marginBottom: '1rem', opacity: 0.8}}>
            Overall Health Score
          </MeterTitle>
          <CustomGauge 
            id="overall-gauge" 
            score={score} 
            label={verdict} 
            size="large" 
          />
        </MainMeterWrapper>

        {/* --- BOTTOM: 3 SUB-METERS GRID --- */}
        <SubMetersGrid>
          
          {/* 1. TECHNICAL METER (Interactive) */}
          <SubMeterItem>
            {isUpdating && (
                <LoadingOverlay>
                    <FaSync />
                    <span>Analyzing...</span>
                </LoadingOverlay>
            )}
            <MeterHeader>
                <MeterTitle>Technical</MeterTitle>
                <TimeframeSelect value={techTimeframe} onChange={handleTimeframeChange}>
                    <option value="15m">15M</option>
                    <option value="1h">1H</option>
                    <option value="4h">4H</option>
                    <option value="1d">1D</option>
                    <option value="1wk">1W</option>
                </TimeframeSelect>
            </MeterHeader>
            <CustomGauge 
                id="tech-gauge" 
                score={currentTech.score} 
                label={currentTech.label} 
            />
          </SubMeterItem>

          {/* 2. FINANCIAL METER (Static) */}
          <SubMeterItem>
            <MeterHeader>
                <MeterTitle>Financial</MeterTitle>
            </MeterHeader>
            <CustomGauge 
                id="fin-gauge" 
                score={bd.financial.score} 
                label={bd.financial.label} 
            />
          </SubMeterItem>

          {/* 3. FUNDAMENTAL METER (Static) */}
          <SubMeterItem>
            <MeterHeader>
                <MeterTitle>Fundamental</MeterTitle>
            </MeterHeader>
            <CustomGauge 
                id="fund-gauge" 
                score={bd.fundamental.score} 
                label={bd.fundamental.label} 
            />
          </SubMeterItem>

        </SubMetersGrid>

      </DashboardContainer>
    </Card>
  );
};

export default OverallSentiment;