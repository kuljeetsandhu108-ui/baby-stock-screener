import React from 'react';
import styled from 'styled-components';
import Card from '../common/Card';
import DonutChart from './DonutChart';
import TrendChart from './TrendChart';
import OwnershipTrend from './OwnershipTrend';

// --- Styled Components ---

const GridContainer = styled.div`
  display: grid;
  /* Create two columns of equal width */
  grid-template-columns: 1fr 1fr; 
  gap: 2rem; /* Space between the two charts */
  align-items: center; /* Vertically align the content */
  
  /* On smaller screens, stack the charts on top of each other */
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const ChartContainer = styled.div`
  width: 100%;
`;

const SectionTitle = styled.h3`
    font-size: 1.2rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    text-align: center;
    margin-bottom: 2rem;
`;

// --- The Upgraded React Component ---

// It now accepts 'historicalStatements' instead of 'historicalOwnership'
const Shareholding = ({ shareholdingData, historicalStatements }) => {

  // Defensive check: If there's no current shareholding data, show a message.
  if (!shareholdingData || !Array.isArray(shareholdingData) || shareholdingData.length === 0) {
    return (
      <Card title="Shareholding">
        <p>Shareholding data is not available for this stock.</p>
      </Card>
    );
  }

  return (
    <Card title="Shareholding">
      {/* --- This top section for summary charts is unchanged --- */}
      <GridContainer>
        <ChartContainer>
          <SectionTitle>Summary</SectionTitle>
          <DonutChart data={shareholdingData} />
        </ChartContainer>
        <ChartContainer>
           <TrendChart />
        </ChartContainer>
      </GridContainer>

      {/* --- THIS IS THE UPDATED PART --- */}
      {/* We now pass the 'historicalStatements' prop to our new OwnershipTrend component. */}
      {/* This component will now render the Shares Outstanding trend chart. */}
      <OwnershipTrend historicalStatements={historicalStatements} />

    </Card>
  );
};

export default Shareholding;