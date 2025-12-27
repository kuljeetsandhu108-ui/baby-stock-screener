import React from 'react';
import styled, { keyframes } from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FaChartPie } from 'react-icons/fa'; // Import an icon for the placeholder

// --- Styled Components ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const ChartWrapper = styled.div`
  width: 100%;
  height: 350px;
  position: relative;
`;

// --- NEW: Beautiful Placeholder Styles ---
const PlaceholderContainer = styled.div`
  width: 100%;
  height: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px dashed var(--color-border);
  padding: 2rem;
  text-align: center;
  animation: ${fadeIn} 0.5s ease-in;
`;

const PlaceholderIcon = styled.div`
  font-size: 3rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  opacity: 0.5;
`;

const PlaceholderTitle = styled.h4`
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.5rem;
`;

const DisclaimerText = styled.p`
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 80%;
  margin: 0 auto;
  font-style: italic;
`;

// --- The Upgraded React Component ---

const DonutChart = ({ breakdown }) => {
  // Define our professional color palette.
  const COLORS = {
    Promoter: '#3B82F6', // Blue
    FII: '#10B981',      // Green
    DII: '#F59E0B',      // Amber/Yellow
    Public: '#EF4444',   // Red
  };

  // --- LOGIC CHECK: Do we have valid data? ---
  // If breakdown is missing, empty, or has 'public' as undefined, we treat it as missing.
  const hasData = breakdown && Object.keys(breakdown).length > 0 && breakdown.public !== undefined;

  // If NO data, render the beautiful placeholder
  if (!hasData) {
      return (
          <PlaceholderContainer>
              <PlaceholderIcon>
                  <FaChartPie />
              </PlaceholderIcon>
              <PlaceholderTitle>Data Coming Soon</PlaceholderTitle>
              <DisclaimerText>
                  Detailed shareholding patterns for this specific region are currently being integrated into our system. 
                  <br />
                  This section is a placeholder and will be updated automatically once the data source is live.
              </DisclaimerText>
          </PlaceholderContainer>
      );
  }

  // --- Data Processing (Only runs if we have data) ---
  const chartData = [
    { name: 'Promoter', value: breakdown.promoter, color: COLORS.Promoter },
    { name: 'FII', value: breakdown.fii, color: COLORS.FII },
    { name: 'DII', value: breakdown.dii, color: COLORS.DII },
    { name: 'Public', value: breakdown.public, color: COLORS.Public },
  ].filter(entry => entry.value > 0.01);

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.4; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="var(--color-text-primary)"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="14px"
        fontWeight="600"
      >
        {`${name} ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper>
      <ResponsiveContainer>
        <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
            labelLine={false}
            label={renderCustomizedLabel}
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default DonutChart;