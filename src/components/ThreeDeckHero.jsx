import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play } from 'lucide-react';

export function ThreeDeckHero({ 
  activeGameTitle = "Grand Theft Auto V", 
  activeGameThumb = "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg",
  activeGameCategory = "AAA / Console Classic",
  onLaunchGame
}) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 440;
    const height = container.clientHeight || 260;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 3D Object Group
    const deckGroup = new THREE.Group();
    scene.add(deckGroup);

    // Texture Loader for game artwork
    const textureLoader = new THREE.TextureLoader();
    let frontTexture = null;
    try {
      frontTexture = textureLoader.load(activeGameThumb);
      frontTexture.colorSpace = THREE.SRGBColorSpace;
    } catch {}

    // Minimalist Studio Materials
    const matteBodyMat = new THREE.MeshStandardMaterial({
      color: 0x141722,
      metalness: 0.35,
      roughness: 0.35
    });

    const frontArtworkMat = frontTexture ? new THREE.MeshStandardMaterial({
      map: frontTexture,
      metalness: 0.1,
      roughness: 0.25
    }) : matteBodyMat;

    const edgeAccentMat = new THREE.MeshStandardMaterial({
      color: 0x222636,
      metalness: 0.6,
      roughness: 0.2
    });

    // Materials order: [Right, Left, Top, Bottom, Front, Back]
    const materials = [
      edgeAccentMat,
      edgeAccentMat,
      edgeAccentMat,
      edgeAccentMat,
      frontArtworkMat,
      matteBodyMat
    ];

    // Minimalist Sleek 3D Cartridge / Slab (16:9 proportionate display)
    const slabGeometry = new THREE.BoxGeometry(3.6, 2.15, 0.28);
    const slabMesh = new THREE.Mesh(slabGeometry, materials);
    deckGroup.add(slabMesh);

    // Minimalist Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const softFillLight = new THREE.DirectionalLight(0x8899bb, 1.0);
    softFillLight.position.set(-4, -2, 3);
    scene.add(softFillLight);

    // Interactive Smooth Parallax & 3D Drag Rotation
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.08;
    let targetRotationY = -0.15;
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;
        deckGroup.rotation.y += deltaX * 0.012;
        deckGroup.rotation.x += deltaY * 0.012;
      } else {
        targetRotationY = mouseX * 0.45;
        targetRotationX = -mouseY * 0.35;
      }

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseDown = (e) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    // Animation Loop
    let animId;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Gentle floating animation
      if (!isDragging) {
        deckGroup.position.y = Math.sin(elapsed * 1.5) * 0.08;
        deckGroup.rotation.y += (targetRotationY - deckGroup.rotation.y) * 0.06;
        deckGroup.rotation.x += (targetRotationX - deckGroup.rotation.x) * 0.06;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      slabGeometry.dispose();
      matteBodyMat.dispose();
      if (frontTexture) frontTexture.dispose();
    };
  }, [activeGameThumb]);

  return (
    <div 
      className="relative w-full rounded-xl bg-[#0E1017] border border-white/[0.08] p-4 flex flex-col items-center justify-between overflow-hidden shadow-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D WebGL Canvas */}
      <div 
        ref={mountRef} 
        className="w-full h-52 sm:h-60 cursor-grab active:cursor-grabbing flex items-center justify-center"
      />

      {/* Minimalist Info Caption */}
      <div className="w-full pt-3 mt-1 border-t border-white/[0.06] flex items-center justify-between text-xs">
        <div className="truncate mr-3">
          <span className="text-[11px] text-slate-400 block font-mono uppercase tracking-wider">
            {activeGameCategory}
          </span>
          <span className="text-white font-medium truncate block text-sm">
            {activeGameTitle}
          </span>
        </div>

        {onLaunchGame && (
          <button 
            onClick={onLaunchGame}
            className="min-btn min-btn-primary py-1.5 px-3 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch</span>
          </button>
        )}
      </div>
    </div>
  );
}
