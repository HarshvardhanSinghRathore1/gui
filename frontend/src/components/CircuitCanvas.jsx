import React, { useState } from 'react';
import { Plus, Check } from 'lucide-react';

export default function CircuitCanvas({ 
  gates, 
  onUpdateGates, 
  isInspecting, 
  numQubits = 8, 
  numClassical = 2 
}) {
  const [dragOverCell, setDragOverCell] = useState(null); // { row, col }
  const [quickAddMenu, setQuickAddMenu] = useState(null); // { row, col }
  const [activeEditGateId, setActiveEditGateId] = useState(null);

  const totalColumns = 16;
  const qubitSpacing = 55; // vertical spacing
  const colWidth = 60; // horizontal column spacing

  const activeEditGate = gates.find(g => g.id === activeEditGateId);
  const activeEditCol = activeEditGate ? activeEditGate.column : null;

  // Drag and Drop over cells
  const handleDragOver = (e, row, col) => {
    e.preventDefault();
    // Prevent dragging over active edit column if editing
    if (activeEditCol !== null && col !== activeEditCol) return;
    setDragOverCell({ row, col });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = (e, row, col) => {
    e.preventDefault();
    setDragOverCell(null);

    const gateType = e.dataTransfer.getData('text/plain');
    const moveGateId = e.dataTransfer.getData('moveGateId');

    if (moveGateId) {
      // Move existing gate
      const updated = gates.map(gate => {
        if (gate.id === moveGateId) {
          // Adjust target and controls based on relative movement
          const diffRow = row - gate.targets[0];
          const newTargets = gate.targets.map(t => t + diffRow);
          const newControls = gate.controls ? gate.controls.map(c => c + diffRow) : [];

          // Keep in bounds [0, numQubits-1]
          const inBounds = newTargets.every(t => t >= 0 && t < numQubits) && 
                          newControls.every(c => c >= 0 && c < numQubits);

          if (inBounds) {
            return {
              ...gate,
              column: col,
              targets: newTargets,
              controls: newControls
            };
          }
        }
        return gate;
      });
      onUpdateGates(updated);
    } else if (gateType) {
      // Add new gate
      let controls = [];
      let targets = [row];

      // Handle default controls for multi-qubit gates
      const gateTypeUpper = gateType.toUpperCase();
      if (gateTypeUpper === 'CX' || gateTypeUpper === 'CY' || gateTypeUpper === 'CZ') {
        const controlQubit = row > 0 ? row - 1 : row + 1;
        controls = [controlQubit];
      } else if (gateTypeUpper === 'CCX' || gateTypeUpper === 'RCCX') {
        const ctrl1 = row > 1 ? row - 1 : row + 1;
        const ctrl2 = row > 1 ? row - 2 : row + 2;
        controls = [ctrl1, ctrl2];
      } else if (gateTypeUpper === 'RC3X') {
        const ctrl1 = row > 2 ? row - 1 : row + 1;
        const ctrl2 = row > 2 ? row - 2 : row + 2;
        const ctrl3 = row > 2 ? row - 3 : row + 3;
        controls = [ctrl1, ctrl2, ctrl3];
      } else if (gateTypeUpper === 'SWAP') {
        const target2 = row > 0 ? row - 1 : row + 1;
        targets = [row, target2];
      }

      const newGateId = `gate_${Date.now()}`;
      const newGate = {
        id: newGateId,
        type: gateType,
        targets,
        controls,
        column: col,
        params: { theta: '1.57', phi: '1.57', lambda: '3.14' } // default params
      };

      onUpdateGates([...gates, newGate]);

      // Automatically open connection editing for controlled gates
      if (['CX', 'CY', 'CZ', 'CCX', 'RCCX', 'RC3X', 'SWAP'].includes(gateTypeUpper)) {
        setActiveEditGateId(newGateId);
      }
    }
  };

  const handleGateDragStart = (e, gateId) => {
    // Prevent dragging other gates while editing connections
    if (activeEditGateId !== null) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('moveGateId', gateId);
  };

  const handleDeleteGate = (e, gateId) => {
    e.preventDefault(); // Prevent context menu
    const updated = gates.filter(gate => gate.id !== gateId);
    onUpdateGates(updated);
    if (activeEditGateId === gateId) {
      setActiveEditGateId(null);
    }
  };

  // Connection reassignment handlers
  const handleAssignControl = (gate, qubitIndex) => {
    const typeUpper = gate.type.toUpperCase();
    let newControls = [...(gate.controls || [])];
    let newTargets = [...(gate.targets || [])];

    // A qubit cannot be both control and target
    newTargets = newTargets.filter(t => t !== qubitIndex);

    if (['CX', 'CY', 'CZ'].includes(typeUpper)) {
      // exactly 1 control
      newControls = [qubitIndex];
    } else if (['CCX', 'RCCX'].includes(typeUpper)) {
      // up to 2 controls
      if (newControls.includes(qubitIndex)) {
        newControls = newControls.filter(c => c !== qubitIndex);
      } else {
        if (newControls.length >= 2) {
          newControls.shift(); // remove oldest
        }
        newControls.push(qubitIndex);
      }
    } else if (typeUpper === 'RC3X') {
      // up to 3 controls
      if (newControls.includes(qubitIndex)) {
        newControls = newControls.filter(c => c !== qubitIndex);
      } else {
        if (newControls.length >= 3) {
          newControls.shift();
        }
        newControls.push(qubitIndex);
      }
    }

    const updated = gates.map(g => g.id === gate.id ? { ...g, controls: newControls, targets: newTargets } : g);
    onUpdateGates(updated);
  };

  const handleAssignTarget = (gate, qubitIndex) => {
    const typeUpper = gate.type.toUpperCase();
    let newControls = [...(gate.controls || [])];
    let newTargets = [...(gate.targets || [])];

    // A qubit cannot be both control and target
    newControls = newControls.filter(c => c !== qubitIndex);

    if (['CX', 'CY', 'CZ', 'CCX', 'RCCX', 'RC3X'].includes(typeUpper)) {
      // exactly 1 target
      newTargets = [qubitIndex];
    } else if (typeUpper === 'SWAP') {
      // up to 2 targets
      if (newTargets.includes(qubitIndex)) {
        newTargets = newTargets.filter(t => t !== qubitIndex);
      } else {
        if (newTargets.length >= 2) {
          newTargets.shift();
        }
        newTargets.push(qubitIndex);
      }
    }

    const updated = gates.map(g => g.id === gate.id ? { ...g, controls: newControls, targets: newTargets } : g);
    onUpdateGates(updated);
  };

  // Quick Add Menu Handler
  const handleQuickAddClick = (row) => {
    // Find the next available column on this wire
    const gatesOnWire = gates.filter(g => g.targets.includes(row) || (g.controls && g.controls.includes(row)));
    const nextCol = gatesOnWire.length > 0 ? Math.max(...gatesOnWire.map(g => g.column)) + 1 : 0;
    const finalCol = nextCol < totalColumns ? nextCol : totalColumns - 1;

    setQuickAddMenu({ row, col: finalCol });
  };

  const addQuickGate = (gateType) => {
    if (quickAddMenu) {
      const { row, col } = quickAddMenu;
      let controls = [];
      let targets = [row];

      const gateTypeUpper = gateType.toUpperCase();
      if (gateTypeUpper === 'CX') {
        controls = [row > 0 ? row - 1 : row + 1];
      }

      const newGateId = `gate_${Date.now()}`;
      const newGate = {
        id: newGateId,
        type: gateType,
        targets,
        controls,
        column: col,
        params: { theta: '1.57', phi: '1.57', lambda: '3.14' }
      };

      onUpdateGates([...gates, newGate]);
      setQuickAddMenu(null);

      if (['CX', 'CY', 'CZ', 'CCX', 'RCCX', 'RC3X', 'SWAP'].includes(gateTypeUpper)) {
        setActiveEditGateId(newGateId);
      }
    }
  };

  // Helper to color-code gates on the canvas
  const getGateColorClass = (type) => {
    const t = type.toUpperCase();
    if (t === 'H') return 'bg-[#da1e28] text-white'; // Red
    if (['T', 'S', 'Z', 'T†', 'S†', 'P', 'RZ'].includes(t)) return 'bg-[#0072c3] text-white'; // Light Blue
    if (['CX', 'CY', 'CZ', 'SWAP', 'CCX', 'RCCX', 'RC3X'].includes(t)) return 'bg-[#0f62fe] text-white'; // Blue
    if (['RX', 'RY', 'U', 'QFT', 'IQFT'].includes(t)) return 'bg-[#ff7eb6] text-black'; // Pink
    if (['MEASURE', 'RESET', 'BARRIER'].includes(t)) return 'bg-[#8d8d8d] text-white'; // Grey
    return 'bg-[#A6E1FA] text-black'; // Default Light cyan
  };

  // Draw connecting line between controls and targets (CNOT, Toffoli, SWAP)
  const renderMultiQubitConnections = (col) => {
    const gatesInCol = gates.filter(g => g.column === col);
    return gatesInCol.map((gate) => {
      const allQubits = [...(gate.targets || []), ...(gate.controls || [])];
      if (allQubits.length < 2) return null;

      const minQ = Math.min(...allQubits);
      const maxQ = Math.max(...allQubits);

      // Vertical line coordinates
      const x = colWidth / 2 + col * colWidth;
      const y1 = qubitSpacing / 2 + minQ * qubitSpacing;
      const y2 = qubitSpacing / 2 + maxQ * qubitSpacing;

      return (
        <line
          key={`conn_${gate.id}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke={gate.type.toUpperCase() === 'BARRIER' ? '#8d8d8d' : '#0f62fe'}
          strokeWidth={gate.type.toUpperCase() === 'BARRIER' ? '6' : '2'}
          strokeDasharray={gate.type.toUpperCase() === 'BARRIER' ? '4 2' : '0'}
          className={gate.type.toUpperCase() === 'BARRIER' ? 'opacity-30' : 'opacity-80'}
        />
      );
    });
  };

  // Render C / T assignment overlay buttons
  const renderConnectionEditorForCell = (row, gate) => {
    const typeUpper = gate.type.toUpperCase();
    const isControl = gate.controls && gate.controls.includes(row);
    const isTarget = gate.targets && gate.targets.includes(row);

    const showControl = !['SWAP'].includes(typeUpper);
    const showTarget = true;

    return (
      <div className="flex items-center space-x-1 bg-[#161616] border border-[#393939] rounded px-1 py-1 z-20 shadow-lg scale-95">
        {showControl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssignControl(gate, row);
            }}
            className={`w-[22px] h-[22px] rounded-full text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
              isControl 
                ? 'bg-[#0f62fe] text-white border border-white' 
                : 'border border-dashed border-[#525252] text-[#8d8d8d] hover:border-white hover:text-white'
            }`}
            title="Set Control"
          >
            C
          </button>
        )}
        {showTarget && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssignTarget(gate, row);
            }}
            className={`w-[22px] h-[22px] rounded-full text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
              isTarget 
                ? 'bg-[#ff7eb6] text-black border border-black' 
                : 'border border-dashed border-[#525252] text-[#8d8d8d] hover:border-white hover:text-white'
            }`}
            title="Set Target"
          >
            T
          </button>
        )}
      </div>
    );
  };

  // Render individual gate components
  const renderGatesInCell = (row, col) => {
    const cellGates = gates.filter(g => g.column === col && (g.targets.includes(row) || (g.controls && g.controls.includes(row))));
    
    return cellGates.map((gate) => {
      const isTarget = gate.targets.includes(row);
      const isControl = gate.controls && gate.controls.includes(row);
      const typeUpper = gate.type.toUpperCase();

      // CNOT targets (CX, CCX, RCCX, RC3X) render as ⊕ circle
      if (['CX', 'CCX', 'RCCX', 'RC3X'].includes(typeUpper) && isTarget) {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveEditGateId(gate.id);
            }}
            className="w-10 h-10 rounded-full bg-[#0f62fe] border border-white text-white flex items-center justify-center font-bold text-[20px] shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative group z-10"
            title={`${gate.type} target on q[${row}]. Click to edit connections.`}
          >
            ⊕
            {isInspecting && (
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black border border-[#393939] text-white text-[10px] p-1 rounded whitespace-nowrap shadow opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                {gate.type} (Col {gate.column})
              </span>
            )}
          </div>
        );
      }

      // Control dots (render as solid blue dot)
      if (isControl) {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveEditGateId(gate.id);
            }}
            className="w-3.5 h-3.5 rounded-full bg-[#0f62fe] border border-white shadow cursor-grab active:cursor-grabbing hover:scale-125 transition-transform relative group z-10"
            title={`Control qubit q[${row}]. Click to edit connections.`}
          >
            {isInspecting && (
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-black border border-[#393939] text-white text-[10px] p-1 rounded whitespace-nowrap shadow opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                Control for {gate.type}
              </span>
            )}
          </div>
        );
      }

      // CZ target is drawn as control dot or Z box (we use control dot for symmetry)
      if (typeUpper === 'CZ' && isTarget) {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveEditGateId(gate.id);
            }}
            className="w-3.5 h-3.5 rounded-full bg-[#0f62fe] border border-white shadow cursor-grab active:cursor-grabbing hover:scale-125 transition-transform relative group z-10"
            title={`CZ target on q[${row}]. Click to edit connections.`}
          >
          </div>
        );
      }

      // CY target is drawn as standard Y gate box
      if (typeUpper === 'CY' && isTarget) {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveEditGateId(gate.id);
            }}
            className="w-10 h-10 rounded bg-[#0f62fe] border border-white text-white flex items-center justify-center font-semibold text-[13px] shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform relative group z-10"
            title={`CY target on q[${row}]. Click to edit connections.`}
          >
            Y
          </div>
        );
      }

      // SWAP targets are drawn as small X's
      if (typeUpper === 'SWAP') {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            onClick={(e) => {
              e.stopPropagation();
              setActiveEditGateId(gate.id);
            }}
            className="w-8 h-8 rotate-45 border-2 border-[#0f62fe] bg-[#161616] text-[#0f62fe] font-bold text-[14px] flex items-center justify-center shadow cursor-grab active:cursor-grabbing hover:scale-110 transition-transform z-10"
            title={`SWAP on q[${row}]. Click to edit connections.`}
          >
            +
          </div>
        );
      }

      // Normal single qubit gate or multi-qubit blocks (barrier, QFT)
      if (isTarget) {
        return (
          <div
            key={gate.id}
            draggable
            onDragStart={(e) => handleGateDragStart(e, gate.id)}
            onContextMenu={(e) => handleDeleteGate(e, gate.id)}
            className={`w-10 h-10 rounded ${getGateColorClass(gate.type)} flex flex-col items-center justify-center font-semibold text-[12px] shadow-md border border-black/10 cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 transition-all relative group z-10`}
          >
            <span className="leading-none">{gate.type}</span>
            {gate.type === 'p' || gate.type === 'RX' || gate.type === 'RY' || gate.type === 'RZ' ? (
              <span className="text-[7.5px] opacity-75 mt-0.5">
                θ: {gate.params.theta || gate.params.phi || '1.5'}
              </span>
            ) : null}

            {isInspecting && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-[#161616] border border-[#393939] text-gray-200 text-[10px] p-2 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-30 pointer-events-none w-36">
                <div className="font-semibold text-white border-b border-[#393939] pb-0.5 mb-1">{gate.type} Gate</div>
                <div>Col: {gate.column}</div>
                {gate.params && Object.keys(gate.params).map(k => (
                  <div key={k} className="capitalize text-gray-400">{k}: {gate.params[k]}</div>
                ))}
              </div>
            )}
          </div>
        );
      }

      return null;
    });
  };

  return (
    <div 
      className="flex-1 bg-[#262626] overflow-auto flex flex-col relative select-none p-6"
      onClick={() => setActiveEditGateId(null)} // Click canvas background to exit edit mode
    >
      {/* Grid Canvas Wrapper */}
      <div className="flex-1 flex flex-row min-w-[1000px]">
        {/* Left Side: Qubit Wire Labels */}
        <div className="w-16 flex flex-col pt-[7px] border-r border-[#393939]/40 pr-3 z-10 bg-[#262626]">
          {Array.from({ length: numQubits }).map((_, idx) => (
            <div 
              key={`label_${idx}`} 
              className="h-[55px] flex items-center justify-end text-[13px] text-gray-400 font-mono"
            >
              q[{idx}]
            </div>
          ))}
          {/* Classical wire label */}
          <div className="h-[50px] flex items-center justify-end text-[13px] text-gray-400 font-mono mt-2">
            c[{numClassical}]
          </div>
        </div>

        {/* Right Side: Scrollable Grid Area */}
        <div className="flex-1 relative" style={{ height: numQubits * qubitSpacing + 100 }}>
          {/* SVG Connection Lines overlay */}
          <svg 
            className="absolute inset-0 pointer-events-none w-full z-0" 
            style={{ height: numQubits * qubitSpacing + 80 }}
          >
            {Array.from({ length: totalColumns }).map((_, c) => renderMultiQubitConnections(c))}
          </svg>

          {/* Edit Mode Header Overlay */}
          {activeEditCol !== null && (
            <div
              className="absolute bg-[#161616] border border-[#393939] text-[#33b1ff] font-mono text-[9.5px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-30 shadow-lg flex items-center space-x-1.5"
              style={{
                left: activeEditCol * colWidth + (colWidth - 85) / 2,
                top: -24,
                width: 85,
                justifyContent: 'center'
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#33b1ff] animate-ping" />
              <span>EDIT {activeEditGate.type}</span>
            </div>
          )}

          {/* Grid Rows */}
          {Array.from({ length: numQubits }).map((_, r) => {
            const isTargetedByAdd = quickAddMenu && quickAddMenu.row === r;
            return (
              <div 
                key={`wire_row_${r}`} 
                className="h-[55px] flex items-center relative"
              >
                {/* Horizontal wire line */}
                <div 
                  className="absolute left-0 right-0 h-[1.5px] bg-[#525252] pointer-events-none z-0"
                />

                {/* Columns in Row */}
                <div className="flex z-10 w-full">
                  {Array.from({ length: totalColumns }).map((_, c) => {
                    const isOver = dragOverCell && dragOverCell.row === r && dragOverCell.col === c;
                    const isActiveCol = activeEditCol === c;
                    const isDimmed = activeEditCol !== null && !isActiveCol;

                    return (
                      <div
                        key={`cell_${r}_${c}`}
                        onDragOver={(e) => handleDragOver(e, r, c)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, r, c)}
                        onClick={(e) => {
                          if (isDimmed) {
                            e.stopPropagation();
                            setActiveEditGateId(null);
                          }
                        }}
                        className={`flex items-center justify-center relative cursor-crosshair transition-all duration-200 ${
                          isDimmed ? 'opacity-25' : ''
                        }`}
                        style={{ width: colWidth, height: qubitSpacing }}
                      >
                        {/* Drag hover visual indicator */}
                        {isOver && (
                          <div className="absolute inset-1 border-2 border-dashed border-[#33b1ff] rounded bg-[#33b1ff]/10 pointer-events-none animate-pulse" />
                        )}

                        {/* Connection configuration overlay OR normal gates rendering */}
                        {isActiveCol ? (
                          renderConnectionEditorForCell(r, activeEditGate)
                        ) : (
                          renderGatesInCell(r, c)
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Gate Button on the right of each wire */}
                <div className="absolute right-4 flex items-center z-20">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAddClick(r);
                    }}
                    className="w-10 h-10 rounded-full border border-white bg-[#161616] hover:bg-[#33b1ff]/15 hover:border-[#33b1ff] text-white flex items-center justify-center transition-all cursor-pointer shadow hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-5 h-5 text-gray-300 hover:text-white" />
                  </button>

                  {/* Quick Add Dropdown Menu */}
                  {isTargetedByAdd && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setQuickAddMenu(null)} />
                      <div className="absolute right-12 bottom-0 bg-[#161616] border border-[#393939] rounded shadow-xl p-2 z-40 grid grid-cols-4 gap-1.5 w-44">
                        {['H', 'X', 'Y', 'Z', 'S', 'T', 'CX', 'Measure'].map((gate) => (
                          <button
                            key={gate}
                            onClick={() => addQuickGate(gate)}
                            className="px-2 py-1.5 bg-[#262626] hover:bg-[#33b1ff] hover:text-black rounded text-[11px] font-semibold text-gray-300 transition-colors"
                          >
                            {gate}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Done checkmark button at the bottom of active column */}
          {activeEditCol !== null && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveEditGateId(null);
              }}
              className="absolute bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-1.5 shadow-2xl border border-white/20 transition-all z-30 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
              style={{
                left: activeEditCol * colWidth + (colWidth - 28) / 2,
                top: numQubits * qubitSpacing + 6,
                width: 28,
                height: 28
              }}
              title="Save Connections"
            >
              <Check className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Classical wire */}
          <div className="h-[40px] flex items-center relative mt-4">
            <div className="absolute left-0 right-0 h-[2px] bg-[#525252] border-b border-[#525252]" />
            <div className="absolute left-0 right-0 h-[2px] bg-[#525252] mt-[4px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
