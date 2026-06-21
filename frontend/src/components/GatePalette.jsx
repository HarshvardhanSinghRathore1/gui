import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';

const GATE_DEFINITIONS = [
  // Red
  { type: 'H', category: 'single', colorClass: 'bg-[#da1e28] text-white font-bold', description: 'Hadamard: Creates superposition' },
  { type: 'X', category: 'single', colorClass: 'bg-[#da1e28] text-white font-bold', description: 'Pauli-X: Bit-flip (NOT)' },
  { type: 'Y', category: 'single', colorClass: 'bg-[#da1e28] text-white font-bold', description: 'Pauli-Y: Bit and Phase flip' },
  
  // Light Blue
  { type: 'Z', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'Pauli-Z: Phase flip' },
  { type: 'S', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'S gate: pi/2 phase shift' },
  { type: 'S†', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'S† gate: -pi/2 phase shift' },
  { type: 'T', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'T gate: pi/4 phase shift' },
  { type: 'T†', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'T† gate: -pi/4 phase shift' },
  { type: 'P', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'Phase gate: Custom angle theta' },
  { type: 'RZ', category: 'phase', colorClass: 'bg-[#0072c3] text-white font-semibold', description: 'Rotation Z: Rotation around Z axis' },

  // Blue (Controlled Gates)
  { type: 'CX', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'CNOT: Controlled-NOT' },
  { type: 'CY', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'Controlled-Y' },
  { type: 'CZ', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'Controlled-Z' },
  { type: 'SWAP', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'SWAP: Swap state of two qubits' },
  { type: 'CCX', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'Toffoli: Controlled-Controlled-NOT' },
  { type: 'RCCX', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'Relative Phase Toffoli' },
  { type: 'RC3X', category: 'controlled', colorClass: 'bg-[#0f62fe] text-white font-semibold', description: 'Relative Phase 3-Controlled NOT' },

  // Pink (Advanced / Rotations)
  { type: 'RX', category: 'rotation', colorClass: 'bg-[#ff7eb6] text-black font-semibold', description: 'Rotation X: Rotation around X axis' },
  { type: 'RY', category: 'rotation', colorClass: 'bg-[#ff7eb6] text-black font-semibold', description: 'Rotation Y: Rotation around Y axis' },
  { type: 'U', category: 'rotation', colorClass: 'bg-[#ff7eb6] text-black font-semibold', description: 'U3: Generic unitary gate' },
  { type: 'QFT', category: 'advanced', colorClass: 'bg-[#ff7eb6] text-black font-semibold', description: 'Quantum Fourier Transform' },
  { type: 'IQFT', category: 'advanced', colorClass: 'bg-[#ff7eb6] text-black font-semibold', description: 'Inverse Quantum Fourier Transform' },

  // Grey (Special)
  { type: 'Measure', category: 'special', colorClass: 'bg-[#8d8d8d] text-white font-semibold', description: 'Measurement: Collapse state to classical bit' },
  { type: 'Reset', category: 'special', colorClass: 'bg-[#8d8d8d] text-white font-semibold', description: 'Reset: Force state to |0>' },
  { type: 'Barrier', category: 'special', colorClass: 'bg-[#8d8d8d] text-white font-semibold', description: 'Barrier: Prevent compilation optimization' }
];

export default function GatePalette() {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredGate, setHoveredGate] = useState(null);

  const handleDragStart = (e, gateType) => {
    e.dataTransfer.setData('text/plain', gateType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredGates = GATE_DEFINITIONS.filter(gate => 
    gate.type.toLowerCase().includes(searchQuery.toLowerCase()) || 
    gate.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-[320px] bg-[#161616] border-r border-[#393939] flex flex-col select-none h-full text-white">
      {/* Title & Search */}
      <div className="p-4 border-b border-[#393939]">
        <h2 className="text-[16px] font-semibold tracking-wider text-gray-200 uppercase mb-3 flex items-center">
          Operations
        </h2>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search operations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#262626] border border-[#393939] focus:border-[#33b1ff] rounded py-1.5 pl-9 pr-3 text-[13px] outline-none text-white transition-all placeholder-gray-500"
          />
        </div>
      </div>

      {/* Grid of Gates */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-6 gap-2">
          {filteredGates.map((gate) => (
            <div
              key={gate.type}
              draggable
              onDragStart={(e) => handleDragStart(e, gate.type)}
              onMouseEnter={() => setHoveredGate(gate)}
              onMouseLeave={() => setHoveredGate(null)}
              className={`w-10 h-10 ${gate.colorClass} flex items-center justify-center rounded text-[13px] tracking-tight cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all shadow-[0_2px_4px_rgba(0,0,0,0.25)] border border-black/10 select-none`}
            >
              {gate.type}
            </div>
          ))}
        </div>

        {filteredGates.length === 0 && (
          <div className="text-[12px] text-gray-500 text-center py-6">
            No operations match your search.
          </div>
        )}
      </div>

      {/* Operation Details Tooltip / Info Panel */}
      <div className="h-32 bg-[#1f1f1f] border-t border-[#393939] p-4 flex flex-col justify-between">
        {hoveredGate ? (
          <div>
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span className="text-[13px] font-semibold text-white bg-[#333] px-1.5 py-0.5 rounded border border-[#444]">
                {hoveredGate.type}
              </span>
              <span className="text-[11px] text-[#33b1ff] uppercase tracking-wider font-semibold">
                {hoveredGate.category} Gate
              </span>
            </div>
            <p className="text-[11.5px] text-gray-300 leading-snug">
              {hoveredGate.description}
            </p>
          </div>
        ) : (
          <div className="flex items-start space-x-2 text-gray-500">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-[11.5px] leading-relaxed">
              Hover over a gate to view its action. Drag any gate onto a wire to place it in the circuit.
            </p>
          </div>
        )}
        <div className="text-[10px] text-gray-500 text-right self-end select-none">
          IBM Quantum Composer Inspired
        </div>
      </div>
    </aside>
  );
}
