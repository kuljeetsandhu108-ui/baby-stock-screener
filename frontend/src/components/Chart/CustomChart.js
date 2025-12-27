import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  createChart, 
  ColorType, 
  CrosshairMode, 
  CandlestickSeries, 
  HistogramSeries,
  LineSeries
} from 'lightweight-charts';
import styled from 'styled-components';
import axios from 'axios';
// --- MATH LIBRARY FOR INDICATORS ---
import { RSI, MACD, StochasticRSI, SMA, EMA } from 'technicalindicators';
import { FaLayerGroup, FaTimes, FaPlus } from 'react-icons/fa';

// --- STYLED COMPONENTS ---

const ChartWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 600px; /* Tall enough for indicators */
  background-color: #0D1117;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
`;

const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #161B22;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
  gap: 10px;
`;

const LeftGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const RangeButton = styled.button`
  background: ${({ active }) => active ? 'var(--color-primary)' : 'transparent'};
  color: ${({ active }) => active ? '#fff' : 'var(--color-text-secondary)'};
  border: 1px solid ${({ active }) => active ? 'var(--color-primary)' : 'transparent'};
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ active }) => active ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'};
    color: #fff;
  }
`;

const IndicatorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  position: relative;

  &:hover {
    background: rgba(255,255,255,0.1);
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 40px;
  left: 0;
  background: #1C2128;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  z-index: 50;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 200px;
`;

const InputGroup = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
`;

const StyledInput = styled.input`
  background: #0D1117;
  border: 1px solid var(--color-border);
  color: white;
  padding: 4px;
  border-radius: 4px;
  width: 60px;
  font-size: 0.8rem;
`;

const AddButton = styled.button`
  background: var(--color-success);
  border: none;
  color: white;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  margin-top: 5px;
  font-size: 0.8rem;
  
  &:hover { opacity: 0.9; }
`;

const ActiveIndicatorsList = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  align-items: center;
  
  &::-webkit-scrollbar { display: none; }
`;

const IndicatorTag = styled.div`
  background: rgba(56, 139, 253, 0.15);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const CloseIcon = styled(FaTimes)`
  cursor: pointer;
  &:hover { color: #fff; }
`;

const ChartContainer = styled.div`
  flex-grow: 1;
  width: 100%;
`;

const StatusText = styled.span`
  font-size: 0.75rem;
  color: ${({ isLive }) => isLive ? '#3FB950' : 'var(--color-text-secondary)'};
  margin-left: auto;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const PulseDot = styled.div`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #3FB950;
  box-shadow: 0 0 5px #3FB950;
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

// --- MAIN COMPONENT ---

const CustomChart = ({ symbol }) => {
  const chartContainerRef = useRef();
  
  // Refs to hold instances (Mutable, doesn't trigger render)
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  
  // State
  const [timeframe, setTimeframe] = useState('1D'); 
  const [chartData, setChartData] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [isLive, setIsLive] = useState(false);
  
  // Indicator Inputs
  const [selectedInd, setSelectedInd] = useState('SMA');
  const [param1, setParam1] = useState(20);
  const [param2, setParam2] = useState(26);
  const [param3, setParam3] = useState(9);

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Force cleanup existing chart
    chartContainerRef.current.innerHTML = '';

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0D1117' },
        textColor: '#8B949E',
      },
      grid: {
        vertLines: { color: '#21262D' },
        horzLines: { color: '#21262D' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { borderColor: '#30363D', timeVisible: true },
      rightPriceScale: { borderColor: '#30363D' },
    });

    // Main Candle Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#3FB950', downColor: '#F85149',
      borderVisible: false, wickUpColor: '#3FB950', wickDownColor: '#F85149',
    });

    // Volume Series (Overlay at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // Overlay on main scale
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // RESIZE OBSERVER (Solves the "Invisible Chart" bug)
    const resizeObserver = new ResizeObserver(entries => {
        if (!chartRef.current) return;
        const newRect = entries[0].contentRect;
        if (newRect.width > 0 && newRect.height > 0) {
            chartRef.current.applyOptions({ 
                width: newRect.width, 
                height: newRect.height 
            });
            chartRef.current.timeScale().fitContent(); 
        }
    });
    
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // --- 2. DATA FETCHING ---
  const fetchData = useCallback(async () => {
    if (!symbol) return;
    try {
      // Use our new robust FMP/Yahoo hybrid endpoint
      const response = await axios.get(`/api/stocks/${symbol}/chart?range=${timeframe}`);
      const data = response.data;

      if (chartRef.current && data.length > 0) {
        setChartData(data); // Store for indicators calculation
        
        candleSeriesRef.current.setData(data);
        
        const volData = data.map(d => ({
          time: d.time,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(63, 185, 80, 0.4)' : 'rgba(248, 81, 73, 0.4)'
        }));
        volumeSeriesRef.current.setData(volData);
        setIsLive(true);
      }
    } catch (err) {
      console.error("Chart Error:", err);
      setIsLive(false);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Live poll 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  // --- 3. INDICATOR LOGIC ---
  const addIndicator = () => {
    if (!chartData.length || !chartRef.current) return;

    const closePrices = chartData.map(d => d.close);
    const id = Date.now();
    let newSeries = [];
    
    // Generate a unique Pane ID for oscillators
    let paneId = `pane_${id}`;

    try {
      if (selectedInd === 'SMA') {
        const period = parseInt(param1);
        const smaRes = SMA.calculate({ period, values: closePrices });
        const smaData = [];
        
        // Align data (indicators are shorter than price history)
        for (let i = 0; i < smaRes.length; i++) {
            const dataIndex = chartData.length - 1 - i;
            const resIndex = smaRes.length - 1 - i;
            if (dataIndex >= 0) {
                smaData.unshift({ time: chartData[dataIndex].time, value: smaRes[resIndex] });
            }
        }
        
        // Overlay (no priceScaleId)
        const smaSeries = chartRef.current.addSeries(LineSeries, { 
            color: '#FF9800', lineWidth: 2, title: `SMA ${period}` 
        });
        smaSeries.setData(smaData);
        newSeries.push(smaSeries);
      }
      else if (selectedInd === 'EMA') {
        const period = parseInt(param1);
        const emaRes = EMA.calculate({ period, values: closePrices });
        const emaData = [];
        for (let i = 0; i < emaRes.length; i++) {
            const dataIndex = chartData.length - 1 - i;
            const resIndex = emaRes.length - 1 - i;
            if (dataIndex >= 0) emaData.unshift({ time: chartData[dataIndex].time, value: emaRes[resIndex] });
        }
        // Overlay
        const emaSeries = chartRef.current.addSeries(LineSeries, { 
            color: '#2962FF', lineWidth: 2, title: `EMA ${period}` 
        });
        emaSeries.setData(emaData);
        newSeries.push(emaSeries);
      }
      else if (selectedInd === 'RSI') {
        const rsiValues = RSI.calculate({ values: closePrices, period: parseInt(param1) });
        const rsiData = [];
        for (let i = 0; i < rsiValues.length; i++) {
            const dataIndex = chartData.length - 1 - i;
            const rsiIndex = rsiValues.length - 1 - i;
            if (dataIndex >= 0) rsiData.unshift({ time: chartData[dataIndex].time, value: rsiValues[rsiIndex] });
        }
        
        // Separate Pane
        const rsiSeries = chartRef.current.addSeries(LineSeries, { 
            color: '#A855F7', lineWidth: 2, priceScaleId: paneId, title: `RSI (${param1})` 
        });
        rsiSeries.setData(rsiData);
        newSeries.push(rsiSeries);
        
        // Configure Pane (Bottom)
        chartRef.current.priceScale(paneId).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      } 
      else if (selectedInd === 'MACD') {
        const macdInput = { 
            values: closePrices, fastPeriod: parseInt(param1), slowPeriod: parseInt(param2), 
            signalPeriod: parseInt(param3), SimpleMAOscillator: false, SimpleMASignal: false 
        };
        const macdRes = MACD.calculate(macdInput);
        const macdLine = []; const signalLine = []; const histogram = [];

        for(let i=0; i<macdRes.length; i++){
            const dIndex = chartData.length - 1 - i;
            const mIndex = macdRes.length - 1 - i;
            if (dIndex >= 0){
                const t = chartData[dIndex].time; const m = macdRes[mIndex];
                macdLine.unshift({ time: t, value: m.MACD });
                signalLine.unshift({ time: t, value: m.signal });
                histogram.unshift({ time: t, value: m.histogram, color: m.histogram >= 0 ? '#26a69a' : '#ef5350' });
            }
        }

        const histSeries = chartRef.current.addSeries(HistogramSeries, { priceScaleId: paneId });
        const mSeries = chartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 2, priceScaleId: paneId });
        const sSeries = chartRef.current.addSeries(LineSeries, { color: '#FF6D00', lineWidth: 2, priceScaleId: paneId });

        histSeries.setData(histogram); mSeries.setData(macdLine); sSeries.setData(signalLine);
        newSeries = [histSeries, mSeries, sSeries];
        
        chartRef.current.priceScale(paneId).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      }
      else if (selectedInd === 'StochRSI') {
          const stochInput = { 
              values: closePrices, rsiPeriod: parseInt(param1), stochasticPeriod: parseInt(param2), kPeriod: 3, dPeriod: 3 
          };
          const stochRes = StochasticRSI.calculate(stochInput);
          const kLine = []; const dLine = [];
          
          for(let i=0; i<stochRes.length; i++){
              const dIndex = chartData.length - 1 - i;
              const sIndex = stochRes.length - 1 - i;
              if (dIndex >= 0) {
                  kLine.unshift({ time: chartData[dIndex].time, value: stochRes[sIndex].k });
                  dLine.unshift({ time: chartData[dIndex].time, value: stochRes[sIndex].d });
              }
          }

          const kSeries = chartRef.current.addSeries(LineSeries, { color: '#2962FF', title: '%K', priceScaleId: paneId });
          const dSeries = chartRef.current.addSeries(LineSeries, { color: '#FF6D00', title: '%D', priceScaleId: paneId });
          
          kSeries.setData(kLine); dSeries.setData(dLine);
          newSeries = [kSeries, dSeries];
          
          chartRef.current.priceScale(paneId).applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
      }

      // Save Indicator State
      const indObj = { 
          id, 
          type: selectedInd, 
          series: newSeries, 
          params: `${param1}${selectedInd === 'SMA' || selectedInd === 'EMA' ? '' : ','+param2+','+param3}` 
      };
      
      setActiveIndicators([...activeIndicators, indObj]);
      setIsMenuOpen(false);

    } catch (e) {
        console.error("Indicator Calculation Error:", e);
    }
  };

  const removeIndicator = (id) => {
      const indToRemove = activeIndicators.find(i => i.id === id);
      if (indToRemove && chartRef.current) {
          indToRemove.series.forEach(s => chartRef.current.removeSeries(s));
          setActiveIndicators(activeIndicators.filter(i => i.id !== id));
      }
  };

  const timeframesList = ['5M', '15M', '1H', '4H', '1D'];

  return (
    <ChartWrapper>
      <Toolbar>
        <LeftGroup>
            {/* Range Selector */}
            <div style={{display:'flex', gap:'4px'}}>
            {timeframesList.map((tf) => (
                <RangeButton key={tf} active={timeframe === tf} onClick={() => setTimeframe(tf)}>
                {tf}
                </RangeButton>
            ))}
            </div>

            {/* Indicator Dropdown */}
            <div style={{position: 'relative'}}>
                <IndicatorButton onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <FaLayerGroup /> Indicators <FaPlus size={10}/>
                </IndicatorButton>
                
                {isMenuOpen && (
                    <Dropdown>
                        <select 
                            style={{background: '#0D1117', color:'white', padding:'5px', borderRadius:'4px', width:'100%'}}
                            value={selectedInd}
                            onChange={(e) => setSelectedInd(e.target.value)}
                        >
                            <option value="SMA">SMA (Simple)</option>
                            <option value="EMA">EMA (Exponential)</option>
                            <option value="RSI">RSI</option>
                            <option value="MACD">MACD</option>
                            <option value="StochRSI">Stoch RSI</option>
                        </select>
                        
                        <div style={{fontSize:'0.8rem', color:'#8b949e'}}>Settings:</div>
                        <InputGroup>
                            <StyledInput type="number" value={param1} onChange={e=>setParam1(e.target.value)} title="Period / Fast" />
                            {['MACD', 'StochRSI'].includes(selectedInd) && (
                                <>
                                <StyledInput type="number" value={param2} onChange={e=>setParam2(e.target.value)} title="Slow" />
                                <StyledInput type="number" value={param3} onChange={e=>setParam3(e.target.value)} title="Signal" />
                                </>
                            )}
                        </InputGroup>

                        <AddButton onClick={addIndicator}>Add Indicator</AddButton>
                    </Dropdown>
                )}
            </div>
        </LeftGroup>

        {/* Live Status */}
        <StatusText isLive={isLive}>
            {isLive && <PulseDot />}
            {isLive ? 'LIVE' : 'CONNECTING...'}
        </StatusText>
      </Toolbar>
        
      {/* Active Chips */}
      {activeIndicators.length > 0 && (
        <div style={{padding: '0 12px 8px 12px', display: 'flex', background: '#161B22', borderBottom: '1px solid #30363D'}}>
            <ActiveIndicatorsList>
                {activeIndicators.map(ind => (
                    <IndicatorTag key={ind.id}>
                        {ind.type} ({ind.params})
                        <CloseIcon onClick={() => removeIndicator(ind.id)} />
                    </IndicatorTag>
                ))}
            </ActiveIndicatorsList>
        </div>
      )}

      <ChartContainer ref={chartContainerRef} />
    </ChartWrapper>
  );
};

export default CustomChart;