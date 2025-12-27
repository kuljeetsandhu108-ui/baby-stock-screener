import React, { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaCloudUploadAlt, FaMagic } from 'react-icons/fa';

// --- STYLED COMPONENTS & ANIMATIONS ---

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(88, 166, 255, 0.4); }
  70% { transform: scale(1.02); box-shadow: 0 0 10px 20px rgba(88, 166, 255, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(88, 166, 255, 0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const UploaderContainer = styled.div`
  width: 100%;
  max-width: 750px;
  margin-top: 3rem;
  padding: 3rem 2rem;
  
  /* Glassmorphism Background */
  background: linear-gradient(145deg, rgba(22, 27, 34, 0.6), rgba(13, 17, 23, 0.8));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  /* Border and Shadow */
  border: 2px dashed ${({ $isDragActive }) => ($isDragActive ? 'var(--color-primary)' : 'rgba(88, 166, 255, 0.2)')};
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
  
  text-align: center;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: ${fadeIn} 0.8s ease-out;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-5px);
    box-shadow: 0 12px 40px 0 rgba(88, 166, 255, 0.15);
    background: linear-gradient(145deg, rgba(22, 27, 34, 0.8), rgba(13, 17, 23, 0.9));
  }
`;

const IconWrapper = styled.div`
  font-size: 3rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
  transition: color 0.3s ease;

  ${UploaderContainer}:hover & {
    color: var(--color-primary);
  }
`;

const UploadText = styled.p`
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  margin: 0;
  pointer-events: none; /* Ensures the click passes through to container */
  line-height: 1.6;
`;

const HighlightText = styled.span`
  color: var(--color-primary);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
`;

const LoaderText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--color-primary);
  font-size: 1.2rem;
  font-weight: 700;
  animation: ${pulse} 2s infinite;
  
  & svg {
    font-size: 2rem;
  }
`;

const ErrorText = styled.div`
  color: var(--color-danger);
  font-size: 0.95rem;
  font-weight: 500;
  margin-top: 1.5rem;
  background: rgba(248, 81, 73, 0.1);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  display: inline-block;
  border: 1px solid rgba(248, 81, 73, 0.3);
  animation: ${fadeIn} 0.3s ease-in;
`;

// --- MAIN COMPONENT ---

const ChartUploader = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Analyzing Chart Pattern & Sentiment...');
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // --- CORE UPLOAD LOGIC ---
  const handleUpload = useCallback(async (file) => {
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, WEBP).');
        return;
    }

    setIsUploading(true);
    setError('');
    setStatusMessage('Scanning Image for Market Data...');

    const formData = new FormData();
    formData.append('chart_image', file);

    try {
      // 1. Send Image to AI for Analysis & Identification
      const response = await axios.post('/api/charts/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      let { identified_symbol, analysis_data } = response.data;

      if (!identified_symbol || identified_symbol === 'NOT_FOUND') {
        throw new Error('AI could not identify a stock symbol. Please ensure the ticker is visible in the chart.');
      }

      // 2. SMART VERIFICATION STEP
      // The AI might see "TCS", but we need "TCS.NS". We ask our Search API to find the best match.
      setStatusMessage(`Verifying Ticker: ${identified_symbol}...`);
      
      try {
        // Query our own backend search with the AI's guess
        const searchRes = await axios.get(`/api/stocks/search?query=${identified_symbol}`);
        if (searchRes.data.symbol) {
            console.log(`AI Guessed: ${identified_symbol}, Corrected to: ${searchRes.data.symbol}`);
            identified_symbol = searchRes.data.symbol;
        }
      } catch (searchError) {
        console.warn("Symbol verification skipped, using AI guess:", identified_symbol);
      }

      // 3. Navigate to the Stock Page with Data
      // URL Encode to handle symbols like "^NSEI" or "BTC-USD"
      const encodedSymbol = encodeURIComponent(identified_symbol);
      
      // Determine if it looks like an Index (starts with ^) to route correctly
      // Note: Your app seems to handle indices on the same /stock/ route or /index/, adjust if needed.
      // Assuming /stock/ handles everything or using specific logic:
      const isIndex = identified_symbol.startsWith('^');
      const targetRoute = isIndex ? `/index/${encodedSymbol}` : `/stock/${encodedSymbol}`;

      navigate(targetRoute, { 
          state: { chartAnalysis: analysis_data } 
      });

    } catch (err) {
      console.error("Chart analysis failed:", err);
      setError(err.message || 'An error occurred during AI analysis. Please try again.');
      setIsUploading(false);
    }
  }, [navigate]);

  // --- CLIPBOARD PASTE LISTENER (Ctrl+V) ---
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        // Look for items that are images
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          handleUpload(file);
          break; // Stop after finding one image
        }
      }
    };

    // Attach listener to the document
    document.addEventListener('paste', handlePaste);

    // Cleanup listener when component unmounts
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleUpload]);

  // --- DRAG AND DROP HANDLERS ---
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, [handleUpload]);

  // --- CLICK HANDLERS ---
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const onContainerClick = () => {
    if (!isUploading) {
        fileInputRef.current.click();
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <input
        type="file"
        id="chart-upload-input"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileChange}
        accept="image/png, image/jpeg, image/webp"
      />
      
      <UploaderContainer
        onClick={onContainerClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        $isDragActive={isDragActive}
      >
        {isUploading ? (
          <LoaderText>
            <FaMagic />
            <span>{statusMessage}</span>
          </LoaderText>
        ) : (
          <>
            <IconWrapper>
                <FaCloudUploadAlt />
            </IconWrapper>
            <UploadText>
              Drag & Drop, <strong>Paste (Ctrl+V)</strong>, or <HighlightText>Click to Upload</HighlightText> <br/>
              <span style={{fontSize: '0.9rem', opacity: 0.7}}>Supports Screenshots from TradingView, Zerodha, etc.</span>
            </UploadText>
          </>
        )}
      </UploaderContainer>
      
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
};

export default ChartUploader;