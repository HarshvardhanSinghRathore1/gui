import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/run', (req, res) => {
  const { qasm } = req.body;

  if (!qasm) {
    return res.status(400).json({ error: 'No OpenQASM code provided' });
  }

  // Path to python simulator script
  const scriptPath = path.join(__dirname, '../quantum-service/simulator.py');

  // Spawn Python process
  // Try running 'python' or 'python3' depending on environment
  const pyProcess = spawn('python', [scriptPath]);

  let stdoutData = '';
  let stderrData = '';

  pyProcess.stdout.on('data', (data) => {
    stdoutData += data.toString();
  });

  pyProcess.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  pyProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}. Error: ${stderrData}`);
      return res.status(500).json({
        error: 'Qiskit simulation failed',
        details: stderrData || `Exited with code ${code}`,
        fallback: true
      });
    }

    try {
      const result = JSON.parse(stdoutData);
      res.json(result);
    } catch (e) {
      console.error('Failed to parse Python output:', stdoutData);
      res.status(500).json({
        error: 'Invalid JSON response from simulator',
        details: stdoutData,
        fallback: true
      });
    }
  });

  // Write QASM to stdin of python process
  pyProcess.stdin.write(qasm);
  pyProcess.stdin.end();
});

app.listen(PORT, () => {
  console.log(`Backend quantum simulator server running on port ${PORT}`);
});
