// OpenQASM 2.0 Parser

export function parseQASM(qasmText) {
  const lines = qasmText.split('\n');
  const gates = [];
  let gateIdCounter = 0;

  // Track the next available column for each qubit
  // q[0] to q[7] (8 qubits)
  const qubitBusyColumns = new Array(8).fill(0);

  // Helper to schedule a gate in the earliest available column
  const scheduleGate = (gateType, targets, controls, params = null) => {
    // Find the minimum column where all target and control qubits are free
    const allQubits = [...targets, ...controls];
    
    let targetCol = 0;
    if (allQubits.length > 0) {
      targetCol = Math.max(...allQubits.map(q => qubitBusyColumns[q]));
    }

    // Schedule the gate at targetCol
    const gate = {
      id: `gate_${gateIdCounter++}_${Date.now()}`,
      type: gateType,
      targets,
      controls,
      column: targetCol,
      params: params || {}
    };

    // Update busy columns for all involved qubits
    for (const q of allQubits) {
      qubitBusyColumns[q] = targetCol + 1;
    }

    gates.push(gate);
  };

  for (let line of lines) {
    // 1. Clean line
    line = line.trim();
    if (!line || line.startsWith('//') || line.startsWith('OPENQASM') || line.startsWith('include')) {
      continue;
    }

    // Remove ending semicolon if present
    if (line.endsWith(';')) {
      line = line.slice(0, -1);
    }

    // Ignore register declarations
    if (line.startsWith('qreg') || line.startsWith('creg')) {
      continue;
    }

    // Match Measure: measure q[0] -> c[0]
    const measureMatch = line.match(/^measure\s+q\[(\d+)\]\s+->\s+c\[(\d+)\]$/);
    if (measureMatch) {
      const qIndex = parseInt(measureMatch[1], 10);
      const cIndex = parseInt(measureMatch[2], 10);
      if (qIndex >= 0 && qIndex < 8) {
        scheduleGate('measure', [qIndex], [], { cbit: cIndex });
      }
      continue;
    }

    // Match Reset: reset q[0]
    const resetMatch = line.match(/^reset\s+q\[(\d+)\]$/);
    if (resetMatch) {
      const qIndex = parseInt(resetMatch[1], 10);
      if (qIndex >= 0 && qIndex < 8) {
        scheduleGate('reset', [qIndex], []);
      }
      continue;
    }

    // Match gates with parameters: rx(1.57) q[0] or u3(1,2,3) q[0]
    const paramGateMatch = line.match(/^(\w+)\(([^)]+)\)\s+(.+)$/);
    if (paramGateMatch) {
      const rawName = paramGateMatch[1].toLowerCase();
      const rawParams = paramGateMatch[2].split(',').map(s => s.trim());
      const qubitsPart = paramGateMatch[3].trim();

      // Extract qubits list, e.g. "q[0]" or "q[0],q[1]"
      const qubitRegex = /q\[(\d+)\]/g;
      const qubits = [];
      let qMatch;
      while ((qMatch = qubitRegex.exec(qubitsPart)) !== null) {
        qubits.push(parseInt(qMatch[1], 10));
      }

      // Map parameters based on gate type
      let params = {};
      if (rawName === 'p' || rawName === 'phase' || rawName === 'rx' || rawName === 'ry') {
        params.theta = rawParams[0] || '0';
      } else if (rawName === 'rz') {
        params.phi = rawParams[0] || '0';
      } else if (rawName === 'u' || rawName === 'u3') {
        params.theta = rawParams[0] || '0';
        params.phi = rawParams[1] || '0';
        params.lambda = rawParams[2] || '0';
      }

      let gateType = rawName.toUpperCase();
      if (gateType === 'U3') gateType = 'U';
      if (gateType === 'SDG') gateType = 'S†';
      if (gateType === 'TDG') gateType = 'T†';

      if (qubits.length > 0 && qubits.every(q => q >= 0 && q < 8)) {
        scheduleGate(gateType, [qubits[0]], [], params);
      }
      continue;
    }

    // Match standard gates without parameters: h q[0], cx q[0],q[1], ccx q[0],q[1],q[2]
    const standardMatch = line.match(/^(\w+)\s+(.+)$/);
    if (standardMatch) {
      const rawName = standardMatch[1].toLowerCase();
      const qubitsPart = standardMatch[2].trim();

      const qubitRegex = /q\[(\d+)\]/g;
      const qubits = [];
      let qMatch;
      while ((qMatch = qubitRegex.exec(qubitsPart)) !== null) {
        qubits.push(parseInt(qMatch[1], 10));
      }

      if (qubits.length === 0 || !qubits.every(q => q >= 0 && q < 8)) {
        continue;
      }

      let gateType = rawName.toUpperCase();
      if (gateType === 'CNOT') gateType = 'CX';
      if (gateType === 'SDG') gateType = 'S†';
      if (gateType === 'TDG') gateType = 'T†';
      if (gateType === 'TOFFOLI') gateType = 'CCX';

      // Distinguish targets vs controls based on gate type
      if (gateType === 'CX' || gateType === 'CY' || gateType === 'CZ') {
        if (qubits.length >= 2) {
          scheduleGate(gateType, [qubits[1]], [qubits[0]]);
        }
      } else if (gateType === 'CCX' || gateType === 'RCCX') {
        if (qubits.length >= 3) {
          scheduleGate(gateType, [qubits[2]], [qubits[0], qubits[1]]);
        }
      } else if (gateType === 'RC3X') {
        if (qubits.length >= 4) {
          scheduleGate(gateType, [qubits[3]], [qubits[0], qubits[1], qubits[2]]);
        }
      } else if (gateType === 'SWAP') {
        if (qubits.length >= 2) {
          scheduleGate('SWAP', [qubits[0], qubits[1]], []);
        }
      } else if (gateType === 'BARRIER') {
        scheduleGate('BARRIER', qubits, []);
      } else if (gateType === 'QFT' || gateType === 'IQFT') {
        scheduleGate(gateType, qubits, []);
      } else {
        // Single qubit gate
        scheduleGate(gateType, [qubits[0]], []);
      }
    }
  }

  return gates;
}
