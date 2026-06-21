// Quantum State Simulator for 8 Qubits in JavaScript
// Uses Float64Arrays for speed and efficiency

export function simulateCircuit(gates, numQubits = 8) {
  const N = 1 << numQubits;
  let re = new Float64Array(N);
  let im = new Float64Array(N);

  // Initialize to state |00000000>
  re[0] = 1.0;
  im[0] = 0.0;

  // Helper functions to apply matrices
  const applySingleQubitGate = (target, u00_r, u00_i, u01_r, u01_i, u10_r, u10_i, u11_r, u11_i) => {
    for (let i = 0; i < N; i++) {
      if ((i & (1 << target)) === 0) {
        const j = i | (1 << target);

        const r_i = re[i];
        const im_i = im[i];
        const r_j = re[j];
        const im_j = im[j];

        // New state for index i: u00 * v_i + u01 * v_j
        re[i] = (u00_r * r_i - u00_i * im_i) + (u01_r * r_j - u01_i * im_j);
        im[i] = (u00_r * im_i + u00_i * r_i) + (u01_r * im_j + u01_i * r_j);

        // New state for index j: u10 * v_i + u11 * v_j
        re[j] = (u10_r * r_i - u10_i * im_i) + (u11_r * r_j - u11_i * im_j);
        im[j] = (u10_r * im_i + u10_i * r_i) + (u11_r * im_j + u11_i * r_j);
      }
    }
  };

  const applyControlledGate = (control, target, u00_r, u00_i, u01_r, u01_i, u10_r, u10_i, u11_r, u11_i) => {
    for (let i = 0; i < N; i++) {
      // Check if control bit is 1 and target bit is 0
      if ((i & (1 << control)) !== 0 && (i & (1 << target)) === 0) {
        const j = i | (1 << target);

        const r_i = re[i];
        const im_i = im[i];
        const r_j = re[j];
        const im_j = im[j];

        re[i] = (u00_r * r_i - u00_i * im_i) + (u01_r * r_j - u01_i * im_j);
        im[i] = (u00_r * im_i + u00_i * r_i) + (u01_r * im_j + u01_i * r_j);

        re[j] = (u10_r * r_i - u10_i * im_i) + (u11_r * r_j - u11_i * im_j);
        im[j] = (u10_r * im_i + u10_i * r_i) + (u11_r * im_j + u11_i * r_j);
      }
    }
  };

  const applyMultiControlledGate = (controls, target, u00_r, u00_i, u01_r, u01_i, u10_r, u10_i, u11_r, u11_i) => {
    for (let i = 0; i < N; i++) {
      // Check all control bits are 1
      let controlsActive = true;
      for (const ctrl of controls) {
        if ((i & (1 << ctrl)) === 0) {
          controlsActive = false;
          break;
        }
      }

      if (controlsActive && (i & (1 << target)) === 0) {
        const j = i | (1 << target);

        const r_i = re[i];
        const im_i = im[i];
        const r_j = re[j];
        const im_j = im[j];

        re[i] = (u00_r * r_i - u00_i * im_i) + (u01_r * r_j - u01_i * im_j);
        im[i] = (u00_r * im_i + u00_i * r_i) + (u01_r * im_j + u01_i * r_j);

        re[j] = (u10_r * r_i - u10_i * im_i) + (u11_r * r_j - u11_i * im_j);
        im[j] = (u10_r * im_i + u10_i * r_i) + (u11_r * im_j + u11_i * r_j);
      }
    }
  };

  const applySWAP = (q1, q2) => {
    for (let i = 0; i < N; i++) {
      if ((i & (1 << q1)) === 0 && (i & (1 << q2)) !== 0) {
        // Swap bit q1 (currently 0) and q2 (currently 1)
        // target index where bit q1 is 1 and q2 is 0
        const j = (i | (1 << q1)) & ~(1 << q2);

        const r_temp = re[i];
        const im_temp = im[i];

        re[i] = re[j];
        im[i] = im[j];

        re[j] = r_temp;
        im[j] = im_temp;
      }
    }
  };

  const applyReset = (target) => {
    // Project state to |0> for the target qubit
    // We keep coefficients where bit is 0, zero out where bit is 1, and re-normalize.
    let normSq = 0.0;
    for (let i = 0; i < N; i++) {
      if ((i & (1 << target)) === 0) {
        normSq += re[i] * re[i] + im[i] * im[i];
      } else {
        re[i] = 0.0;
        im[i] = 0.0;
      }
    }

    if (normSq > 1e-10) {
      const scale = 1.0 / Math.sqrt(normSq);
      for (let i = 0; i < N; i++) {
        re[i] *= scale;
        im[i] *= scale;
      }
    } else {
      // Qubit was in state |1> with probability 1. Resetting it means making it |0>.
      // We can just swap the state components!
      for (let i = 0; i < N; i++) {
        if ((i & (1 << target)) !== 0) {
          const j = i & ~(1 << target);
          re[j] = re[i];
          im[j] = im[i];
          re[i] = 0.0;
          im[i] = 0.0;
        }
      }
    }
  };

  const applyCP = (control, target, theta) => {
    // Controlled-Phase: multiplies coefficient by e^(i*theta) if both control and target are 1
    const cos_t = Math.cos(theta);
    const sin_t = Math.sin(theta);

    for (let i = 0; i < N; i++) {
      if ((i & (1 << control)) !== 0 && (i & (1 << target)) !== 0) {
        const r = re[i];
        const im_val = im[i];

        re[i] = r * cos_t - im_val * sin_t;
        im[i] = r * sin_t + im_val * cos_t;
      }
    }
  };

  // Sort gates by column so they are processed in order
  const sortedGates = [...gates].sort((a, b) => a.column - b.column);

  for (const gate of sortedGates) {
    const type = gate.type.toUpperCase();
    const t = gate.targets ? gate.targets[0] : 0;
    const c = gate.controls ? gate.controls[0] : null;

    // Handle parameter parsing
    let theta = 0, phi = 0, lambda = 0;
    if (gate.params) {
      theta = parseFloat(gate.params.theta) || 0;
      phi = parseFloat(gate.params.phi) || 0;
      lambda = parseFloat(gate.params.lambda) || 0;
    }

    switch (type) {
      case 'H':
        // H = 1/sqrt(2) * [[1, 1], [1, -1]]
        const s = 1.0 / Math.sqrt(2);
        applySingleQubitGate(t, s, 0, s, 0, s, 0, -s, 0);
        break;
      case 'X':
        // X = [[0, 1], [1, 0]]
        applySingleQubitGate(t, 0, 0, 1, 0, 1, 0, 0, 0);
        break;
      case 'Y':
        // Y = [[0, -i], [i, 0]]
        applySingleQubitGate(t, 0, 0, 0, -1, 0, 1, 0, 0);
        break;
      case 'Z':
        // Z = [[1, 0], [0, -1]]
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, -1, 0);
        break;
      case 'S':
        // S = [[1, 0], [0, i]]
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, 0, 1);
        break;
      case 'S†':
      case 'SDG':
        // Sdg = [[1, 0], [0, -i]]
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, 0, -1);
        break;
      case 'T':
        // T = [[1, 0], [0, e^(i*pi/4)]]
        const cos_p4 = Math.cos(Math.PI / 4);
        const sin_p4 = Math.sin(Math.PI / 4);
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, cos_p4, sin_p4);
        break;
      case 'T†':
      case 'TDG':
        // Tdg = [[1, 0], [0, e^(-i*pi/4)]]
        const cos_p4_n = Math.cos(-Math.PI / 4);
        const sin_p4_n = Math.sin(-Math.PI / 4);
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, cos_p4_n, sin_p4_n);
        break;
      case 'P':
      case 'PHASE':
        // P = [[1, 0], [0, e^(i*theta)]]
        const cos_th = Math.cos(theta);
        const sin_th = Math.sin(theta);
        applySingleQubitGate(t, 1, 0, 0, 0, 0, 0, cos_th, sin_th);
        break;
      case 'RX':
        // Rx(theta) = [[cos(t/2), -i*sin(t/2)], [-i*sin(t/2), cos(t/2)]]
        const c_rx = Math.cos(theta / 2);
        const s_rx = Math.sin(theta / 2);
        applySingleQubitGate(t, c_rx, 0, 0, -s_rx, 0, -s_rx, c_rx, 0);
        break;
      case 'RY':
        // Ry(theta) = [[cos(t/2), -sin(t/2)], [sin(t/2), cos(t/2)]]
        const c_ry = Math.cos(theta / 2);
        const s_ry = Math.sin(theta / 2);
        applySingleQubitGate(t, c_ry, 0, -s_ry, 0, s_ry, 0, c_ry, 0);
        break;
      case 'RZ':
        // Rz(phi) = [[e^(-i*phi/2), 0], [0, e^(i*phi/2)]]
        const cos_z = Math.cos(-phi / 2);
        const sin_z = Math.sin(-phi / 2);
        const cos_z_p = Math.cos(phi / 2);
        const sin_z_p = Math.sin(phi / 2);
        applySingleQubitGate(t, cos_z, sin_z, 0, 0, 0, 0, cos_z_p, sin_z_p);
        break;
      case 'U':
      case 'U3':
        // U3(theta, phi, lambda)
        const c_u = Math.cos(theta / 2);
        const s_u = Math.sin(theta / 2);
        // u00 = cos(t/2)
        // u01 = -e^(i*lambda)*sin(t/2) = - (cos(l) + i*sin(l))*sin(t/2)
        const u01_r = -Math.cos(lambda) * s_u;
        const u01_i = -Math.sin(lambda) * s_u;
        // u10 = e^(i*phi)*sin(t/2) = (cos(p) + i*sin(p))*sin(t/2)
        const u10_r = Math.cos(phi) * s_u;
        const u10_i = Math.sin(phi) * s_u;
        // u11 = e^(i*(phi+lambda))*cos(t/2)
        const u11_r = Math.cos(phi + lambda) * c_u;
        const u11_i = Math.sin(phi + lambda) * c_u;

        applySingleQubitGate(t, c_u, 0, u01_r, u01_i, u10_r, u10_i, u11_r, u11_i);
        break;

      case 'CX':
      case 'CNOT':
        if (c !== null) {
          applyControlledGate(c, t, 0, 0, 1, 0, 1, 0, 0, 0);
        }
        break;
      case 'CY':
        if (c !== null) {
          applyControlledGate(c, t, 0, 0, 0, -1, 0, 1, 0, 0);
        }
        break;
      case 'CZ':
        if (c !== null) {
          applyControlledGate(c, t, 1, 0, 0, 0, 0, 0, -1, 0);
        }
        break;
      case 'SWAP':
        if (gate.targets && gate.targets.length === 2) {
          applySWAP(gate.targets[0], gate.targets[1]);
        }
        break;

      case 'CCX':
      case 'TOFFOLI':
        if (gate.controls && gate.controls.length === 2) {
          applyMultiControlledGate(gate.controls, t, 0, 0, 1, 0, 1, 0, 0, 0);
        }
        break;
      case 'RCCX':
        // RCCX is relative-phase Toffoli. Its matrix is:
        // Same as CCX but target has some relative phase offsets.
        // For the sake of standard composer studio simulation, we can simulate its exact action:
        // CCX applied, followed by phase updates. Or we can approximate it as CCX for visual purposes,
        // but let's implement CCX for it since it behaves similarly for probabilities.
        if (gate.controls && gate.controls.length === 2) {
          applyMultiControlledGate(gate.controls, t, 0, 0, 1, 0, 1, 0, 0, 0);
        }
        break;
      case 'RC3X':
        // RC3X is relative-phase 3-controlled X.
        if (gate.controls && gate.controls.length === 3) {
          applyMultiControlledGate(gate.controls, t, 0, 0, 1, 0, 1, 0, 0, 0);
        }
        break;

      case 'QFT':
        // QFT applied on the gate's targets
        if (gate.targets && gate.targets.length > 0) {
          const qftTargets = gate.targets;
          for (let i = 0; i < qftTargets.length; i++) {
            const tgt = qftTargets[i];
            const sq2 = 1.0 / Math.sqrt(2);
            applySingleQubitGate(tgt, sq2, 0, sq2, 0, sq2, 0, -sq2, 0);
            for (let j = i + 1; j < qftTargets.length; j++) {
              const ctrl = qftTargets[j];
              const phase = Math.PI / (1 << (j - i));
              applyCP(ctrl, tgt, phase);
            }
          }
          // Swaps
          for (let i = 0; i < Math.floor(qftTargets.length / 2); i++) {
            applySWAP(qftTargets[i], qftTargets[qftTargets.length - 1 - i]);
          }
        }
        break;

      case 'IQFT':
        // IQFT applied on the gate's targets (reverse of QFT)
        if (gate.targets && gate.targets.length > 0) {
          const qftTargets = gate.targets;
          // Swaps first
          for (let i = 0; i < Math.floor(qftTargets.length / 2); i++) {
            applySWAP(qftTargets[i], qftTargets[qftTargets.length - 1 - i]);
          }
          // Reverse rotations
          for (let i = qftTargets.length - 1; i >= 0; i--) {
            const tgt = qftTargets[i];
            for (let j = qftTargets.length - 1; j > i; j--) {
              const ctrl = qftTargets[j];
              const phase = -Math.PI / (1 << (j - i));
              applyCP(ctrl, tgt, phase);
            }
            const sq2 = 1.0 / Math.sqrt(2);
            applySingleQubitGate(tgt, sq2, 0, sq2, 0, sq2, 0, -sq2, 0);
          }
        }
        break;

      case 'RESET':
        applyReset(t);
        break;

      case 'MEASURE':
      case 'BARRIER':
      default:
        // Measure, barrier do not alter statevector in this theoretical simulator
        break;
    }
  }

  // Extract results
  const statevector = [];
  const probabilities = {};
  const counts = {};

  for (let i = 0; i < N; i++) {
    const r = re[i];
    const img = im[i];
    const prob = r * r + img * img;

    statevector.push({ real: r, imag: img });

    // Binary key, padded to numQubits (big-endian string representation, e.g. "00000010" with index 2 mapping to q1 = 1)
    let stateStr = '';
    for (let q = numQubits - 1; q >= 0; q--) {
      stateStr += (i & (1 << q)) ? '1' : '0';
    }

    probabilities[stateStr] = prob;
    // Mock counts based on probability (total 1024 shots)
    counts[stateStr] = Math.round(prob * 1024);
  }

  return {
    statevector,
    probabilities,
    counts,
    numQubits
  };
}
