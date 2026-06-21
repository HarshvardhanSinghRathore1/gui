import React from 'react';
import Editor from '@monaco-editor/react';
import { Terminal, Copy, RotateCcw } from 'lucide-react';

export default function QasmEditor({ qasm, onChangeQasm, onResetQasm }) {
  const handleEditorDidMount = (editor, monaco) => {
    // Register OpenQASM 2.0 language
    monaco.languages.register({ id: 'openqasm' });

    // Custom monarch tokens provider
    monaco.languages.setMonarchTokensProvider('openqasm', {
      tokenizer: {
        root: [
          [/\b(OPENQASM|include|qreg|creg|barrier|measure|reset|gate)\b/, 'keyword'],
          [/\b(h|x|y|z|s|sdg|t|tdg|p|rx|ry|rz|u|u3|cx|cy|cz|swap|ccx|rccx|rc3x|qft|iqft)\b/, 'keyword'],
          [/"[^"]*"/, 'string'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/\/\/.*$/, 'comment'],
        ]
      }
    });

    // Custom dark theme matching IBM Quantum Composer exactly
    monaco.editor.defineTheme('qasm-theme-composer', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '00E5FF', fontStyle: 'bold' }, // cyan
        { token: 'string', foreground: 'FF7EB6' },                    // pink
        { token: 'number', foreground: 'FFFFFF' },                    // white
        { token: 'comment', foreground: '6E6E6E', fontStyle: 'italic' }
      ],
      colors: {
        'editor.background': '#161616',
        'editor.foreground': '#F4F4F4',
        'editor.lineHighlightBackground': '#262626',
        'editorCursor.foreground': '#00E5FF',
        'editorLineNumber.foreground': '#525252',
        'editorLineNumber.activeForeground': '#00E5FF',
        'editor.selectionBackground': '#393939'
      }
    });

    monaco.editor.setTheme('qasm-theme-composer');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(qasm);
  };

  return (
    <aside className="w-[380px] bg-[#161616] border-l border-[#393939] flex flex-col h-full text-white">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#393939] flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-[#33b1ff]" />
          <select className="bg-transparent text-[13px] font-semibold text-gray-200 outline-none cursor-pointer border-none font-mono-qasm">
            <option className="bg-[#161616] text-white">OpenQASM 2.0</option>
          </select>
        </div>

        <div className="flex items-center space-x-1.5">
          <button 
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 hover:bg-[#262626] rounded text-gray-400 hover:text-white transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button 
            onClick={onResetQasm}
            title="Reset Editor"
            className="p-1.5 hover:bg-[#262626] rounded text-gray-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 min-h-0 relative">
        <Editor
          height="100%"
          language="openqasm"
          value={qasm}
          onChange={(val) => onChangeQasm(val || '')}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'IBM Plex Mono', monospace",
            padding: { top: 12 }
          }}
        />
      </div>

      {/* Editor Status Footer */}
      <div className="h-10 bg-[#1f1f1f] border-t border-[#393939] px-4 flex items-center justify-between text-[11px] text-gray-500 font-mono-qasm">
        <span>Encoding: UTF-8</span>
        <span>Line Count: {qasm.split('\n').length}</span>
      </div>
    </aside>
  );
}
