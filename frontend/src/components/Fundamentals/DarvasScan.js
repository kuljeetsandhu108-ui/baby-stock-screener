import React from 'react';
import styled from 'styled-components';

// --- Styled Components ---

const ScanContainer = styled.div`
  /* Main container for the Darvas Scan section */
`;

const StatusValue = styled.span`
  font-size: 2rem;
  font-weight: 700;
  /* Dynamically sets the color based on the scan result */
  color: ${({ result }) => {
    if (result === 'Pass') return 'var(--color-success)';
    if (result === 'Fail') return 'var(--color-danger)';
    return 'var(--color-primary)';
  }};
`;

const MessageText = styled.p`
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-top: 0.5rem;
`;

const BoxInfoGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
`;

const BoxInfoItem = styled.div`
  background-color: var(--color-background);
  padding: 1rem;
  border-radius: 8px;
`;

const BoxLabel = styled.div`
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
`;

const BoxValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
`;

// --- Intelligent Currency Helper Function ---
const getCurrencySymbol = (currencyCode) => {
    switch (currencyCode) {
        case 'INR':
            return '₹';
        case 'USD':
            return '$';
        case 'JPY':
            return '¥';
        // Add more currencies as needed
        default:
            return '$'; // Default to dollar if currency is unknown
    }
};

// --- The Final, Corrected React Component ---

// It now accepts the 'currency' prop from its parent, Fundamentals.js
const DarvasScan = ({ scanData, currency }) => {

  // If the data from the backend is missing, show an informative message.
  if (!scanData || !scanData.status) {
    return (
      <ScanContainer>
        <p>Darvas Scan data is not available for this stock.</p>
      </ScanContainer>
    );
  }

  const { status, message, box_top, box_bottom, result } = scanData;
  
  // Get the correct currency symbol to display.
  const currencySymbol = getCurrencySymbol(currency);

  return (
    <ScanContainer>
      <StatusValue result={result}>{status}</StatusValue>
      <MessageText>{message}</MessageText>

      {/* Only show the Box Top/Bottom info if a valid box has been identified by the backend. */}
      {box_top && box_bottom && (
        <BoxInfoGrid>
          <BoxInfoItem>
            <BoxLabel>Box Top (Resistance)</BoxLabel>
            {/* --- UPDATED: Use the dynamic currency symbol --- */}
            <BoxValue>{currencySymbol}{box_top.toFixed(2)}</BoxValue>
          </BoxInfoItem>
          <BoxInfoItem>
            <BoxLabel>Box Bottom (Support)</BoxLabel>
            {/* --- UPDATED: Use the dynamic currency symbol --- */}
            <BoxValue>{currencySymbol}{box_bottom.toFixed(2)}</BoxValue>
          </BoxInfoItem>
        </BoxInfoGrid>
      )}
    </ScanContainer>
  );
};

export default DarvasScan;