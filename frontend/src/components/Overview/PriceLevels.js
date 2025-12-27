import React from 'react';
import styled, { keyframes } from 'styled-components';
import Card from '../common/Card';
import { FaArrowUp, FaArrowDown, FaCrosshairs } from 'react-icons/fa';

// --- ANIMATIONS ---
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 5px var(--color-primary), 0 0 10px var(--color-primary); }
  50% { box-shadow: 0 0 15px var(--color-primary), 0 0 25px var(--color-primary); }
  100% { box-shadow: 0 0 5px var(--color-primary), 0 0 10px var(--color-primary); }
`;

const slideIn = keyframes`
  from { width: 0; opacity: 0; }
  to { width: 100%; opacity: 1; }
`;

// --- STYLED COMPONENTS ---

const LadderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const StatusBadge = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  color: ${({ color }) => color};
  border: 1px solid ${({ color }) => color}44;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const GraphicWrapper = styled.div`
  position: relative;
  height: 60px;
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  margin: 1rem 0;
  display: flex;
  align-items: center;
`;

const BarBackground = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(to right, #F85149 0%, #EDBB5A 50%, #3FB950 100%);
  border-radius: 2px;
  opacity: 0.3;
`;

const CurrentPriceMarker = styled.div`
  position: absolute;
  left: ${({ percent }) => percent}%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background-color: var(--color-primary);
  border-radius: 2px;
  box-shadow: 0 0 15px var(--color-primary);
  animation: ${pulseGlow} 2s infinite;
  z-index: 10;
  transition: left 1s cubic-bezier(0.25, 0.8, 0.25, 1);

  &::after {
    content: '${({ price, currency }) => currency + price}';
    position: absolute;
    top: -25px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-primary);
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
  }
`;

const LevelMarker = styled.div`
  position: absolute;
  left: ${({ percent }) => percent}%;
  top: 50%;
  transform: translate(-50%, -50%);
  height: 20px;
  width: 2px;
  background-color: ${({ color }) => color};
  opacity: 0.7;

  &::after {
    content: '${({ label }) => label}';
    position: absolute;
    bottom: -22px;
    left: 50%;
    transform: translateX(-50%);
    color: ${({ color }) => color};
    font-size: 0.7rem;
    font-weight: 600;
  }
`;

const LevelsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const LevelCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border-left: 3px solid ${({ color }) => color};
  animation: ${slideIn} 0.5s ease-out;
`;

const LevelLabel = styled.span`
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
`;

const LevelValue = styled.span`
  color: var(--color-text-primary);
  font-weight: 700;
  font-family: 'Roboto Mono', monospace;
`;

// --- HELPER FUNCTIONS ---
const getCurrencySymbol = (code) => (code === 'INR' ? '₹' : '$');

// **CRITICAL FIX**: Crash-proof number formatter
const safeFixed = (val, decimals = 2) => {
  if (val === undefined || val === null || isNaN(val)) return '--';
  return val.toFixed(decimals);
};

const PriceLevels = ({ pivotPoints, quote, profile }) => {
  // **CRITICAL FIX**: Stronger Guard Clause
  // We check if 'classic' exists AND if 'quote.price' is a valid number
  if (!pivotPoints || !pivotPoints.classic || !quote || typeof quote.price !== 'number') {
    return (
        <Card title="Key Levels">
            <p style={{color: 'var(--color-text-secondary)'}}>Levels data currently unavailable.</p>
        </Card>
    );
  }

  const { r2, r1, pp, s1, s2 } = pivotPoints.classic;
  const current = quote.price;
  const currency = getCurrencySymbol(profile?.currency);

  // Range Calculation logic (Safe)
  const rangeMin = s2 || (current * 0.95);
  const rangeMax = r2 || (current * 1.05);
  const totalRange = rangeMax - rangeMin;

  const getPercent = (val) => {
    if (!val || totalRange === 0) return 50;
    let pct = ((val - rangeMin) / totalRange) * 100;
    return Math.min(Math.max(pct, 5), 95); 
  };

  let status = "Consolidating";
  let statusColor = "#EDBB5A";
  let StatusIcon = FaCrosshairs;

  if (r1 && current > r1) {
    status = "Approaching Resistance";
    statusColor = "#F85149";
    StatusIcon = FaArrowUp;
  } else if (s1 && current < s1) {
    status = "Near Support Zone";
    statusColor = "#3FB950";
    StatusIcon = FaArrowDown;
  }

  return (
    <Card title="Key Levels (Classic Pivots)">
      <LadderContainer>
        <HeaderRow>
          <span style={{color: 'var(--color-text-secondary)', fontSize: '0.9rem'}}>Current Trend Position</span>
          <StatusBadge color={statusColor}>
            <StatusIcon /> {status}
          </StatusBadge>
        </HeaderRow>

        <GraphicWrapper>
          <BarBackground />
          {/* We safely check each level before rendering its marker */}
          {s1 && <LevelMarker percent={getPercent(s1)} color="#3FB950" label="S1" />}
          {pp && <LevelMarker percent={getPercent(pp)} color="#EDBB5A" label="PP" />}
          {r1 && <LevelMarker percent={getPercent(r1)} color="#F85149" label="R1" />}
          
          <CurrentPriceMarker 
            percent={getPercent(current)} 
            price={safeFixed(current, 1)} 
            currency={currency} 
          />
        </GraphicWrapper>

        <LevelsGrid>
          <LevelCard color="#F85149">
            <LevelLabel>Resistance 2</LevelLabel>
            <LevelValue>{currency}{safeFixed(r2)}</LevelValue>
          </LevelCard>
          <LevelCard color="#F85149">
            <LevelLabel>Resistance 1</LevelLabel>
            <LevelValue>{currency}{safeFixed(r1)}</LevelValue>
          </LevelCard>
          <LevelCard color="#EDBB5A">
            <LevelLabel>Pivot Point</LevelLabel>
            <LevelValue>{currency}{safeFixed(pp)}</LevelValue>
          </LevelCard>
          <LevelCard color="#3FB950">
            <LevelLabel>Support 1</LevelLabel>
            <LevelValue>{currency}{safeFixed(s1)}</LevelValue>
          </LevelCard>
          <LevelCard color="#3FB950">
            <LevelLabel>Support 2</LevelLabel>
            <LevelValue>{currency}{safeFixed(s2)}</LevelValue>
          </LevelCard>
        </LevelsGrid>

      </LadderContainer>
    </Card>
  );
};

export default PriceLevels;