import React from 'react';
import styled from 'styled-components';

// --- Import all our components ---
import Card from '../common/Card';
import RevenueChart from './RevenueChart';
import KeyStats from './KeyStats';
import AboutCompany from './AboutCompany';
// --- NEW: Import our new Balance Sheet component ---
import BalanceSheet from './BalanceSheet';

// --- Styled Components ---

const FinancialsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem; /* Adds space between each section */
`;

// --- The Refactored React Component ---

// It now accepts the new 'balanceSheetData' prop
const Financials = ({ profile, keyStats, financialData, balanceSheetData }) => {
  if (!profile) {
    return (
      <Card>
        <p>Financial data is not available for this stock.</p>
      </Card>
    );
  }

  return (
    <Card>
      <FinancialsContainer>

        {/* --- Section 1: Key Stats (Unchanged) --- */}
        <KeyStats stats={keyStats} />
        
        {/* --- Section 2: Balance Sheet (NEW!) --- */}
        {/* We add our new component here, passing the balance sheet data down to it */}
        <BalanceSheet balanceSheetData={balanceSheetData} />

        {/* --- Section 3: Financials Overview Chart (Unchanged) --- */}
        <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>Income Statement (5-Year Trend)</h3>
            <RevenueChart data={financialData} />
        </div>

        {/* --- Section 4: About the Company (Unchanged) --- */}
        <AboutCompany profile={profile} />

      </FinancialsContainer>
    </Card>
  );
};

export default Financials;