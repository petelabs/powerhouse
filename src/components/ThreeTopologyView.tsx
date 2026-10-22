import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { 
  RotateCcw, 
  Layers, 
  Minimize2, 
  Maximize2, 
  Cpu
} from 'lucide-react';
import { RepoItem } from '../types';

interface ThreeTopologyViewProps {
  currentRepo?: RepoItem | null;
  dataSaver?: boolean;
  onClose?: () => void;
}

export function ThreeTopologyView({ currentRepo, dataSaver = false, onClose }: ThreeTopologyViewProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<'iso' | 'core' | 'orbital' | 'top'>('iso');
  const [explodedFactor, setExplodedFactor] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>('Neural Core: Gemini Engine');

  const explodedRef = useRef(0);
  const autoRotateRef = useRef(true);
  const targetCamPos = useRef(new THREE.Vector3(12, 10, 14));
  const targetCamLook = useRef(new THREE.Vector3(0, 1.5, 0));

  explodedRef.current = explodedFactor;
  autoRotateRef.current = autoRotate;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 1. Scene & Background (Google AI Studio dark carbon)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131314);
    scene.fog = new THREE.FogExp2(0x131314, 0.025);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(12, 10, 14);

    // 3. Renderer with PBR settings
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. RoomEnvironment for realistic PBR reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Controls with damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 30;
    controls.target.set(0, 1.5, 0);

    // 6. Balanced 3-Point Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff0dd, 2.8);
    keyLight.position.set(8, 14, 8);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xa8c7fa, 0x1e1f20, 1.2);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x7dacf8, 1.8);
    rimLight.position.set(-8, 6, -8);
    scene.add(rimLight);

    // 7. Procedural Canvas Texture for Grid Floor
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const ctx = floorCanvas.getContext('2d')!;
    ctx.fillStyle = '#131314';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#282A2C';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }
    ctx.fillStyle = '#A8C7FA';
    for (let x = 64; x < 512; x += 128) {
      for (let y = 64; y < 512; y += 128) {
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
    }

    const gridTexture = new THREE.CanvasTexture(floorCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(12, 12);
    gridTexture.colorSpace = THREE.SRGBColorSpace;
    gridTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshStandardMaterial({
      map: gridTexture,
      roughness: 0.85,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    // Contact shadow
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.02;
    scene.add(shadowPlane);

    // 8. Procedural Model
    const rootTopologyGroup = new THREE.Group();
    scene.add(rootTopologyGroup);

    // Base Plinth
    const basePlinthGeo = new THREE.CylinderGeometry(3.5, 4.0, 0.4, 8);
    const basePlinthMat = new THREE.MeshStandardMaterial({
      color: 0x1e1f20,
      roughness: 0.75,
      metalness: 0.4,
    });
    const basePlinth = new THREE.Mesh(basePlinthGeo, basePlinthMat);
    basePlinth.position.y = 0.2;
    basePlinth.castShadow = !isSoftwareGl;
    basePlinth.receiveShadow = !isSoftwareGl;
    rootTopologyGroup.add(basePlinth);

    // Core Chamber
    const coreChamberGeo = new THREE.CylinderGeometry(2.4, 2.8, 1.8, 8);
    const coreChamberMat = new THREE.MeshStandardMaterial({
      color: 0x282a2c,
      roughness: 0.25,
      metalness: 0.85,
    });
    const coreChamber = new THREE.Mesh(coreChamberGeo, coreChamberMat);
    coreChamber.position.y = 1.3;
    coreChamber.castShadow = !isSoftwareGl;
    rootTopologyGroup.add(coreChamber);

    // Optical Glass
    const coreGlassGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 16);
    const coreGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xa8c7fa,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: isSoftwareGl ? 0.6 : 0.95,
      ior: 1.5,
    });
    const coreGlass = new THREE.Mesh(coreGlassGeo, coreGlassMat);
    coreGlass.position.y = 2.8;
    rootTopologyGroup.add(coreGlass);

    // Monolith
    const monolithGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x131314,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x7dacf8,
      emissiveIntensity: 0.45,
    });
    const monolith = new THREE.Mesh(monolithGeo, monolithMat);
    monolith.position.y = 2.8;
    monolith.castShadow = !isSoftwareGl;
    rootTopologyGroup.add(monolith);

    // Orbital Ring
    const ringGeo = new THREE.TorusGeometry(3.2, 0.08, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xa8c7fa,
      roughness: 0.2,
      metalness: 0.95,
    });
    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI / 2;
    orbitalRing.position.y = 2.2;
    rootTopologyGroup.add(orbitalRing);

    // Satellite Nodes
    interface SatelliteNodeData {
      name: string;
      role: string;
      color: number;
      baseX: number;
      baseZ: number;
      group: THREE.Group;
    }

    const satellites: SatelliteNodeData[] = [];
    const nodeDefs = [
      { name: 'Architect Node', role: 'Topology & Specification', color: 0x7dacf8, angle: 0 },
      { name: 'Builder Node', role: 'Code Implementation', color: 0xa8c7fa, angle: Math.PI / 2 },
      { name: 'Debugger Node', role: 'Root Cause Diagnostics', color: 0xf2b8b5, angle: Math.PI },
      { name: 'Reviewer Node', role: 'Security & Quality Gate', color: 0xffd700, angle: (3 * Math.PI) / 2 },
    ];

    nodeDefs.forEach(def => {
      const satGroup = new THREE.Group();
      const radius = 5.2;
      const x = Math.cos(def.angle) * radius;
      const z = Math.sin(def.angle) * radius;
      satGroup.position.set(x, 1.2, z);

      const sBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: 0x282a2c, roughness: 0.5, metalness: 0.6 })
      );
      sBase.castShadow = !isSoftwareGl;
      satGroup.add(sBase);

      const sCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.5, 0),
        new THREE.MeshStandardMaterial({
          color: def.color,
          roughness: 0.2,
          metalness: 0.8,
          emissive: def.color,
          emissiveIntensity: 0.35,
        })
      );
      sCrystal.position.y = 0.7;
      sCrystal.castShadow = !isSoftwareGl;
      satGroup.add(sCrystal);

      const sBeacon = new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.8, 16),
        new THREE.MeshBasicMaterial({ color: def.color, side: THREE.DoubleSide, transparent: true, opacity: 0.4 })
      );
      sBeacon.rotation.x = -Math.PI / 2;
      sBeacon.position.y = -0.19;
      satGroup.add(sBeacon);

      rootTopologyGroup.add(satGroup);
      satellites.push({
        name: def.name,
        role: def.role,
        color: def.color,
        baseX: x,
        baseZ: z,
        group: satGroup,
      });
    });

    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      camera.position.lerp(targetCamPos.current, 1 - Math.exp(-4 * dt));
      controls.target.lerp(targetCamLook.current, 1 - Math.exp(-4 * dt));
      controls.update();

      const exp = explodedRef.current;
      satellites.forEach(s => {
        const targetRadius = 5.2 + exp * 4.5;
        const currentAngle = Math.atan2(s.baseZ, s.baseX);
        s.group.position.x = Math.cos(currentAngle) * targetRadius;
        s.group.position.z = Math.sin(currentAngle) * targetRadius;
        s.group.position.y = 1.2 + exp * 1.5;
        s.group.rotation.y += 0.015;
      });

      orbitalRing.rotation.z += 0.01;
      monolith.rotation.y += 0.02;
      monolith.position.y = 2.8 + Math.sin(now * 0.002) * 0.12;

      if (autoRotateRef.current) {
        rootTopologyGroup.rotation.y += 0.004;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const setCameraPreset = (preset: 'iso' | 'core' | 'orbital' | 'top') => {
    setActivePreset(preset);
    if (preset === 'iso') {
      targetCamPos.current.set(12, 10, 14);
      targetCamLook.current.set(0, 1.5, 0);
    } else if (preset === 'core') {
      targetCamPos.current.set(4, 3.5, 5);
      targetCamLook.current.set(0, 2.5, 0);
    } else if (preset === 'orbital') {
      targetCamPos.current.set(16, 4, 16);
      targetCamLook.current.set(0, 1.5, 0);
    } else if (preset === 'top') {
      targetCamPos.current.set(0, 22, 0.1);
      targetCamLook.current.set(0, 0, 0);
    }
  };

  return (
    <div className="relative w-full h-[600px] md:h-[680px] bg-[#131314] rounded-xl overflow-hidden border border-[#333538]">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Header Badge */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="bg-[#1E1F20]/90 border border-[#333538] px-3 py-1.5 rounded-md flex items-center gap-2 pointer-events-auto">
          <Cpu size={15} className="text-[#A8C7FA]" />
          <span className="text-xs font-medium text-[#F0F4F9]">Repository Topology</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#282A2C] text-[#8E918F] font-mono">
            {currentRepo ? currentRepo.name : 'Powerhouse Core'}
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md bg-[#1E1F20]/90 border border-[#333538] hover:bg-[#282A2C] text-[#8E918F] hover:text-white pointer-events-auto transition"
            aria-label="Close 3D View"
          >
            <Minimize2 size={15} />
          </button>
        )}
      </div>

      {/* Collapsible Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[94%] max-w-[720px] pointer-events-auto z-10">
        <div className="flex justify-center -mb-px">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="bg-[#1E1F20] border-t border-x border-[#333538] px-3 py-1 rounded-t-md text-xs font-medium text-[#8E918F] hover:text-[#E3E3E3] flex items-center gap-1.5 shadow"
          >
            {isCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            <span>{isCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
          </button>
        </div>

        {!isCollapsed && (
          <div className="bg-[#1E1F20] border border-[#333538] rounded-xl p-3 shadow-xl flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#8E918F] mr-1">Camera</span>
                <button
                  onClick={() => setCameraPreset('iso')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    activePreset === 'iso' ? 'bg-[#A8C7FA] text-[#131314] font-medium' : 'bg-[#282A2C] text-[#C4C7C5] hover:text-white'
                  }`}
                >
                  Isometric
                </button>
                <button
                  onClick={() => setCameraPreset('core')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    activePreset === 'core' ? 'bg-[#A8C7FA] text-[#131314] font-medium' : 'bg-[#282A2C] text-[#C4C7C5] hover:text-white'
                  }`}
                >
                  Core
                </button>
                <button
                  onClick={() => setCameraPreset('orbital')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    activePreset === 'orbital' ? 'bg-[#A8C7FA] text-[#131314] font-medium' : 'bg-[#282A2C] text-[#C4C7C5] hover:text-white'
                  }`}
                >
                  Orbital
                </button>
                <button
                  onClick={() => setCameraPreset('top')}
                  className={`px-2.5 py-1 rounded text-xs transition ${
                    activePreset === 'top' ? 'bg-[#A8C7FA] text-[#131314] font-medium' : 'bg-[#282A2C] text-[#C4C7C5] hover:text-white'
                  }`}
                >
                  Top
                </button>
              </div>

              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
                  autoRotate ? 'bg-[#004A77] text-[#D3E3FD]' : 'bg-[#282A2C] text-[#8E918F]'
                }`}
              >
                <RotateCcw size={12} />
                <span>{autoRotate ? 'Rotating' : 'Paused'}</span>
              </button>
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-3 pt-1 border-t border-[#333538]">
              <div className="flex items-center gap-1.5 text-xs text-[#8E918F] min-w-[110px]">
                <Layers size={13} className="text-[#A8C7FA]" />
                <span>Explode Nodes</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedFactor}
                onChange={e => setExplodedFactor(parseFloat(e.target.value))}
                className="w-full accent-[#A8C7FA] cursor-pointer"
              />
              <span className="text-xs font-mono text-[#A8C7FA] min-w-[35px] text-right">
                {Math.round(explodedFactor * 100)}%
              </span>
            </div>

            <div className="bg-[#131314] border border-[#333538] p-2 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#A8C7FA]" />
                <span className="text-[#E3E3E3] font-medium">{selectedNode}</span>
              </div>
              <span className="text-[11px] text-[#8E918F]">
                PBR ACES Filmic · Procedural 60fps
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
