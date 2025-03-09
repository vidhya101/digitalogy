const express = require('express');
const { Ollama } = require('ollama');
const { textGeneration } = require('@huggingface/inference');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { SimpleLinearRegression } = require('ml-regression-simple-linear');
const jstat = require('jstat');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const ollama = new Ollama({ host: process.env.OLLAMA_HOST || 'http://localhost:11434' });

const HF_TOKEN = process.env.HF_TOKEN || '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';
const MISTRAL_API_KEY = process.env.MISTRAL_AI_API_KEY || 'ECui9vajIMimnjJw3AdYYzBAPwrEF9NX';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

const localStorage = path.join(__dirname, 'local_storage');
if (!fs.existsSync(localStorage)) fs.mkdirSync(localStorage);

const availableModels = [
  { name: 'phi3:3.8b', sizeGB: 2.2, purpose: 'general_coding' },
  { name: 'llama3.2:latest', sizeGB: 2.0, purpose: 'human_conversation' },
  { name: 'deepseek-coder:6.7b', sizeGB: 3.8, purpose: 'coding_problems' },
  { name: 'llama2:latest', sizeGB: 3.8, purpose: 'statistics' },
  { name: 'codegemma:7b', sizeGB: 5.0, purpose: 'multi_language_ai' },
  { name: 'codellama:7b', sizeGB: 3.8, purpose: 'debugging' },
  { name: 'phi3:3.8b', sizeGB: 2.2, purpose: 'empathy' },
  { name: 'codellama:7b', sizeGB: 3.8, purpose: 'dsa' },
];

async function preloadModels() {
  const keyModels = ['phi3:3.8b', 'llama3.2:latest'];
  for (const model of keyModels) {
    if (!(await ollama.list()).models.some((m) => m.name.includes(model))) {
      console.log(`Preloading ${model} from Hugging Face...`);
      await ollama.pull({ model, auth: { token: HF_TOKEN } });
    }
  }
}
preloadModels();

function cleanAndTransformData(rawData) {
  const data = rawData.map(row => {
    const cleanedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined || value === '') {
        cleanedRow[key] = 0;
      } else if (!isNaN(value)) {
        cleanedRow[key] = parseFloat(value);
      } else {
        cleanedRow[key] = value.trim();
      }
    }
    return cleanedRow;
  });

  const columns = Object.keys(data[0]);
  const numericalColumns = columns.filter(col => !isNaN(data[0][col]));
  if (numericalColumns.length > 0) {
    const minMax = numericalColumns.reduce((acc, col) => {
      acc[col] = [Math.min(...data.map(row => row[col])), Math.max(...data.map(row => row[col]))];
      return acc;
    }, {});
    data.forEach(row => {
      numericalColumns.forEach(col => {
        const [min, max] = minMax[col];
        row[col] = (row[col] - min) / (max - min || 1);
      });
    });
  }
  return data;
}

function performStatisticalAnalysis(data) {
  const columns = Object.keys(data[0]);
  const numericalColumns = columns.filter(col => !isNaN(data[0][col]));
  const stats = {};
  numericalColumns.forEach(col => {
    const values = data.map(row => row[col]);
    stats[col] = {
      mean: jstat.mean(values),
      median: jstat.median(values),
      stdDev: jstat.stdev(values),
      min: jstat.min(values),
      max: jstat.max(values),
    };
  });
  return stats;
}

function applyMLPrediction(xData, yData) {
  const regression = new SimpleLinearRegression(xData.map((x, i) => i), yData);
  const predicted = xData.map((_, i) => regression.predict(i));
  return predicted;
}

function applyDSATransformation(data, key) {
  return data
    .sort((a, b) => b[key] - a[key])
    .slice(0, 5);
}

const dashboardTypes = [
  { name: 'Executive Dashboard', category: 'Business', description: 'High-level KPIs (e.g., total metrics)', chartType: 'bar' },
  { name: 'Sales Dashboard', category: 'Business', description: 'Tracks sales metrics (e.g., growth over time)', chartType: 'line' },
  { name: 'Financial Dashboard', category: 'Data & Analytics', description: 'Revenue and expenses breakdown', chartType: 'pie' },
  { name: 'Marketing Dashboard', category: 'Data & Analytics', description: 'Campaign performance', chartType: 'bar' },
  { name: 'AI Model Performance Dashboard', category: 'AI & ML', description: 'Model accuracy trends', chartType: 'line' },
  { name: 'Predictive Analytics Dashboard', category: 'AI & ML', description: 'Forecasting trends', chartType: 'scatter' },
  { name: 'Server Monitoring Dashboard', category: 'Technical & IT', description: 'System metrics (e.g., usage)', chartType: 'gauge' },
  { name: 'Network Monitoring Dashboard', category: 'Technical & IT', description: 'Bandwidth trends', chartType: 'area' },
  { name: 'Employee Performance Dashboard', category: 'HR & Employee', description: 'Productivity metrics', chartType: 'bar' },
  { name: 'Attendance Dashboard', category: 'HR & Employee', description: 'Attendance distribution', chartType: 'donut' },
  { name: 'Patient Dashboard', category: 'Healthcare', description: 'Health metrics over time', chartType: 'scatter' },
  { name: 'Hospital Performance Dashboard', category: 'Healthcare', description: 'Resource usage trends', chartType: 'area' },
  { name: 'Dynamic Dashboard', category: 'Custom AI-Powered', description: 'Self-updating with anomalies', chartType: 'line' },
];

function prepareDashboardData(fileName, fileContent, dashboardIndex) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
  let rawData;
  try {
    rawData = parse(fileContent, { columns: true, skip_empty_lines: true });
  } catch (error) {
    return { error: `[${timestamp}] Error: Could not parse CSV file. Please ensure it's a valid CSV.` };
  }

  const cleanedData = cleanAndTransformData(rawData);
  const stats = performStatisticalAnalysis(cleanedData);
  const columns = Object.keys(cleanedData[0]);
  const numericalColumn = columns.find(col => !isNaN(cleanedData[0][col]));
  const xData = cleanedData.map((_, i) => i);
  const yData = cleanedData.map(row => row[numericalColumn] || 0);
  const predictedData = applyMLPrediction(xData, yData);
  const top5Data = applyDSATransformation(cleanedData, numericalColumn);

  const dashboardType = dashboardTypes[dashboardIndex % dashboardTypes.length];
  const { name, description, chartType } = dashboardType;

  let plotData = [];
  let layout = {
    title: `${name} for ${fileName}`,
    xaxis: { title: columns[0] || 'Index' },
    yaxis: { title: numericalColumn || 'Value' },
    annotations: [
      {
        text: `Stats: Mean=${stats[numericalColumn]?.mean.toFixed(2)}, Median=${stats[numericalColumn]?.median.toFixed(2)}, StdDev=${stats[numericalColumn]?.stdDev.toFixed(2)}`,
        xref: 'paper',
        yref: 'paper',
        x: 1.1,
        y: 1.1,
        showarrow: false,
      },
    ],
  };

  switch (chartType) {
    case 'bar':
      plotData = [
        {
          x: cleanedData.map(row => row[columns[0]]),
          y: yData,
          type: 'bar',
          name: numericalColumn,
          marker: { color: '#4a90e2' },
        },
      ];
      layout.xaxis.title = columns[0];
      break;
    case 'line':
      plotData = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Data',
          marker: { color: '#4a90e2' },
        },
        {
          x: xData,
          y: predictedData,
          type: 'scatter',
          mode: 'lines',
          name: 'Prediction',
          marker: { color: '#ff6f61' },
        },
      ];
      break;
    case 'pie':
      plotData = [
        {
          labels: cleanedData.map(row => row[columns[0]]),
          values: yData,
          type: 'pie',
          name: numericalColumn,
          marker: { colors: ['#4a90e2', '#ff6f61', '#34c759', '#ffcc00', '#6b7280'] },
        },
      ];
      layout = { ...layout, title: `${name} for ${fileName}` };
      break;
    case 'scatter':
      plotData = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'markers',
          name: 'Data',
          marker: { color: '#4a90e2', size: 10 },
        },
        {
          x: xData,
          y: predictedData,
          type: 'scatter',
          mode: 'lines',
          name: 'Prediction',
          marker: { color: '#ff6f61' },
        },
      ];
      break;
    case 'gauge':
      plotData = [
        {
          type: 'indicator',
          mode: 'gauge+number',
          value: stats[numericalColumn]?.mean || 0,
          title: { text: numericalColumn },
          gauge: {
            axis: { range: [stats[numericalColumn]?.min || 0, stats[numericalColumn]?.max || 1] },
            bar: { color: '#4a90e2' },
          },
        },
      ];
      layout = { ...layout, title: `${name} for ${fileName}` };
      break;
    case 'area':
      plotData = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          fill: 'tozeroy',
          name: 'Data',
          marker: { color: '#4a90e2' },
        },
      ];
      break;
    case 'donut':
      plotData = [
        {
          labels: cleanedData.map(row => row[columns[0]]),
          values: yData,
          type: 'pie',
          hole: 0.4,
          name: numericalColumn,
          marker: { colors: ['#4a90e2', '#ff6f61', '#34c759', '#ffcc00', '#6b7280'] },
        },
      ];
      layout = { ...layout, title: `${name} for ${fileName}` };
      break;
    default:
      plotData = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Data',
          marker: { color: '#4a90e2' },
        },
      ];
  }

  return {
    name: fileName.split('.')[0] + '_dashboard',
    title: name,
    description: description,
    plotData,
    layout,
    top5: top5Data.map(row => ({ [columns[0]]: row[columns[0]], [numericalColumn]: row[numericalColumn] })),
    fieldTypes: columns.reduce((acc, col) => {
      acc[col] = !isNaN(cleanedData[0][col]) ? 'numerical' : 'categorical';
      return acc;
    }, {}),
  };
}

const wss = new WebSocket.Server({ port: 5001 });
const clients = new Map();
const lastUploadedFiles = new Map();
const dashboardCounts = new Map();

wss.on('connection', (ws) => {
  const clientId = Date.now();
  clients.set(clientId, ws);
  console.log(`Client ${clientId} connected`);

  ws.on('message', async (data) => {
    const { message, file } = JSON.parse(data);
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
    console.log(`[${timestamp}] Received: ${message}`);

    const involvesData =
      file ||
      message.toLowerCase().includes('data') ||
      message.toLowerCase().includes('file') ||
      message.toLowerCase().includes('dashboard');

    if (file) {
      const storedFilePath = path.join(localStorage, file.name);
      fs.writeFileSync(storedFilePath, Buffer.from(file.data, 'base64'));
      const fileContent = fs.readFileSync(storedFilePath, 'utf8');
      const fileType = file.type;
      console.log(`[${timestamp}] File saved locally: ${storedFilePath}`);
      
      lastUploadedFiles.set(clientId, {
        name: file.name,
        content: fileContent,
        type: fileType,
      });
      dashboardCounts.set(clientId, 0);
    }

    if (message.toLowerCase() === 'generate dashboard') {
      const lastFile = lastUploadedFiles.get(clientId);
      if (!lastFile) {
        ws.send(
          JSON.stringify({
            response: `[${timestamp}] Error: No file uploaded. Please upload a CSV file first.`,
          })
        );
        return;
      }

      if (lastFile.type !== 'text/csv') {
        ws.send(
          JSON.stringify({
            response: `[${timestamp}] Error: Dashboard generation requires a CSV file.`,
          })
        );
        return;
      }

      const currentCount = dashboardCounts.get(clientId) || 0;
      dashboardCounts.set(clientId, currentCount + 1);

      const dashboardData = prepareDashboardData(lastFile.name, lastFile.content, currentCount);
      if (dashboardData.error) {
        ws.send(JSON.stringify({ response: dashboardData.error }));
      } else {
        ws.send(
          JSON.stringify({
            response: `[${timestamp}] ${dashboardData.title} generated! ${dashboardData.description}`,
            dashboard: dashboardData,
          })
        );
      }
      return;
    }

    const lastFile = lastUploadedFiles.get(clientId);
    if (involvesData && lastFile && lastFile.content) {
      console.log(`[${timestamp}] Using Ollama for file analysis (sensitive data)`);
      const purpose = selectModel(message);
      const selectedModel =
        availableModels.find((m) => m.purpose === purpose) || availableModels[0];
      const stream = await ollama.chat({
        model: selectedModel.name,
        messages: [
          {
            role: 'user',
            content: `Format your response in clean markdown like Grok from xAI. Analyze this file content: ${lastFile.content}. Query: ${message}`,
          },
        ],
        stream: true,
      });
      let fullResponse = '';
      for await (const part of stream) {
        fullResponse += part.message.content;
        ws.send(JSON.stringify({ response: `[${timestamp}] ${fullResponse}` }));
      }
    } else {
      console.log(`[${timestamp}] Using Hugging Face Inference API`);
      try {
        const response = await textGeneration({
          model: 'google/flan-t5-base',
          inputs: message,
          parameters: { max_length: 500 },
          accessToken: HF_TOKEN,
        });
        ws.send(JSON.stringify({ response: `[${timestamp}] ${response.generated_text}` }));
      } catch (error) {
        console.error(`[${timestamp}] Hugging Face API error:`, error.message);
        ws.send(
          JSON.stringify({
            response: `[${timestamp}] Hugging Face unavailable, switching to Mistral AI...`,
          })
        );
        try {
          const response = await axios.post(
            MISTRAL_API_URL,
            {
              model: 'mistral-small-latest',
              messages: [
                {
                  role: 'user',
                  content: `Format your response in clean markdown like Grok from xAI. ${message}`,
                },
              ],
              stream: true,
              max_tokens: 500,
            },
            {
              headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
              },
              responseType: 'stream',
            }
          );

          let fullResponse = '';
          response.data.on('data', (chunk) => {
            const lines = chunk.toString().split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.choices && json.choices[0].delta.content) {
                    fullResponse += json.choices[0].delta.content;
                    ws.send(JSON.stringify({ response: `[${timestamp}] ${fullResponse}` }));
                  }
                } catch (e) {
                  console.error(`[${timestamp}] Parse error:`, e.message);
                }
              }
            }
          });
        } catch (error) {
          console.error(`[${timestamp}] Mistral API error:`, error.message);
          ws.send(
            JSON.stringify({
              response: `[${timestamp}] Mistral unavailable, switching to Ollama...`,
            })
          );
          const stream = await ollama.chat({
            model: 'phi3:3.8b',
            messages: [
              {
                role: 'user',
                content: `Format your response in clean markdown like Grok from xAI. ${message}`,
              },
            ],
            stream: true,
          });
          let fullResponse = '';
          for await (const part of stream) {
            fullResponse += part.message.content;
            ws.send(JSON.stringify({ response: `[${timestamp}] ${fullResponse}` }));
          }
        }
      }
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    lastUploadedFiles.delete(clientId);
    dashboardCounts.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

function selectModel(query) {
  const keywords = query.toLowerCase();
  if (keywords.includes('how are you') || keywords.includes('feel') || keywords.includes('chat'))
    return 'human_conversation';
  if (keywords.includes('code') && (keywords.includes('problem') || keywords.includes('solve')))
    return 'coding_problems';
  if (keywords.includes('stat') || keywords.includes('data') || keywords.includes('analysis'))
    return 'statistics';
  if (
    keywords.includes('python') ||
    keywords.includes('java') ||
    keywords.includes('r') ||
    keywords.includes('ml') ||
    keywords.includes('ai') ||
    keywords.includes('llm')
  )
    return 'multi_language_ai';
  if (keywords.includes('indent') || keywords.includes('debug') || keywords.includes('write code'))
    return 'debugging';
  if (keywords.includes('emotion') || keywords.includes('feeling') || keywords.includes('empathy'))
    return 'empathy';
  if (keywords.includes('dsa') || keywords.includes('algorithm') || keywords.includes('data structure'))
    return 'dsa';
  if (keywords.includes('code') || keywords.includes('program')) return 'general_coding';
  return 'human_conversation';
}

app.listen(PORT, () => {
  console.log(`HTTP Server running on port ${PORT}`);
  console.log(`WebSocket Server running on port 5001`);
});