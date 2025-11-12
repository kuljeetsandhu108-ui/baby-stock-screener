import React from 'react';
import styled from 'styled-components';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';

// --- Styled Components ---

const SectionContainer = styled.div`
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

const ChartGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  height: 450px; /* Give a consistent height to the chart area */

  @media (max-width: 992px) {
    grid-template-columns: 1fr;
    height: auto;
    gap: 4rem;
  }
`;

const CustomTooltipContainer = styled.div`
  background-color: #2a3441;
  border: 1px solid var(--color-border);
  padding: 1rem;
  border-radius: 8px;
  color: var(--color-text-primary);
`;

const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    return num.toLocaleString();
};


// --- The React Component ---

const BalanceSheet = ({ balanceSheetData }) => {
  if (!balanceSheetData || !Array.isArray(balanceSheetData) || balanceSheetData.length === 0) {
    return (
      <SectionContainer>
        <SectionTitle>Balance Sheet</SectionTitle>
        <p>Balance sheet data is not available for this stock.</p>
      </SectionContainer>
    );
  }

  // Process the data for our stacked bar charts, reversing for chronological order
  const chartData = balanceSheetData.slice(0, 5).reverse().map(item => ({
    year: item.calendarYear,
    // Assets
    currentAssets: item.totalCurrentAssets,
    longTermAssets: item.totalNonCurrentAssets,
    // Liabilities & Equity
    currentLiabilities: item.totalCurrentLiabilities,
    longTermDebt: item.longTermDebt,
    equity: item.totalStockholdersEquity,
  }));
  
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <CustomTooltipContainer>
          <p style={{ fontWeight: 'bold' }}>Year: {label}</p>
          {payload.map(p => (
            <p key={p.dataKey} style={{ color: p.color }}>
              {`${p.name}: ${formatNumber(p.value)}`}
            </p>
          ))}
        </CustomTooltipContainer>
      );
    }
    return null;
  };

  return (
    <SectionContainer>
      <SectionTitle>Balance Sheet Composition (5-Year Trend)</SectionTitle>
      <ChartGrid>
        {/* --- Chart 1: Assets --- */}
        <div>
            <h4 style={{textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-secondary)'}}>Assets</h4>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-text-secondary)" tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="year" stroke="var(--color-text-secondary)" />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }} />
                    <Legend />
                    <Bar dataKey="currentAssets" name="Current Assets" stackId="a" fill="#8884d8" />
                    <Bar dataKey="longTermAssets" name="Long-Term Assets" stackId="a" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>
        </div>

        {/* --- Chart 2: Liabilities & Equity --- */}
        <div>
            <h4 style={{textAlign: 'center', marginBottom: '1rem', color: 'var(--color-text-secondary)'}}>Liabilities & Equity</h4>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-text-secondary)" tickFormatter={formatNumber} />
                    <YAxis type="category" dataKey="year" stroke="var(--color-text-secondary)" />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136, 132, 216, 0.1)' }} />
                    <Legend />
                    <Bar dataKey="currentLiabilities" name="Current Liabilities" stackId="b" fill="#FFCB77" />
                    <Bar dataKey="longTermDebt" name="Long-Term Debt" stackId="b" fill="#FE6D73" />
                    <Bar dataKey="equity" name="Equity" stackId="b" fill="#17C3B2" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </ChartGrid>
    </SectionContainer>
  );
};

export default BalanceSheet;