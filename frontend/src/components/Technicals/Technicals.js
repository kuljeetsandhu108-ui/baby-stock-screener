import React, { useState, useMemo, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import GaugeChart from 'react-gauge-chart';
import Card from '../common/Card';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { FaArrowUp, FaArrowDown, FaExchangeAlt, FaLayerGroup, FaSync, FaClock } from 'react-icons/fa';

// --- STYLED COMPONENTS ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  animation: ${fadeIn} 0.5s ease-out;
  position: relative;
`;

// --- HEADER & CONTROLS ---
const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const HeaderTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TimeframeSelect = styled.select`
  background: var(--color-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
  }
  
  &:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(13, 17, 23, 0.85);
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  backdrop-filter: blur(2px);
  color: var(--color-primary);
`;

const LoadingIcon = styled(FaSync)`
  font-size: 2rem;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 1rem;
`;

// --- SECTION 1: GAUGE & SUMMARY ---
const SummarySection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const GaugeWrapper = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const VerdictTitle = styled.h2`
  font-size: 2.5rem;
  font-weight: 800;
  color: ${({ color }) => color};
  text-shadow: 0 0 20px ${({ color }) => color}44;
  margin-top: -20px;
  margin-bottom: 0.5rem;
`;

const SignalCounts = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
`;

const CountItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CountLabel = styled.span`
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
`;

const CountValue = styled.span`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${({ color }) => color};
`;

// --- SECTION 2: TABLES ---
const TablesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
  }
`;

const TableCard = styled.div`
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
`;

const TableHeader = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
  font-weight: 600;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Tr = styled.tr`
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.02); }
`;

const Th = styled.th`
  text-align: left;
  padding: 0.8rem 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--color-text-secondary);
`;

const Td = styled.td`
  padding: 0.8rem 1rem;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  
  &:last-child { text-align: right; }
`;

const SignalBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  min-width: 80px;
  justify-content: center;
  
  background: ${({ type }) => 
    type === 'BUY' ? 'rgba(63, 185, 80, 0.15)' : 
    type === 'SELL' ? 'rgba(248, 81, 73, 0.15)' : 
    'rgba(139, 148, 158, 0.15)'};
    
  color: ${({ type }) => 
    type === 'BUY' ? '#3FB950' : 
    type === 'SELL' ? '#F85149' : 
    '#8B949E'};
    
  border: 1px solid ${({ type }) => 
    type === 'BUY' ? '#3FB950' : 
    type === 'SELL' ? '#F85149' : 
    '#8B949E'};
`;

// --- SECTION 3: PIVOTS ---
const PivotContainer = styled.div`
  margin-top: 1rem;
`;

const TabsWrapper = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 1rem;
`;

const PivotTab = styled.button`
  background: ${({ active }) => active ? 'var(--color-primary)' : 'transparent'};
  color: ${({ active }) => active ? '#fff' : 'var(--color-text-secondary)'};
  border: 1px solid ${({ active }) => active ? 'var(--color-primary)' : 'var(--color-border)'};
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #fff;
    border-color: var(--color-primary);
  }
`;

// --- HELPER FUNCTIONS ---

const getSignal = (value, condition, type = 'standard') => {
  if (value === null || value === undefined) return 'NEUTRAL';
  
  if (type === 'RSI') {
    if (value < 30) return 'BUY'; 
    if (value > 70) return 'SELL'; 
    return 'NEUTRAL';
  }
  
  if (type === 'MACD') {
      return value > condition ? 'BUY' : 'SELL';
  }

  if (value > condition) return 'BUY';
  if (value < condition) return 'SELL';
  return 'NEUTRAL';
};

const formatNum = (num) => {
    if(num === undefined || num === null) return '--';
    return num.toFixed(2);
};

// --- MAIN COMPONENT ---

const Technicals = ({ 
  analystRatings, 
  technicalIndicators: initialIndicators, 
  movingAverages: initialMAs, 
  pivotPoints: initialPivots, 
  quote 
}) => {
  const { symbol } = useParams();
  const [activePivot, setActivePivot] = useState('classic');
  
  // State for Dynamic Data
  const [timeframe, setTimeframe] = useState('1d');
  const [data, setData] = useState({
      technicalIndicators: initialIndicators,
      movingAverages: initialMAs,
      pivotPoints: initialPivots
  });
  const [isLoading, setIsLoading] = useState(false);

  // --- TIMEFRAME HANDLER ---
  const handleTimeframeChange = async (e) => {
      const newTf = e.target.value;
      setTimeframe(newTf);
      setIsLoading(true);

      try {
          const response = await axios.post(`/api/stocks/${symbol}/technicals-data`, {
              timeframe: newTf
          });
          
          if (response.data && !response.data.error) {
              setData(response.data);
          }
      } catch (err) {
          console.error("Failed to fetch timeframe technicals:", err);
      } finally {
          setIsLoading(false);
      }
  };

  // --- 1. SIGNAL CALCULATOR ENGINE ---
  const signals = useMemo(() => {
    let buy = 0, sell = 0, neutral = 0;
    const items = [];
    
    // Destructure current data
    const { technicalIndicators, movingAverages } = data;

    const addSignal = (name, value, signal) => {
      if (signal === 'BUY') buy++;
      else if (signal === 'SELL') sell++;
      else neutral++;
      items.push({ name, value, signal });
    };

    if (technicalIndicators) {
      const { rsi, macd, macdsignal, adx, stochasticsk, williamsr } = technicalIndicators;
      addSignal('RSI (14)', rsi, getSignal(rsi, null, 'RSI'));
      addSignal('Stoch (14,3)', stochasticsk, stochasticsk < 20 ? 'BUY' : stochasticsk > 80 ? 'SELL' : 'NEUTRAL');
      addSignal('MACD (12,26)', macd, macd > macdsignal ? 'BUY' : 'SELL');
      addSignal('ADX (14)', adx, adx > 25 ? (quote?.price > movingAverages?.['50'] ? 'BUY' : 'SELL') : 'NEUTRAL');
      addSignal('Williams %R', williamsr, williamsr < -80 ? 'BUY' : williamsr > -20 ? 'SELL' : 'NEUTRAL');
    }

    if (movingAverages && quote?.price) {
      const price = quote.price;
      addSignal('SMA 10', movingAverages['10'], price > movingAverages['10'] ? 'BUY' : 'SELL');
      addSignal('SMA 20', movingAverages['20'], price > movingAverages['20'] ? 'BUY' : 'SELL');
      addSignal('SMA 50', movingAverages['50'], price > movingAverages['50'] ? 'BUY' : 'SELL');
      addSignal('SMA 200', movingAverages['200'], price > movingAverages['200'] ? 'BUY' : 'SELL');
    }

    // Determine Overall Verdict
    const total = buy + sell + neutral;
    const sentiment = total > 0 ? (buy / total) * 100 : 50; 
    
    let verdict = "NEUTRAL";
    let color = "#EDBB5A";
    if (buy > sell && buy > neutral) { verdict = "BUY"; color = "#3FB950"; }
    if (buy > sell * 2) { verdict = "STRONG BUY"; color = "#3FB950"; }
    if (sell > buy && sell > neutral) { verdict = "SELL"; color = "#F85149"; }
    if (sell > buy * 2) { verdict = "STRONG SELL"; color = "#F85149"; }

    return { buy, sell, neutral, items, sentiment, verdict, color };
  }, [data, quote]);

  // --- RENDER ---

  if (!data.technicalIndicators) return <Card><p>Loading technicals...</p></Card>;

  // Split signals for the two tables
  const oscillators = signals.items.filter(i => ['RSI', 'Stoch', 'MACD', 'ADX', 'Williams'].some(k => i.name.includes(k)));
  const mas = signals.items.filter(i => i.name.includes('SMA'));

  return (
    <Card>
      {isLoading && (
          <LoadingOverlay>
              <LoadingIcon />
              <span>Analyzing Market Data...</span>
          </LoadingOverlay>
      )}

      <DashboardContainer>
        
        {/* --- HEADER --- */}
        <DashboardHeader>
            <HeaderTitle>Technical Analysis</HeaderTitle>
            <Controls>
                <span style={{color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontWeight: 600}}>Timeframe:</span>
                <TimeframeSelect value={timeframe} onChange={handleTimeframeChange}>
                    <option value="5m">5 Min</option>
                    <option value="15m">15 Min</option>
                    <option value="1h">1 Hour</option>
                    <option value="4h">4 Hours</option>
                    <option value="1d">Daily</option>
                    <option value="1wk">Weekly</option>
                </TimeframeSelect>
            </Controls>
        </DashboardHeader>

        {/* --- SUMMARY GAUGE --- */}
        <SummarySection>
            <GaugeWrapper>
                <div style={{width: '300px'}}>
                    <GaugeChart 
                        id="tech-summary-gauge"
                        nrOfLevels={20}
                        colors={['#F85149', '#F88149', '#EDBB5A', '#34D399', '#3FB950']}
                        percent={signals.sentiment / 100}
                        arcPadding={0.02}
                        textColor="transparent"
                        needleColor="#C9D1D9"
                        animate={true}
                    />
                </div>
                <VerdictTitle color={signals.color}>{signals.verdict}</VerdictTitle>
                <SignalCounts>
                    <CountItem><CountLabel>Buy</CountLabel><CountValue color="#3FB950">{signals.buy}</CountValue></CountItem>
                    <CountItem><CountLabel>Neutral</CountLabel><CountValue color="#EDBB5A">{signals.neutral}</CountValue></CountItem>
                    <CountItem><CountLabel>Sell</CountLabel><CountValue color="#F85149">{signals.sell}</CountValue></CountItem>
                </SignalCounts>
            </GaugeWrapper>

            {/* --- ACTIONABLE SUMMARY --- */}
            <TableCard>
                <TableHeader><FaLayerGroup /> Summary Analysis ({timeframe.toUpperCase()})</TableHeader>
                <div style={{padding: '1.5rem', lineHeight: '1.8', color: 'var(--color-text-secondary)'}}>
                    <p>
                        The technical indicators on the <strong>{timeframe}</strong> timeframe are currently suggesting a 
                        <strong style={{color: signals.color}}> {signals.verdict} </strong> 
                        action.
                    </p>
                    <p>
                        <strong>{signals.buy}</strong> indicators are flashing BUY, while <strong>{signals.sell}</strong> are signaling SELL.
                        {data.movingAverages?.['200'] && (
                             <>Price is currently {quote?.price > data.movingAverages['200'] ? <span style={{color:'#3FB950'}}>ABOVE</span> : <span style={{color:'#F85149'}}>BELOW</span>} the 200-Period Moving Average.</>
                        )}
                    </p>
                </div>
            </TableCard>
        </SummarySection>

        {/* --- DETAILED TABLES --- */}
        <TablesGrid>
            <TableCard>
                <TableHeader><FaExchangeAlt /> Oscillators</TableHeader>
                <StyledTable>
                    <thead><tr><Th>Indicator</Th><Th>Value</Th><Th style={{textAlign:'right'}}>Action</Th></tr></thead>
                    <tbody>
                        {oscillators.map((row) => (
                            <Tr key={row.name}>
                                <Td>{row.name}</Td>
                                <Td>{formatNum(row.value)}</Td>
                                <Td><SignalBadge type={row.signal}>{row.signal}</SignalBadge></Td>
                            </Tr>
                        ))}
                    </tbody>
                </StyledTable>
            </TableCard>

            <TableCard>
                <TableHeader><FaLayerGroup /> Moving Averages</TableHeader>
                <StyledTable>
                    <thead><tr><Th>Period</Th><Th>Value</Th><Th style={{textAlign:'right'}}>Action</Th></tr></thead>
                    <tbody>
                        {mas.map((row) => (
                            <Tr key={row.name}>
                                <Td>{row.name}</Td>
                                <Td>{formatNum(row.value)}</Td>
                                <Td><SignalBadge type={row.signal}>{row.signal}</SignalBadge></Td>
                            </Tr>
                        ))}
                    </tbody>
                </StyledTable>
            </TableCard>
        </TablesGrid>

        {/* --- PIVOT POINTS --- */}
        <PivotContainer>
            <TabsWrapper>
                {['classic', 'fibonacci', 'camarilla'].map(type => (
                    <PivotTab 
                        key={type} 
                        active={activePivot === type} 
                        onClick={() => setActivePivot(type)}
                    >
                        {type.charAt(0).toUpperCase() + type.slice(1)} Pivots
                    </PivotTab>
                ))}
            </TabsWrapper>
            
            <TableCard>
                <StyledTable>
                    <thead>
                        <tr>
                            <Th>Support 3</Th><Th>Support 2</Th><Th>Support 1</Th>
                            <Th style={{color: '#EDBB5A'}}>Pivot</Th>
                            <Th>Resist 1</Th><Th>Resist 2</Th><Th>Resist 3</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.pivotPoints && data.pivotPoints[activePivot] ? (
                            <Tr>
                                <Td>{formatNum(data.pivotPoints[activePivot].s3)}</Td>
                                <Td>{formatNum(data.pivotPoints[activePivot].s2)}</Td>
                                <Td>{formatNum(data.pivotPoints[activePivot].s1)}</Td>
                                <Td style={{fontWeight:'700', color:'#EDBB5A'}}>{formatNum(data.pivotPoints[activePivot].pp)}</Td>
                                <Td>{formatNum(data.pivotPoints[activePivot].r1)}</Td>
                                <Td>{formatNum(data.pivotPoints[activePivot].r2)}</Td>
                                <Td>{formatNum(data.pivotPoints[activePivot].r3)}</Td>
                            </Tr>
                        ) : (
                            <Tr><Td colSpan="7" style={{textAlign:'center'}}>Pivot data unavailable</Td></Tr>
                        )}
                    </tbody>
                </StyledTable>
            </TableCard>
        </PivotContainer>

      </DashboardContainer>
    </Card>
  );
};

export default Technicals;