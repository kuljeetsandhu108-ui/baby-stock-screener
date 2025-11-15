import React from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- Styled Components ---

const ChartWrapper = styled.div`
  width: 100%;
  height: 350px;
`;

// --- The New, Intelligent, "Display-Only" React Component ---

// The component now accepts the clean 'breakdown' object from our new backend engine.
const DonutChart = ({ breakdown }) => {
  // Define our professional, high-contrast color palette.
  const COLORS = {
    Promoter: '#3B82F6', // Blue
    FII: '#10B981',      // Green
    DII: '#F59E0B',      // Amber/Yellow
    Public: '#EF4444',     // Red
  };

  // If the breakdown data is missing or incomplete, we show a clear, informative message.
  // We check for 'public' because our reliable Yahoo Finance source will always provide it.
  if (!breakdown || Object.keys(breakdown).length === 0 || breakdown.public === undefined) {
      return (
          <div style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p>Shareholding breakdown is not available.</p>
          </div>
      );
  }

  // --- Data Processing ---
  // We transform the breakdown object from our backend into the array format
  // that the 'recharts' library expects.
  // We also filter out any categories that have a zero or negligible percentage to keep the chart clean.
  const chartData = [
    { name: 'Promoter', value: breakdown.promoter, color: COLORS.Promoter },
    { name: 'FII', value: breakdown.fii, color: COLORS.FII },
    { name: 'DII', value: breakdown.dii, color: COLORS.DII },
    { name: 'Public', value: breakdown.public, color: COLORS.Public },
  ].filter(entry => entry.value > 0.01); // Filter out tiny or zero-value slices


  // --- The Intelligent Custom Label Renderer ---
  // This powerful function gives us pixel-perfect control over the label's appearance and position.
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    // This is the standard mathematical formula to find a point on a circle's edge.
    const RADIAN = Math.PI / 180;
    // We place the label slightly outside the donut for a cleaner, more professional look.
    const radius = outerRadius * 1.4; 
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      // The <text> element is an SVG element that allows us to draw text directly onto the chart canvas.
      <text
        x={x}
        y={y}
        fill="var(--color-text-primary)"
        // This logic ensures the text is always aligned away from the chart's center for readability.
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="14px"
        fontWeight="600"
      >
        {/* We display the category name and its calculated percentage, formatted to one decimal place. */}
        {`${name} ${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <ChartWrapper>
      <ResponsiveContainer>
        {/* We add a margin around the chart to ensure our external labels have enough space and are not cut off. */}
        <PieChart margin={{ top: 40, right: 40, bottom: 40, left: 40 }}>
          <Pie
            data={chartData}
            cx="50%" // Center the pie horizontally
            cy="50%" // Center the pie vertically
            innerRadius={80} // This creates the "donut" hole in the middle.
            outerRadius={120} // This is the outer edge of the donut slices.
            fill="#8884d8" // A default fill color, which will be overridden by our <Cell> components.
            paddingAngle={5} // Adds a small, visually appealing gap between slices.
            dataKey="value" // Tells the chart that the 'value' property should determine the slice size.
            nameKey="name" // Tells the chart that the 'name' property should be used for labels.
            labelLine={false} // We don't need the default connector lines from the slice to the label.
            label={renderCustomizedLabel} // We tell the chart to use our custom function for rendering labels.
          >
            {/* We map over our data to assign the correct, beautiful color to each slice of the pie. */}
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