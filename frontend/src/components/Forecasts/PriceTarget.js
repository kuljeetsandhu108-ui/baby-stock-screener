import React from 'react';
import styled from 'styled-components';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';

const PriceTargetContainer = styled.div`
  width: 100%;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text-primary);
`;

const PriceDisplay = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
`;

const PriceChange = styled.div`
  font-size: 1rem;
  font-weight: 500;
  color: ${({ isPositive }) => (isPositive ? 'var(--color-success)' : 'var(--color-danger)')};
  margin-bottom: 1rem;
`;

const SummaryText = styled.p`
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 400px;
  margin-bottom: 2rem;
`;

const ChartWrapper = styled.div`
  height: 400px;
  width: 100%;
`;

const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'JPY': return '¥';
        default: return '$'; 
    }
};

// **CRITICAL FIX**: Crash-proof number formatter
const safeFixed = (val, decimals = 2) => {
  if (val === undefined || val === null || isNaN(val)) return 'N/A';
  return val.toFixed(decimals);
};

const PriceTarget = ({ consensus, quote, currency }) => {

  // **CRITICAL FIX**: Validate numeric data before rendering
  if (!consensus || !quote || typeof consensus.targetConsensus !== 'number' || typeof quote.price !== 'number') {
    return (
      <PriceTargetContainer>
        <SectionTitle>Price Target</SectionTitle>
        <p style={{color: 'var(--color-text-secondary)'}}>Price target data is not available for this stock.</p>
      </PriceTargetContainer>
    );
  }
  
  const currencySymbol = getCurrencySymbol(currency);
  const { targetHigh, targetLow, targetConsensus } = consensus;
  const currentPrice = quote.price;

  const change = targetConsensus - currentPrice;
  const changePercent = (change / currentPrice) * 100;
  const isPositive = change >= 0;

  const chartData = [
    { name: 'Current', value: currentPrice },
    { name: '1Y Forecast', value: targetConsensus },
  ];
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'var(--color-secondary)',
          border: '1px solid var(--color-border)',
          padding: '1rem',
          borderRadius: '8px'
        }}>
          <p>{`${label}: ${currencySymbol}${safeFixed(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <PriceTargetContainer>
      <SectionTitle>Price Target</SectionTitle>
      
      <PriceDisplay>{currencySymbol}{safeFixed(targetConsensus)}</PriceDisplay>
      <PriceChange isPositive={isPositive}>
          {isPositive ? '+' : ''}{currencySymbol}{safeFixed(change)} ({isPositive ? '+' : ''}{safeFixed(changePercent)}%)
      </PriceChange>
      <SummaryText>
        The analysts offering 1-year price forecasts have a max estimate of {currencySymbol}{safeFixed(targetHigh)} and a min estimate of {currencySymbol}{safeFixed(targetLow)}.
      </SummaryText>

      <ChartWrapper>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <XAxis dataKey="name" stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} />
            <YAxis 
                stroke="var(--color-text-secondary)" 
                domain={['auto', 'auto']}
                tick={{ fill: 'var(--color-text-secondary)' }}
                tickFormatter={(tick) => `${currencySymbol}${tick}`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} />

            {/* Only render lines if data exists */}
            {targetHigh && (
                <ReferenceLine y={targetHigh} stroke="var(--color-success)" strokeDasharray="3 3">
                    <Label value={`Max: ${currencySymbol}${safeFixed(targetHigh)}`} position="right" fill="var(--color-success)" />
                </ReferenceLine>
            )}
            {targetLow && (
                <ReferenceLine y={targetLow} stroke="var(--color-danger)" strokeDasharray="3 3">
                    <Label value={`Min: ${currencySymbol}${safeFixed(targetLow)}`} position="right" fill="var(--color-danger)" />
                </ReferenceLine>
            )}
            <ReferenceLine y={targetConsensus} stroke="var(--color-primary)" strokeDasharray="3 3">
                <Label value={`Avg: ${currencySymbol}${safeFixed(targetConsensus)}`} position="right" fill="var(--color-primary)" />
            </ReferenceLine>
            <ReferenceLine y={currentPrice} stroke="#fff" strokeDasharray="1 1">
                <Label value={`Current: ${currencySymbol}${safeFixed(currentPrice)}`} position="left" fill="#fff" />
            </ReferenceLine>
            
          </LineChart>
        </ResponsiveContainer>
      </ChartWrapper>
    </PriceTargetContainer>
  );
};

export default PriceTarget;