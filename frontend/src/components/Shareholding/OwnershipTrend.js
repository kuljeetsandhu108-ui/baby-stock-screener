import React from 'react';
import styled from 'styled-components';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// --- Styled Components ---

const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--color-text-primary);
`;

const CustomTooltipContainer = styled.div`
  background-color: #2a3441;
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 8px;
  color: var(--color-text-primary);
`;


// --- The New, Smarter React Component ---

const OwnershipTrend = ({ historicalStatements }) => {
  // We now use the 'annual_revenue_and_profit' data (which is the income statements array)
  // as it contains the historical shares outstanding.
  if (!historicalStatements || !Array.isArray(historicalStatements) || historicalStatements.length < 2) {
    return (
      <ChartContainer>
        <SectionTitle>Shares Outstanding Trend</SectionTitle>
        <p>Historical shares data is not available for this stock.</p>
      </ChartContainer>
    );
  }

  // Helper function to format large numbers into Billions (B) or Millions (M)
  const formatLargeNumber = (num) => {
    if (!num || isNaN(num)) return 'N/A';
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
  };

  // Process the income statement data to extract the year and shares outstanding
  const chartData = historicalStatements
    .slice() // Create a copy to avoid mutating the original prop
    .reverse() // Reverse to show chronological order (oldest to newest)
    .map(item => ({
      year: item.calendarYear,
      'Shares Outstanding': item.weightedAverageShsOut,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <CustomTooltipContainer>
          <p style={{ fontWeight: 'bold' }}>Year: {label}</p>
          <p style={{ color: 'var(--color-primary)' }}>
            Shares: {formatLargeNumber(payload[0].value)}
          </p>
        </CustomTooltipContainer>
      );
    }
    return null;
  };

  return (
    <ChartContainer>
      <SectionTitle>Shares Outstanding Trend</SectionTitle>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis 
            dataKey="year" 
            stroke="var(--color-text-secondary)" 
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} 
          />
          <YAxis 
            stroke="var(--color-text-secondary)" 
            tickFormatter={formatLargeNumber}
            tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
            domain={['dataMin - 1000000', 'dataMax + 1000000']} // Add some padding
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="Shares Outstanding" 
            stroke="var(--color-primary)" 
            fill="rgba(88, 166, 255, 0.2)" // A nice semi-transparent fill
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default OwnershipTrend;