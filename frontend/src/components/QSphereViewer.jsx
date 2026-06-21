import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function QSphereViewer({ simulationResult }) {
  const mountRef = useRef(null);
  const [showStateLabels, setShowStateLabels] = useState(true);
  const [showPhaseAngle, setShowPhaseAngle] = useState(true);

  // Keep references to animate and rotate the sphere
  const sphereGroupRef = useRef(new THREE.Group());
  const mouseRef = useRef({ x: 0, y: 0, isDown: false });
  const rotationRef = useRef({ x: 0.3, y: 0.5 }); // Initial angles

  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x262626);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 18;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Group to hold the Q-sphere parts (for easy rotation)
    const sphereGroup = sphereGroupRef.current;
    // Clear previous children
    while(sphereGroup.children.length > 0) { 
      sphereGroup.remove(sphereGroup.children[0]); 
    }
    scene.add(sphereGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Draw Transparent Sphere
    const sphereRadius = 5;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 16);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x444444,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphereGroup.add(mainSphere);

    // Draw White Orbit Rings (Latitude Circles for Hamming weights 1 to 7)
    // 8 qubits means 9 Hamming weight levels (0 to 8). Level 0 and 8 are poles.
    const numQubits = simulationResult.numQubits || 8;
    for (let w = 1; w < numQubits; w++) {
      const theta = Math.PI * w / numQubits;
      const ringRadius = sphereRadius * Math.sin(theta);
      const ringY = sphereRadius * Math.cos(theta);

      const curve = new THREE.EllipseCurve(
        0, 0,
        ringRadius, ringRadius,
        0, 2 * Math.PI,
        false,
        0
      );
      const points = curve.getPoints(64);
      const ringGeo = new THREE.BufferGeometry().setFromPoints(
        points.map(p => new THREE.Vector3(p.x, ringY, p.y))
      );
      const ringMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
      const ring = new THREE.Line(ringGeo, ringMat);
      sphereGroup.add(ring);
    }

    // Precalculate Hamming weights and groupings for 2^numQubits states
    const numStates = 1 << numQubits;
    const statesByWeight = {};
    for (let w = 0; w <= numQubits; w++) {
      statesByWeight[w] = [];
    }

    for (let i = 0; i < numStates; i++) {
      // Calculate hamming weight
      let weight = 0;
      let temp = i;
      while (temp > 0) {
        if (temp & 1) weight++;
        temp >>= 1;
      }
      statesByWeight[weight].push(i);
    }

    // Sort states in each weight group to lay them out sequentially
    for (let w = 0; w <= numQubits; w++) {
      statesByWeight[w].sort((a, b) => a - b);
    }

    // Compute coordinates for state node:
    const getStatePosition = (stateIndex) => {
      // Find Hamming weight
      let weight = 0;
      let temp = stateIndex;
      while (temp > 0) {
        if (temp & 1) weight++;
        temp >>= 1;
      }

      const theta = Math.PI * weight / numQubits; // latitude
      
      const group = statesByWeight[weight];
      const k = group.indexOf(stateIndex);
      const count = group.length;

      const phi = count > 1 ? (2 * Math.PI * k) / count : 0.0; // longitude

      const x = sphereRadius * Math.sin(theta) * Math.cos(phi);
      const y = sphereRadius * Math.cos(theta); // North pole (000) is positive Y
      const z = sphereRadius * Math.sin(theta) * Math.sin(phi);

      return new THREE.Vector3(x, y, z);
    };

    // Draw all basis state nodes as faint tiny dots (inactive state markers)
    const pointsGeo = new THREE.BufferGeometry();
    const pointsPositions = [];
    for (let i = 0; i < numStates; i++) {
      const pos = getStatePosition(i);
      pointsPositions.push(pos.x, pos.y, pos.z);
    }
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointsPositions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: 0x555555,
      size: 0.12,
      transparent: true,
      opacity: 0.4
    });
    const inactivePoints = new THREE.Points(pointsGeo, pointsMat);
    sphereGroup.add(inactivePoints);

    // Draw active states (probability > 0.001) with amplitude vector and colored node
    const statevector = simulationResult.statevector || [];
    
    statevector.forEach((amp, idx) => {
      const prob = amp.real * amp.real + amp.imag * amp.imag;
      if (prob < 0.001) return;

      const pos = getStatePosition(idx);

      // 1. Calculate phase angle
      const phase = Math.atan2(amp.imag, amp.real); // [-pi, pi]
      
      // 2. Map phase to HSL color
      // IBM Q-Sphere uses conic style phase color mapping
      const hue = ((phase + Math.PI) / (2 * Math.PI) * 360) % 360;
      const color = new THREE.Color().setHSL(hue / 360, 1.0, 0.6);

      // 3. Draw Vector line from center
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        pos
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: color,
        linewidth: 2.5
      });
      const vectorLine = new THREE.Line(lineGeo, lineMat);
      sphereGroup.add(vectorLine);

      // 4. Draw node at the end (size based on amplitude = sqrt(prob))
      const nodeRadius = 0.15 + Math.sqrt(prob) * 0.45;
      const nodeGeo = new THREE.SphereGeometry(nodeRadius, 16, 16);
      const nodeMat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        shininess: 30
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.copy(pos);
      sphereGroup.add(nodeMesh);

      // 5. Draw light glow around the node
      const glowGeo = new THREE.SphereGeometry(nodeRadius * 1.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.15
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(pos);
      sphereGroup.add(glowMesh);
    });

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Mouse Interaction for Rotation
    const handleMouseDown = (e) => {
      mouseRef.current.isDown = true;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!mouseRef.current.isDown) return;
      const deltaX = e.clientX - mouseRef.current.x;
      const deltaY = e.clientY - mouseRef.current.y;

      rotationRef.current.y += deltaX * 0.007;
      rotationRef.current.x += deltaY * 0.007;

      // Clamp X rotation to prevent going upside down
      rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.x));

      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseUp = () => {
      mouseRef.current.isDown = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    dom.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Touch support
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        mouseRef.current.isDown = true;
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (!mouseRef.current.isDown || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - mouseRef.current.x;
      const deltaY = e.touches[0].clientY - mouseRef.current.y;

      rotationRef.current.y += deltaX * 0.007;
      rotationRef.current.x += deltaY * 0.007;
      rotationRef.current.x = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rotationRef.current.x));

      mouseRef.current.x = e.touches[0].clientX;
      mouseRef.current.y = e.touches[0].clientY;
    };

    dom.addEventListener('touchstart', handleTouchStart);
    dom.addEventListener('touchmove', handleTouchMove);
    dom.addEventListener('touchend', handleMouseUp);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smoothly rotate the group based on drag inputs
      sphereGroup.rotation.y = rotationRef.current.y;
      sphereGroup.rotation.x = rotationRef.current.x;

      // Slow idle rotation when not dragging
      if (!mouseRef.current.isDown) {
        rotationRef.current.y += 0.0015;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      dom.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('touchstart', handleTouchStart);
      dom.removeEventListener('touchmove', handleTouchMove);
      dom.removeEventListener('touchend', handleMouseUp);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && dom) {
        mountRef.current.removeChild(dom);
      }
    };
  }, [simulationResult]);

  // Find states with non-zero amplitude to show text indicators
  const getActiveStatesList = () => {
    const list = [];
    const statevector = simulationResult.statevector || [];
    const numQubits = simulationResult.numQubits || 8;
    
    statevector.forEach((amp, idx) => {
      const prob = amp.real * amp.real + amp.imag * amp.imag;
      if (prob > 0.005) {
        // Format binary state string
        let stateStr = '';
        for (let q = numQubits - 1; q >= 0; q--) {
          stateStr += (idx & (1 << q)) ? '1' : '0';
        }
        const phase = Math.atan2(amp.imag, amp.real);
        const phaseDeg = (phase * 180 / Math.PI).toFixed(0);

        list.push({
          state: stateStr,
          prob: (prob * 100).toFixed(1),
          phase: phaseDeg,
          real: amp.real.toFixed(3),
          imag: amp.imag.toFixed(3)
        });
      }
    });
    return list;
  };

  const activeStates = getActiveStatesList();

  return (
    <div className="h-[350px] bg-[#262626] border-t border-[#393939] p-4 flex flex-row relative select-none">
      {/* 3D Render Canvas */}
      <div className="flex-1 h-full min-w-0 cursor-grab active:cursor-grabbing relative" ref={mountRef}>
        
        {/* Overlay Checkboxes */}
        <div className="absolute top-0 right-0 bg-[#161616]/90 border border-[#393939] p-2.5 rounded text-[11px] space-y-1.5 z-20 flex flex-col shadow-lg">
          <label className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={showStateLabels}
              onChange={(e) => setShowStateLabels(e.target.checked)}
              className="accent-[#33b1ff]" 
            />
            <span>Show State Label</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer text-gray-300 hover:text-white">
            <input 
              type="checkbox" 
              checked={showPhaseAngle}
              onChange={(e) => setShowPhaseAngle(e.target.checked)}
              className="accent-[#33b1ff]" 
            />
            <span>Show Phase Angle</span>
          </label>
        </div>

        {/* Phase Wheel Legend in Lower Left Corner */}
        <div className="absolute bottom-0 left-0 bg-[#161616]/90 border border-[#393939] p-3 rounded z-20 flex flex-row items-center space-x-3 shadow-lg select-none">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Phase Wheel</span>
            <div className="flex items-center space-x-1.5">
              <div 
                className="w-10 h-10 rounded-full border border-[#393939]" 
                style={{
                  background: 'conic-gradient(from 0deg, #ff3366, #ff9933, #ffff33, #33cc33, #3399ff, #9933ff, #ff3366)'
                }}
              />
              <div className="flex flex-col text-[8.5px] text-gray-400 font-mono">
                <span className="text-[#ff3366]">0 rad (0°)</span>
                <span className="text-[#ffff33]">π/2 rad (90°)</span>
                <span className="text-[#3399ff]">π rad (180°)</span>
                <span className="text-[#9933ff]">-π/2 rad (-90°)</span>
              </div>
            </div>
          </div>
        </div>

        <h3 className="absolute top-0 left-0 text-[13px] font-semibold tracking-wider text-gray-400 uppercase">
          Q-Sphere Visualization
        </h3>
      </div>

      {/* State List Panel on the Right Side of Q-Sphere (visual summary of active states) */}
      <div className="w-[180px] h-full border-l border-[#393939]/50 pl-4 flex flex-col overflow-y-auto">
        <h4 className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-2">
          State Details
        </h4>
        <div className="flex-1 space-y-2 text-[11px] font-mono-qasm">
          {activeStates.map((item, idx) => (
            <div key={idx} className="bg-[#1f1f1f] border border-[#393939] p-2 rounded">
              <div className="text-[#33b1ff] font-semibold">
                |{item.state}⟩
              </div>
              <div className="flex justify-between text-gray-400 text-[10px] mt-1">
                <span>Prob:</span>
                <span className="text-white">{item.prob}%</span>
              </div>
              {showPhaseAngle && (
                <div className="flex justify-between text-gray-400 text-[10px]">
                  <span>Phase:</span>
                  <span className="text-white">{item.phase}°</span>
                </div>
              )}
              {showStateLabels && (
                <div className="text-[9.5px] text-gray-500 mt-1 pt-1 border-t border-[#393939]/30">
                  {item.real} + {item.imag}i
                </div>
              )}
            </div>
          ))}

          {activeStates.length === 0 && (
            <div className="text-gray-500 text-center py-6 text-[10px]">
              No states detected
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
