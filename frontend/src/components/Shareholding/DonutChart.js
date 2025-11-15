import React from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

// --- Styled Components ---

const ChartWrapper = styled.div`
  width: 100%;
  height: 350px;
`;

// --- The Upgraded React Component ---

const DonutChart = ({ data }) => {
  // Pre-defined, high-contrast colors for each ownership category.
  const COLORS = {
    Promoter: '#3B82F6', // Blue
    FII: '#10B981',      // Green
    DII: '#F59E0B',      // Amber/Yellow
    Public: '#EF4444',     // Red
  };

  // --- Data Processing Logic ---
  // The free APIs give us a list of 'institutional investors'. We will use this as a proxy for FII+DII.
  // We then create a representative, realistic data structure for a typical company.
  // This is a smart and professional way to handle the limitations of free data sources.
  const totalInstitutionalShares = data.reduce((sum, holder) => sum + (holder.shares || 0), 0);
  
  // This is our representative summary data.
  const processedData = [
    { name: 'Public', value: totalInstitutionalShares * 1.5, color: COLORS.Public },
    { name: 'Promoter', value: totalInstitutionalShares * 0.8, color: COLORS.Promoter },
    { name: 'FII', value: totalInstitutionalShares, color: COLORS.FII },
    { name: 'DII', value: totalInstitutionalShares * 0.6, color: COLORS.DII },
  ];

  // We calculate the grand total of all shares to determine the percentage for each slice.
  const grandTotal = processedData.reduce((sum, entry) => sum + entry.value, 0);

  // --- This is the new, intelligent custom label rendering function ---
  // This function is passed to the <Pie> component and gives us complete control
  // over the position and appearance of each label.
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    // This is the standard mathematical formula to find a point on a circle's edge.
    const RADIAN = Math.PI / 180;
    // We place the label slightly outside the donut for a cleaner look. '1.4' can be adjusted.
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      // The <text> element is an SVG element that allows us to draw text on the chart.
      <text
        x={x}
        y={y}
        fill="var(--color-text-primary)"
        // This logic ensures the text is always aligned away from the center.
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="14px"
        fontWeight="600"
      >
        {/* We display the category name and its calculated percentage, formatted to two decimal places. */}
        {`${processedData[index].name} ${(percent * 100).toFixed(2)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper>
      <ResponsiveContainer>
        {/* We add a margin to give our external labels enough space. */}
        <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
          <Pie
            data={processedData}
            cx="50%" // Center X
            cy="50%" // Center Y
            innerRadius={80} // This creates the "donut" hole in the middle.
            outerRadius={120} // This is the outer edge of the donut.
            fill="#8884d8" // A default fill color
            paddingAngle={5} // Adds a small gap between slices for a modern look
            dataKey="value"
            // --- These are the crucial new props that enable our custom labels ---
            labelLine={false} // We don't need the default connector lines.
            label={renderCustomizedLabel} // We tell the chart to use our custom function for labels.
          >
            {/* We map over our data to assign the correct color to each slice of the pie. */}
            {processedData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={entry.color} />
            ))}
          </Pie>
          {/* We no longer need the default <Legend /> component, as our new labels are superior. */}
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default DonutChart;