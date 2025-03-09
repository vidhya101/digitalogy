import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  CircularProgress,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Drawer,
  Divider,
  Tooltip,
} from '@mui/material';
import { styled, keyframes } from '@mui/system';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'; // Voice interaction
import MicIcon from '@mui/icons-material/Mic'; // Voice icon
import SettingsIcon from '@mui/icons-material/Settings';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import './App.css';

// Define keyframes
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;
const typing = keyframes`
  0% { opacity: 0.3; }
  50% { opacity: 1; }
  100% { opacity: 0.3; }
`;
const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;
const glow = keyframes`
  0% { box-shadow: 0 0 5px rgba(74, 144, 226, 0.5); }
  50% { box-shadow: 0 0 20px rgba(74, 144, 226, 0.8); }
  100% { box-shadow: 0 0 5px rgba(74, 144, 226, 0.5); }
`;

// Styled Components
const ChatContainer = styled(Container)({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)',
  color: '#e0e0e0',
  padding: '20px',
  fontFamily: '"Roboto", sans-serif',
  '@media (max-width: 600px)': { padding: '10px' },
});
const ChatBox = styled(Box)({
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  background: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '15px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  marginBottom: '20px',
});
const Message = styled(Box)(({ sender }) => ({
  marginBottom: '15px',
  padding: '12px 20px',
  borderRadius: '12px',
  maxWidth: '70%',
  background: sender === 'user' ? 'linear-gradient(90deg, #4a90e2, #357abd)' : 'rgba(255, 255, 255, 0.1)',
  color: sender === 'user' ? '#fff' : '#e0e0e0',
  alignSelf: sender === 'user' ? 'flex-end' : 'flex-start',
  animation: `${fadeIn} 0.3s ease-in-out`,
  wordWrap: 'break-word',
  '@media (max-width: 600px)': { maxWidth: '85%' },
}));
const TypingIndicator = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  color: '#4a90e2',
  animation: `${typing} 1.5s infinite`,
});
const InputBox = styled(Box)({
  display: 'flex',
  gap: '10px',
  background: 'rgba(255, 255, 255, 0.05)',
  padding: '10px',
  borderRadius: '10px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  '@media (max-width: 600px)': { flexDirection: 'column', gap: '5px' },
});
const DashboardPreview = styled(Box)({
  padding: '20px',
  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.1))',
  borderRadius: '15px',
  marginTop: '10px',
  position: 'relative',
  border: '1px solid rgba(74, 144, 226, 0.2)',
  animation: `${glow} 3s infinite`,
});
const SliderBox = styled(Box)({
  padding: '10px',
  background: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '10px',
  marginBottom: '10px',
});
const Sidebar = styled(Drawer)({
  '& .MuiDrawer-paper': {
    width: 300,
    background: 'linear-gradient(135deg, #1b263b 0%, #0d1b2a 100%)',
    color: '#e0e0e0',
    padding: '20px',
  },
});
const StyledTextField = styled(TextField)({
  '& .MuiInputBase-root': {
    color: '#fff',
    background: 'transparent',
    borderRadius: '8px',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255, 255, 255, 0.3)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' },
  '& .MuiInputLabel-root': { color: '#e0e0e0' },
});
const StyledButton = styled(Button)({
  background: 'linear-gradient(90deg, #4a90e2, #357abd)',
  color: '#fff',
  padding: '10px 20px',
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 'bold',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  transition: 'all 0.3s ease',
  '&:hover': {
    background: 'linear-gradient(90deg, #357abd, #4a90e2)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
  },
  animation: `${pulse} 2s infinite`,
});
const FileUploadBox = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  width: '100%',
});
const HiddenInput = styled('input')({
  display: 'none',
});
const ZoomLens = styled(Box)({
  position: 'absolute',
  width: '150px',
  height: '150px',
  borderRadius: '50%',
  border: '2px solid #4a90e2',
  background: 'radial-gradient(circle, rgba(74, 144, 226, 0.2), transparent)',
  pointerEvents: 'none',
  transform: 'scale(0)',
  transition: 'transform 0.2s ease',
  '&.active': {
    transform: 'scale(1)',
  },
});

// Create Plotly component
const Plot = createPlotlyComponent(Plotly);

// AI-like chart type suggestion logic
const suggestChartType = (data) => {
  if (!data || !data.top5 || data.top5.length === 0) return 'bar';
  const numericalFields = Object.keys(data.top5[0] || {}).filter(key => !isNaN(data.top5[0][key]));
  const categoricalFields = Object.keys(data.top5[0] || {}).filter(key => isNaN(data.top5[0][key]));

  if (numericalFields.length >= 2) return 'scatter';
  else if (categoricalFields.length > 0 && numericalFields.length > 0) return 'bar';
  else if (numericalFields.length === 1) return 'pie';
  return 'line';
};

function App() {
  const [messages, setMessages] = useState([
    {
      text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Greetings! I’m Digitalogy, your advanced AI assistant. Upload a CSV/Excel/PDF file to create a dashboard or ask me anything! Type 'open dashboard' for advanced analytics. Use the mic to speak your commands!`,
      sender: 'bot',
    },
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [ws, setWs] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(50);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customizations, setCustomizations] = useState({
    xAxisField: '',
    yAxisField: '',
    xAxisTitle: '',
    yAxisTitle: '',
    chartColor: '#4a90e2',
    titleAlignment: 'center',
    xAxisSize: 12,
    yAxisSize: 12,
    chartType: 'bar',
    enable3D: false,
    texture: 'none',
  });
  const [fields, setFields] = useState([]);
  const [isZoomLensActive, setIsZoomLensActive] = useState(false);
  const [lensPosition, setLensPosition] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const chartRef = useRef(null);
  const plotRef = useRef(null);

  // Voice interaction setup
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (transcript && !listening) {
      setInput(transcript);
      handleSend();
      resetTranscript();
    }
  }, [transcript, listening]);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:5001');
    setWs(socket);

    socket.onopen = () => console.log('WebSocket connected');
    socket.onmessage = (event) => {
      setIsTyping(false);
      const data = JSON.parse(event.data);
      setMessages((prev) => {
        const lastMessage = prev[prev.length - 1];
        if (
          lastMessage.sender === 'bot' &&
          prev.length > 1 &&
          !lastMessage.text.includes('Mistral unavailable') &&
          !lastMessage.text.includes('Hugging Face unavailable')
        ) {
          return [...prev.slice(0, -1), { text: data.response, sender: 'bot' }];
        }
        return [...prev, { text: data.response, sender: 'bot' }];
      });
      if (data.dashboard) {
        setDashboard(data.dashboard);
        const rawData = data.dashboard.plotData[0]?.labels || data.dashboard.plotData[0]?.x || [];
        const uniqueFields = [...new Set(rawData.map((_, i) => Object.keys(data.dashboard.top5[0] || {})).flat())];
        setFields(uniqueFields);
        setCustomizations((prev) => ({
          ...prev,
          xAxisField: uniqueFields[0] || '',
          yAxisField: uniqueFields[1] || '',
          xAxisTitle: uniqueFields[0] || '',
          yAxisTitle: uniqueFields[1] || '',
          chartType: suggestChartType(data.dashboard),
        }));
      }
    };
    socket.onclose = () => console.log('WebSocket disconnected');

    return () => socket.close();
  }, []);

  const handleSend = () => {
    if (!input.trim() && !file) return;

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
    const userMessage = { text: `[${timestamp}] ${input || 'File uploaded'}`, sender: 'user' };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsTyping(true);

    if (ws && ws.readyState === WebSocket.OPEN) {
      const fileData = file
        ? { name: file.name, data: file.dataUrl.split(',')[1], type: file.type }
        : null;
      ws.send(JSON.stringify({ message: input, file: fileData }));

      if (input.toLowerCase().includes('open dashboard')) {
        window.open('http://localhost:8501', '_blank');
      }
    }

    if (file) {
      console.log(`[${timestamp}] File uploaded:`, file.name);
      setFile(null);
    }
  };

  const handleGenerateDashboard = () => {
    if (!messages.some((m) => m.text.includes('File uploaded'))) {
      setMessages((prev) => [
        ...prev,
        {
          text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Please upload a CSV/Excel/PDF file first to generate a dashboard.`,
          sender: 'bot',
        },
      ]);
      return;
    }
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
    setMessages((prev) => [
      ...prev,
      { text: `[${timestamp}] Generating dashboard...`, sender: 'user' },
    ]);
    setIsTyping(true);
    ws.send(JSON.stringify({ message: 'Generate dashboard', file: null }));
  };

  const handleDownloadDashboard = () => {
    if (!dashboard) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
      </head>
      <body>
        <div id="plotly-div"></div>
        <script>
          const data = ${JSON.stringify(dashboard.plotData)};
          const layout = ${JSON.stringify(dashboard.layout)};
          Plotly.newPlot('plotly-div', data, layout);
          const top5 = ${JSON.stringify(dashboard.top5)};
          let tableHtml = '<h3>Top 5 Values</h3><table border="1"><tr>';
          Object.keys(top5[0]).forEach(key => tableHtml += '<th>' + key + '</th>');
          tableHtml += '</tr>';
          top5.forEach(row => {
            tableHtml += '<tr>';
            Object.values(row).forEach(val => tableHtml += '<td>' + val + '</td>');
            tableHtml += '</tr>';
          });
          tableHtml += '</table>';
          document.body.innerHTML += tableHtml;
        </script>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${dashboard.name}.html`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setMessages((prev) => [
          ...prev,
          {
            text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Error: Please upload a valid CSV, Excel, or PDF file.`,
            sender: 'bot',
          },
        ]);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFile({
          name: selectedFile.name,
          dataUrl: reader.result,
          type: selectedFile.type,
        });
        handleSend();
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleAutoEnhance = () => {
    if (!dashboard || !dashboard.top5 || dashboard.top5.length === 0 || !dashboard.plotData || dashboard.plotData.length === 0) {
      setMessages((prev) => [
        ...prev,
        {
          text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Error: No valid dashboard data to enhance.`,
          sender: 'bot',
        },
      ]);
      return;
    }

    const suggestedChartType = suggestChartType(dashboard);
    setCustomizations((prev) => ({
      ...prev,
      chartType: suggestedChartType,
      chartColor: '#ff6f61',
      enable3D: true,
      texture: 'gradient',
    }));
    handleCustomizeDashboard();
    setMessages((prev) => [
      ...prev,
      {
        text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Dashboard enhanced with AI! Suggested chart: ${suggestedChartType}.`,
        sender: 'bot',
      },
    ]);
  };

  const handleCustomizeDashboard = () => {
    if (!dashboard || !dashboard.plotData || dashboard.plotData.length === 0) {
      console.error('No dashboard data available for customization');
      return;
    }

    // Validate and sanitize plot data
    const updatedPlotData = dashboard.plotData.map((trace) => {
      if (!trace) return { x: [], y: [], type: 'scatter' }; // Fallback trace
      const baseTrace = {
        ...trace,
        type: customizations.chartType === 'donut' ? 'pie' : customizations.chartType,
        ...(customizations.chartType === 'donut' && { hole: 0.4 }),
        marker: {
          ...trace.marker,
          color: customizations.chartColor,
          ...(customizations.texture === 'gradient' && {
            gradient: { type: 'vertical', color: customizations.chartColor },
          }),
        },
      };

      if (customizations.enable3D) {
        if (customizations.chartType === 'bar') {
          return { ...baseTrace, type: 'bar', opacity: 0.8 };
        } else if (customizations.chartType === 'scatter') {
          return { ...baseTrace, type: 'scatter3d', mode: 'markers' };
        }
      }

      const xField = customizations.xAxisField || (dashboard.plotData[0]?.x ? Object.keys(dashboard.top5[0])[0] : 'Index');
      const yField = customizations.yAxisField || (dashboard.plotData[0]?.y ? Object.keys(dashboard.top5[0])[1] : 'Value');
      return {
        ...baseTrace,
        x: customizations.xAxisField ? dashboard.top5.map(row => row[xField] || 0) : trace.x || [],
        y: customizations.yAxisField ? dashboard.top5.map(row => row[yField] || 0) : trace.y || [],
      };
    }).filter(trace => trace);

    const updatedLayout = {
      ...dashboard.layout,
      xaxis: {
        ...dashboard.layout.xaxis,
        title: customizations.xAxisTitle || dashboard.layout.xaxis.title,
        tickfont: { size: customizations.xAxisSize },
      },
      yaxis: {
        ...dashboard.layout.yaxis,
        title: customizations.yAxisTitle || dashboard.layout.yaxis.title,
        tickfont: { size: customizations.yAxisSize },
      },
      title: {
        ...dashboard.layout.title,
        x: customizations.titleAlignment === 'left' ? 0 : customizations.titleAlignment === 'right' ? 1 : 0.5,
      },
      scene: customizations.enable3D ? {
        xaxis: { title: customizations.xAxisTitle || dashboard.layout.xaxis.title },
        yaxis: { title: customizations.yAxisTitle || dashboard.layout.yaxis.title },
        zaxis: { title: 'Value' },
      } : undefined,
      plot_bgcolor: customizations.texture === 'gradient' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0)',
      paper_bgcolor: 'rgba(0, 0, 0, 0)',
    };

    // Ensure chartRef exists before proceeding
    if (!chartRef.current || !plotRef.current) {
      console.error('Chart container or Plotly instance not found');
      setMessages((prev) => [
        ...prev,
        {
          text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Error: Chart container not found. Please regenerate the dashboard.`,
          sender: 'bot',
        },
      ]);
      return;
    }

    // Force Plotly re-render with proper cleanup
    try {
      Plotly.purge(plotRef.current); // Clear previous chart state
      Plotly.newPlot(chartRef.current, updatedPlotData, updatedLayout).then(() => {
        setDashboard((prev) => ({
          ...prev,
          plotData: updatedPlotData,
          layout: updatedLayout,
        }));
      }).catch((err) => {
        console.error('Plotly.newPlot error:', err);
        setMessages((prev) => [
          ...prev,
          {
            text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Error updating chart: ${err.message}. Falling back to default render.`,
            sender: 'bot',
          },
        ]);
        setDashboard((prev) => ({
          ...prev,
          plotData: updatedPlotData,
          layout: updatedLayout,
        }));
      });
    } catch (err) {
      console.error('Plotly rendering failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          text: `[${new Date().toLocaleTimeString('en-US', { hour12: true })}] Error rendering chart: ${err.message}. Please try again.`,
          sender: 'bot',
        },
      ]);
    }
  };

  const handleResetDashboard = () => {
    ws.send(JSON.stringify({ message: 'Generate dashboard', file: null }));
  };

  const handleMouseMove = (e) => {
    if (isZoomLensActive && chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 75;
      const y = e.clientY - rect.top - 75;
      setLensPosition({ x, y });
    }
  };

  return (
    <ChatContainer maxWidth="lg">
      <Typography
        variant="h4"
        align="center"
        gutterBottom
        sx={{ color: '#4a90e2', fontWeight: 'bold', letterSpacing: '1px', textShadow: '0 0 10px rgba(74, 144, 226, 0.5)' }}
      >
        Digitalogy - Your Cosmic AI Assistant
      </Typography>
      <ChatBox>
        {messages.map((msg, index) => (
          <Message key={index} sender={msg.sender}>
            <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
          </Message>
        ))}
        {isTyping && (
          <TypingIndicator>
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
            Digitalogy is processing...
          </TypingIndicator>
        )}
      </ChatBox>
      {dashboard && (
        <DashboardPreview onMouseMove={handleMouseMove}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#4a90e2', textShadow: '0 0 5px rgba(74, 144, 226, 0.3)' }}>
              {dashboard.title}
            </Typography>
            <Box>
              <Tooltip title="Auto-Enhance with AI">
                <IconButton onClick={handleAutoEnhance}>
                  <AutoAwesomeIcon sx={{ color: '#4a90e2' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom In Lens">
                <IconButton onClick={() => setIsZoomLensActive(true)}>
                  <ZoomInIcon sx={{ color: '#4a90e2' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out Lens">
                <IconButton onClick={() => setIsZoomLensActive(false)}>
                  <ZoomOutIcon sx={{ color: '#4a90e2' }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Customize Dashboard">
                <IconButton onClick={() => setIsSidebarOpen(true)}>
                  <SettingsIcon sx={{ color: '#4a90e2' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <SliderBox>
            <Typography variant="body2" sx={{ color: '#e0e0e0' }}>
              Adjust Chart Zoom
            </Typography>
            <Slider
              value={zoomLevel}
              onChange={(e, newValue) => setZoomLevel(newValue)}
              min={10}
              max={100}
              sx={{ color: '#4a90e2' }}
            />
          </SliderBox>
          <Box ref={chartRef} sx={{ position: 'relative' }}>
            <Plot
              ref={plotRef}
              data={dashboard.plotData}
              layout={{
                ...dashboard.layout,
                width: 800 * (zoomLevel / 50),
                height: 500 * (zoomLevel / 50),
                plot_bgcolor: 'rgba(0, 0, 0, 0)',
                paper_bgcolor: 'rgba(0, 0, 0, 0)',
              }}
              config={{
                responsive: true,
                displayModeBar: false,
                staticPlot: false,
              }}
              onError={(err) => console.error('Plotly Error:', err)}
            />
            <ZoomLens
              className={isZoomLensActive ? 'active' : ''}
              sx={{ left: lensPosition.x, top: lensPosition.y }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: '#e0e0e0', mt: 1 }}>
            Top 5: {JSON.stringify(dashboard.top5)}
          </Typography>
          <StyledButton variant="contained" onClick={handleDownloadDashboard} sx={{ mt: 1 }}>
            Download Dashboard
          </StyledButton>
        </DashboardPreview>
      )}
      <InputBox>
        <StyledTextField
          fullWidth
          variant="outlined"
          placeholder="Speak or type your command..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <IconButton onClick={() => SpeechRecognition.startListening()} disabled={listening}>
          <MicIcon sx={{ color: listening ? '#ff4444' : '#4a90e2' }} />
        </IconButton>
        <FileUploadBox>
          <HiddenInput
            type="file"
            accept=".csv,.xls,.xlsx,.pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
          />
          <StyledButton variant="outlined" onClick={handleUploadClick}>
            Upload File
          </StyledButton>
          {file && (
            <Typography variant="body2" sx={{ color: '#4a90e2' }}>
              Selected: {file.name}
            </Typography>
          )}
        </FileUploadBox>
        <StyledButton variant="contained" onClick={handleSend}>
          Send
        </StyledButton>
        <StyledButton variant="contained" onClick={handleGenerateDashboard}>
          Generate Dashboard
        </StyledButton>
      </InputBox>

      {/* Sidebar for Dashboard Customization */}
      <Sidebar anchor="right" open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Customize Dashboard
        </Typography>
        <Divider sx={{ background: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>Chart Type</InputLabel>
          <Select
            value={customizations.chartType}
            onChange={(e) => setCustomizations({ ...customizations, chartType: e.target.value })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            <MenuItem value="bar">Bar</MenuItem>
            <MenuItem value="line">Line</MenuItem>
            <MenuItem value="pie">Pie</MenuItem>
            <MenuItem value="donut">Donut</MenuItem>
            <MenuItem value="scatter">Scatter</MenuItem>
            <MenuItem value="area">Area</MenuItem>
            <MenuItem value="gauge">Gauge</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>X-Axis Field</InputLabel>
          <Select
            value={customizations.xAxisField}
            onChange={(e) => setCustomizations({ ...customizations, xAxisField: e.target.value })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            {fields.map((field) => (
              <MenuItem key={field} value={field}>{field}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>Y-Axis Field</InputLabel>
          <Select
            value={customizations.yAxisField}
            onChange={(e) => setCustomizations({ ...customizations, yAxisField: e.target.value })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            {fields.map((field) => (
              <MenuItem key={field} value={field}>{field}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <StyledTextField
          label="X-Axis Title"
          value={customizations.xAxisTitle}
          onChange={(e) => setCustomizations({ ...customizations, xAxisTitle: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
        />
        <StyledTextField
          label="Y-Axis Title"
          value={customizations.yAxisTitle}
          onChange={(e) => setCustomizations({ ...customizations, yAxisTitle: e.target.value })}
          fullWidth
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>Title Alignment</InputLabel>
          <Select
            value={customizations.titleAlignment}
            onChange={(e) => setCustomizations({ ...customizations, titleAlignment: e.target.value })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            <MenuItem value="left">Left</MenuItem>
            <MenuItem value="center">Center</MenuItem>
            <MenuItem value="right">Right</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
          Chart Color
        </Typography>
        <input
          type="color"
          value={customizations.chartColor}
          onChange={(e) => setCustomizations({ ...customizations, chartColor: e.target.value })}
          style={{ marginBottom: '20px', width: '100%' }}
        />
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>Texture</InputLabel>
          <Select
            value={customizations.texture}
            onChange={(e) => setCustomizations({ ...customizations, texture: e.target.value })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="gradient">Gradient</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel sx={{ color: '#e0e0e0' }}>Enable 3D</InputLabel>
          <Select
            value={customizations.enable3D ? 'yes' : 'no'}
            onChange={(e) => setCustomizations({ ...customizations, enable3D: e.target.value === 'yes' })}
            sx={{ color: '#e0e0e0', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#4a90e2' } }}
          >
            <MenuItem value="yes">Yes</MenuItem>
            <MenuItem value="no">No</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
          X-Axis Font Size
        </Typography>
        <Slider
          value={customizations.xAxisSize}
          onChange={(e, newValue) => setCustomizations({ ...customizations, xAxisSize: newValue })}
          min={8}
          max={20}
          sx={{ color: '#4a90e2', mb: 2 }}
        />
        <Typography variant="body2" sx={{ color: '#e0e0e0', mb: 1 }}>
          Y-Axis Font Size
        </Typography>
        <Slider
          value={customizations.yAxisSize}
          onChange={(e, newValue) => setCustomizations({ ...customizations, yAxisSize: newValue })}
          min={8}
          max={20}
          sx={{ color: '#4a90e2', mb: 2 }}
        />
        <StyledButton
          variant="contained"
          onClick={() => {
            handleCustomizeDashboard();
            setIsSidebarOpen(false);
          }}
          sx={{ mb: 1 }}
        >
          Apply Changes
        </StyledButton>
        <StyledButton
          variant="outlined"
          onClick={handleResetDashboard}
          startIcon={<RefreshIcon />}
        >
          Reset Dashboard
        </StyledButton>
      </Sidebar>
    </ChatContainer>
  );
}

export default App;