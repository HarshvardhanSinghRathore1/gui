import React from 'react';
import { Play, Save, Download, Undo2, Redo2, Trash2 } from 'lucide-react';

export default function Toolbar({ 
  onRun,
  onSave,
  onExportQASM,
  onUndo, 
  onRedo, 
  onClear, 
  canUndo, 
  canRedo,
  isQiskitRunning
}) {
  return (
    <div className="h-11 bg-[#1f1f1f] border-b border-[#393939] px-4 flex items-center justify-between text-white text-[12.5px] select-none shrink-0">
      {/* Left: Run Button */}
      <div className="flex items-center">
        <button
          onClick={onRun}
          disabled={isQiskitRunning}
          className="flex items-center space-x-1.5 px-3.5 py-1 bg-[#0F62FE] hover:bg-[#0353e9] disabled:bg-[#0F62FE]/50 text-white rounded text-[12px] font-semibold transition-all cursor-pointer shadow-[0_2px_4px_rgba(15,98,254,0.3)] disabled:shadow-none"
        >
          <Play className={`w-3.5 h-3.5 ${isQiskitRunning ? 'animate-spin' : ''}`} />
          <span>{isQiskitRunning ? 'Running...' : 'Run'}</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={onSave}
          title="Save Circuit"
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#262626] hover:bg-[#333] border border-[#393939] rounded text-[11.5px] text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        <button
          onClick={onExportQASM}
          title="Export OpenQASM"
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#262626] hover:bg-[#333] border border-[#393939] rounded text-[11.5px] text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export QASM</span>
        </button>

        <div className="w-[1px] h-4 bg-[#393939] mx-1" />

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="p-1.5 hover:bg-[#333] disabled:opacity-30 disabled:hover:bg-transparent rounded text-gray-300 hover:text-white transition-colors cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-4 bg-[#393939] mx-1" />

        <button
          onClick={onClear}
          title="Clear Canvas"
          className="flex items-center space-x-1 px-2.5 py-1 bg-red-950/20 border border-red-900/50 hover:bg-red-900/35 text-red-400 hover:text-red-300 rounded transition-colors cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
