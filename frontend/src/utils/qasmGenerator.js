// OpenQASM 2.0 Generator

export function generateQASM(gates, numQubits = 8, numClassical = 2) {
  let lines = [
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    '',
    `qreg q[${numQubits}];`,
    `creg c[${numClassical}];`,
    ''
  ];

  // Sort gates by column and then by id
  const sortedGates = [...gates].sort((a, b) => {
    if (a.column !== b.column) return a.column - b.column;
    return a.id.localeCompare(b.id);
  });

  for (const gate of sortedGates) {
    const type = gate.type.toLowerCase();
    const t = gate.targets || [];
    const c = gate.controls || [];
    const params = gate.params || {};

    let paramStr = '';
    if (type === 'p' || type === 'phase') {
      paramStr = `(${params.theta || 0})`;
    } else if (type === 'rx') {
      paramStr = `(${params.theta || 0})`;
    } else if (type === 'ry') {
      paramStr = `(${params.theta || 0})`;
    } else if (type === 'rz') {
      paramStr = `(${params.phi || 0})`;
    } else if (type === 'u' || type === 'u3') {
      paramStr = `(${params.theta || 0},${params.phi || 0},${params.lambda || 0})`;
    }

    const gateName = type === 'sdg' ? 'sdg' : type === 'tdg' ? 'tdg' : type;

    if (gateName === 'measure') {
      // Find the index of target to measure
      const qIndex = t[0] !== undefined ? t[0] : 0;
      // Map to classical bit (e.g. qIndex % numClassical)
      const cIndex = qIndex % numClassical;
      lines.push(`measure q[${qIndex}] -> c[${cIndex}];`);
    } else if (gateName === 'reset') {
      lines.push(`reset q[${t[0]}];`);
    } else if (gateName === 'barrier') {
      const qbits = t.map(idx => `q[${idx}]`).join(',');
      lines.push(`barrier ${qbits};`);
    } else if (gateName === 'cx' || gateName === 'cnot') {
      lines.push(`cx q[${c[0]}],q[${t[0]}];`);
    } else if (gateName === 'cy') {
      lines.push(`cy q[${c[0]}],q[${t[0]}];`);
    } else if (gateName === 'cz') {
      lines.push(`cz q[${c[0]}],q[${t[0]}];`);
    } else if (gateName === 'swap') {
      lines.push(`swap q[${t[0]}],q[${t[1]}];`);
    } else if (gateName === 'ccx' || gateName === 'toffoli') {
      lines.push(`ccx q[${c[0]}],q[${c[1]}],q[${t[0]}];`);
    } else if (gateName === 'rccx') {
      lines.push(`rccx q[${c[0]}],q[${c[1]}],q[${t[0]}];`);
    } else if (gateName === 'rc3x') {
      lines.push(`rc3x q[${c[0]}],q[${c[1]}],q[${c[2]}],q[${t[0]}];`);
    } else if (gateName === 'qft') {
      const qbits = t.map(idx => `q[${idx}]`).join(',');
      lines.push(`qft ${qbits};`);
    } else if (gateName === 'iqft') {
      const qbits = t.map(idx => `q[${idx}]`).join(',');
      lines.push(`iqft ${qbits};`);
    } else {
      // Single qubit gates: h, x, y, z, s, t, p, rx, ry, rz, u
      // Map display name to standard QASM name if needed
      let name = gateName;
      if (name === 't†') name = 'tdg';
      if (name === 's†') name = 'sdg';
      lines.push(`${name}${paramStr} q[${t[0]}];`);
    }
  }

  return lines.join('\n');
}
