import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './components/Toolbar';
import GatePalette from './components/GatePalette';
import CircuitCanvas from './components/CircuitCanvas';
import QasmEditor from './components/QasmEditor';
import ProbabilityChart from './components/ProbabilityChart';
import QSphereViewer from './components/QSphereViewer';

import { simulateCircuit } from './utils/quantumSimulator';
import { generateQASM } from './utils/qasmGenerator';
import { parseQASM } from './utils/qasmParser';

const DEFAULT_GATES = [
  { 
    id: 'gate_init_tdg', 
    type: 'T†', 
    targets: [0], 
    controls: [], 
    column: 0, 
    params: { theta: '0', phi: '0', lambda: '0' } 
  }
];

export default function App() {
  const [gates, setGates] = useState(DEFAULT_GATES);
  const [qasm, setQasm] = useState('');
  const [simulationResult, setSimulationResult] = useState({
    statevector: [],
    probabilities: {},
    counts: {},
    numQubits: 8
  });
  
  // UI states
  const [isInspecting, setIsInspecting] = useState(false);
  const [isQiskitRunning, setIsQiskitRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Flag to check if we are updating state from editor or vice versa
  const isUpdatingFromEditor = useRef(false);

  // Calculate local simulation whenever gates change
  useEffect(() => {
    // Run local simulator (highly responsive, updates UI live)
    const result = simulateCircuit(gates, 8);
    setSimulationResult(result);

    // Sync gates to QASM text (only if not currently typing in editor to avoid race conditions)
    if (!isUpdatingFromEditor.current) {
      const generated = generateQASM(gates, 8, 2);
      setQasm(generated);
    }
  }, [gates]);

  // Handle QASM changes in Monaco Editor
  const handleQasmChange = (newQasm) => {
    setQasm(newQasm);
    isUpdatingFromEditor.current = true;
    try {
      const parsedGates = parseQASM(newQasm);
      // Compare structural changes to avoid infinite loop
      if (JSON.stringify(parsedGates) !== JSON.stringify(gates)) {
        // Save history
        setUndoStack(prev => [...prev, gates]);
        setRedoStack([]);
        setGates(parsedGates);
      }
    } catch (err) {
      // Ignore parse errors while user is editing
    } finally {
      isUpdatingFromEditor.current = false;
    }
  };

  // Reset editor to default circuit state
  const handleResetQasm = () => {
    setUndoStack(prev => [...prev, gates]);
    setRedoStack([]);
    setGates(DEFAULT_GATES);
  };

  const handleUpdateGates = (newGates) => {
    setUndoStack(prev => [...prev, gates]);
    setRedoStack([]);
    setGates(newGates);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, gates]);
    setGates(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, gates]);
    setGates(next);
  };

  // Handle Ctrl+Z / Ctrl+Y hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gates, undoStack, redoStack]);

  const handleClear = () => {
    handleUpdateGates([]);
  };

  // Call Node.js Backend to simulate via Qiskit
  const handleRunQiskit = async () => {
    setIsQiskitRunning(true);
    setErrorMessage(null);
    try {
      const response = await fetch('http://localhost:5000/api/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qasm })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSimulationResult({
          statevector: data.statevector,
          probabilities: data.probabilities,
          counts: data.counts,
          numQubits: data.num_qubits || 8
        });
        showToast('Successfully ran on Qiskit backend!');
      } else {
        throw new Error(data.error || 'Qiskit simulation error');
      }
    } catch (err) {
      console.warn('Backend run failed, falling back to local JS simulator:', err.message);
      setErrorMessage(`Running on Local JS Simulator (Qiskit backend offline or not configured).`);
      // Run local JS simulation as fallback
      const result = simulateCircuit(gates, 8);
      setSimulationResult(result);
    } finally {
      setIsQiskitRunning(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('quantum_circuit_studio_gates', JSON.stringify(gates));
    showToast('Circuit saved successfully!');
  };

  const handleExportQASM = () => {
    const blob = new Blob([qasm], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'circuit.qasm';
    link.click();
    URL.revokeObjectURL(url);
    showToast('OpenQASM file exported!');
  };

  // Simple Notification Popup (Toast)
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load saved circuit on startup if exists
  useEffect(() => {
    const saved = localStorage.getItem('quantum_circuit_studio_gates');
    if (saved) {
      try {
        setGates(JSON.parse(saved));
      } catch (e) {
        // use default
      }
    }
  }, []);

  return (
    <div className="w-screen h-screen flex flex-row bg-[#121212] overflow-hidden font-sans select-none">
      {/* Left/Center Panel: Palette + Canvas on top, Probabilities on bottom */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#393939]/40">
        
        {/* Top: Palette + Canvas */}
        <div className="flex-1 flex flex-row min-h-0">
          <GatePalette />
          
          {/* Canvas area with compact toolbar */}
          <div className="flex-1 flex flex-col min-w-0">
            {errorMessage && (
              <div className="bg-amber-950/30 border-b border-amber-900/50 text-amber-400 text-[11.5px] px-4 py-1.5 flex justify-between items-center z-20 shrink-0">
                <span>{errorMessage}</span>
                <button onClick={() => setErrorMessage(null)} className="text-amber-500 hover:text-amber-300 ml-2 font-bold cursor-pointer">×</button>
              </div>
            )}

            <Toolbar 
              onRun={handleRunQiskit}
              onSave={handleSave}
              onExportQASM={handleExportQASM}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
              canUndo={undoStack.length > 0}
              canRedo={redoStack.length > 0}
              isQiskitRunning={isQiskitRunning}
            />

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-[#262626]">
              <CircuitCanvas 
                gates={gates}
                onUpdateGates={handleUpdateGates}
                isInspecting={isInspecting}
                numQubits={8}
                numClassical={2}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Probability Chart */}
        <div className="h-[350px] shrink-0 bg-[#262626]">
          <ProbabilityChart probabilities={simulationResult.probabilities} />
        </div>
      </div>

      {/* Right Panel: OpenQASM on top, Q-Sphere on bottom */}
      <div className="w-[380px] flex flex-col shrink-0 bg-[#161616]">
        {/* Top: Monaco OpenQASM Editor */}
        <div className="flex-1 min-h-0 border-b border-[#393939]">
          <QasmEditor 
            qasm={qasm}
            onChangeQasm={handleQasmChange}
            onResetQasm={handleResetQasm}
          />
        </div>
        {/* Bottom: Three.js Q-Sphere Viewer */}
        <div className="h-[350px] shrink-0 bg-[#262626]">
          <QSphereViewer simulationResult={simulationResult} />
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#161616] border border-[#33b1ff] text-white px-4 py-3 rounded shadow-2xl z-50 text-[12.5px] flex items-center space-x-2 animate-bounce">
          <div className="w-1.5 h-1.5 rounded-full bg-[#33b1ff] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
