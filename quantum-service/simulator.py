import sys
import json
import traceback

def main():
    try:
        import qiskit
        from qiskit import QuantumCircuit
        from qiskit.quantum_info import Statevector
    except ImportError:
        print(json.dumps({
            "error": "Qiskit is not installed in the Python environment. Please install it using 'pip install qiskit qiskit-aer'.",
            "fallback": True
        }))
        sys.exit(1)

    try:
        # Read QASM from stdin
        qasm_str = sys.stdin.read().strip()
        if not qasm_str:
            print(json.dumps({"error": "Empty QASM input"}))
            sys.exit(1)

        # Parse QASM
        try:
            qc = QuantumCircuit.from_qasm_str(qasm_str)
        except Exception as pe:
            print(json.dumps({
                "error": f"QASM Parse Error: {str(pe)}",
                "details": traceback.format_exc()
            }))
            sys.exit(1)

        # Clone and remove measurements to get the theoretical statevector
        qc_no_meas = qc.copy()
        try:
            qc_no_meas.remove_final_measurements(inplace=True)
        except Exception:
            pass

        # Compute Statevector
        try:
            sv = Statevector(qc_no_meas)
            sv_data = sv.data
            probabilities_dict = sv.probabilities_dict()
        except Exception as se:
            print(json.dumps({
                "error": f"Statevector simulation failed: {str(se)}",
                "details": traceback.format_exc()
            }))
            sys.exit(1)

        # Format statevector output
        # For N qubits, we want states to be zero-padded to the number of qubits
        num_qubits = qc.num_qubits if qc.num_qubits > 0 else 1
        
        # Build statevector array of {real, imag}
        statevector_list = []
        for val in sv_data:
            statevector_list.append({
                "real": float(val.real),
                "imag": float(val.imag)
            })

        # Format probabilities with binary state keys (e.g. "00000000")
        formatted_probs = {}
        for state_str, prob in probabilities_dict.items():
            # Qiskit states are usually binary strings, e.g., '01'
            # Let's ensure it is padded correctly to the num_qubits
            padded_state = state_str.zfill(num_qubits)
            formatted_probs[padded_state] = float(prob)

        # Try to run counts using Aer or basic Sampler if counts are needed
        counts = {}
        has_meas = any(instr.operation.name == 'measure' for instr in qc.data)
        
        if has_meas:
            try:
                # Try using AerSimulator
                from qiskit_aer import AerSimulator
                simulator = AerSimulator()
                # Run and get counts
                result = simulator.run(qc, shots=1024).result()
                counts = result.get_counts(qc)
            except ImportError:
                # Fallback to shot simulation using Statevector
                try:
                    counts = sv.sample_counts(shots=1024)
                except Exception:
                    pass
            except Exception:
                try:
                    counts = sv.sample_counts(shots=1024)
                except Exception:
                    pass
        else:
            # If no measurements, counts are proportional to probabilities
            try:
                counts = sv.sample_counts(shots=1024)
            except Exception:
                pass

        # Format counts keys to ensure correct ordering/padding
        formatted_counts = {}
        for state_str, count in counts.items():
            padded_state = state_str.zfill(num_qubits)
            formatted_counts[padded_state] = int(count)

        response = {
            "success": True,
            "num_qubits": num_qubits,
            "statevector": statevector_list,
            "probabilities": formatted_probs,
            "counts": formatted_counts
        }

        print(json.dumps(response))

    except Exception as e:
        print(json.dumps({
            "error": f"General Exception: {str(e)}",
            "details": traceback.format_exc()
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
