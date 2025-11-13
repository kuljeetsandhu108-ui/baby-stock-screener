import React, { useState, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import Card from '../common/Card';

// --- Styled Components ---

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const Loader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--color-primary);
  animation: ${fadeIn} 0.5s ease-in;
`;

const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto; /* Allows horizontal scrolling on small screens */
  animation: ${fadeIn} 0.5s ease-in;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: right;
`;

const TableHeader = styled.th`
  padding: 1rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: color 0.2s ease;
  white-space: nowrap;

  &:first-child {
    text-align: left;
  }

  &:hover {
    color: var(--color-text-primary);
  }
`;

const TableRow = styled.tr`
  /* Highlight the row for the main symbol being analyzed */
  background-color: ${({ isMainSymbol }) => isMainSymbol ? 'rgba(88, 166, 255, 0.1)' : 'transparent'};
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }
`;

const TableCell = styled.td`
  padding: 1rem;
  font-size: 0.95rem;
  font-family: 'Roboto Mono', monospace; /* Use a monospaced font for numerical data */

  &:first-child {
    font-weight: 600;
    color: var(--color-text-primary);
    text-align: left;
    font-family: 'Inter', sans-serif; /* Use the standard font for the symbol name */
  }
`;

// --- Helper Functions to Format Data ---

const formatMarketCap = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  if (Math.abs(num) >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  return num.toLocaleString();
};

const formatPercent = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return `${(num * 100).toFixed(2)}%`;
};

const formatNumber = (num) => {
  if (num === null || num === undefined || isNaN(num)) return 'N/A';
  return num.toFixed(2);
};

// --- The Definitive, Robust React Component ---

const PeersComparison = ({ symbol }) => {
  const [peersData, setPeersData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'marketCap', direction: 'descending' });

  useEffect(() => {
    const fetchPeersData = async () => {
      if (!symbol) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get(`/api/stocks/${symbol}/peers`);
        setPeersData(response.data);
      } catch (error) {
        console.error("Failed to fetch peers data:", error);
        setPeersData([]);
      } finally {
        setIsLoading(false);
      }
    };
    // Add a small delay to this lazy-loaded fetch.
    const timer = setTimeout(fetchPeersData, 300);
    return () => clearTimeout(timer);
  }, [symbol]);

  // This is the logic for sorting the table's columns.
  const sortedPeers = useMemo(() => {
    let sortableItems = [...peersData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // This robust logic checks for both FMP's key and Yahoo's key.
        const aValue = a[sortConfig.key] || a[sortConfig.key.replace('TTM', '')] || 0;
        const bValue = b[sortConfig.key] || b[sortConfig.key.replace('TTM', '')] || 0;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [peersData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- Render Logic ---

  if (isLoading) {
    return (
      <Card title="Peers Comparison">
        <Loader>Finding and analyzing peers with AI...</Loader>
      </Card>
    );
  }

  if (!peersData || peersData.length <= 1) {
    return (
      <Card title="Peers Comparison">
        <p>Peer comparison data is not available for this stock.</p>
      </Card>
    );
  }

  return (
    <Card title="Peers Comparison">
      <TableContainer>
        <StyledTable>
          <thead>
            <tr>
              <TableHeader onClick={() => requestSort('symbol')}>Symbol</TableHeader>
              <TableHeader onClick={() => requestSort('marketCap')}>Market Cap</TableHeader>
              <TableHeader onClick={() => requestSort('peRatioTTM')}>P/E Ratio (TTM)</TableHeader>
              <TableHeader onClick={() => requestSort('revenueGrowth')}>Revenue Growth</TableHeader>
              <TableHeader onClick={() => requestSort('grossMargins')}>Gross Margin</TableHeader>
            </tr>
          </thead>
          <tbody>
            {sortedPeers.map(peer => (
              <TableRow key={peer.symbol} isMainSymbol={peer.symbol === symbol}>
                <TableCell>{peer.symbol}</TableCell>
                {/* This is the ultimate robust display logic, checking for both FMP's key and Yahoo's key for every cell */}
                <TableCell>{formatMarketCap(peer.marketCapTTM || peer.marketCap)}</TableCell>
                <TableCell>{formatNumber(peer.peRatioTTM)}</TableCell>
                <TableCell>{formatPercent(peer.revenueGrowthTTM || peer.revenueGrowth)}</TableCell>
                <TableCell>{formatPercent(peer.grossProfitMarginTTM || peer.grossMargins)}</TableCell>
              </TableRow>
            ))}
          </tbody>
        </StyledTable>
      </TableContainer>
    </Card>
  );
};

export default PeersComparison;