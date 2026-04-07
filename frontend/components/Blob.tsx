"use client";

import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial, Float } from "@react-three/drei";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import * as THREE from "three";

function BlobMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const [clicked, setClicked] = useState(false);
  
  // Reset ripple after a short time
  useEffect(() => {
    if (clicked) {
      const timer = setTimeout(() => setClicked(false), 600);
      return () => clearTimeout(timer);
    }
  }, [clicked]);

  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;
    
    // Continuous rotation without pointer tracking
    meshRef.current.rotation.x += delta * 0.1;
    meshRef.current.rotation.y += delta * 0.15;
    meshRef.current.rotation.z += delta * 0.05;
    
    // Smoothly and slowly cycle through light pastel colors
    const hue = (state.clock.elapsedTime * 0.05) % 1; // Very slow color cycle over 20 seconds
    materialRef.current.color.setHSL(hue, 0.6, 0.85); // High lightness (0.85) to keep it pastel/light
    
    // Ripple effect interpolation
    const targetDistort = clicked ? 0.8 : 0.45;
    const targetSpeed = clicked ? 8 : 2.5;
    const targetScale = clicked ? 2.1 : 1.9;
    
    // Lerp properties for smooth transition
    materialRef.current.distort = THREE.MathUtils.lerp(materialRef.current.distort, targetDistort, 0.1);
    materialRef.current.speed = THREE.MathUtils.lerp(materialRef.current.speed, targetSpeed, 0.1);
    
    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, 0.15);
    meshRef.current.scale.set(nextScale, nextScale, nextScale);
  });

  return (
    <Float floatIntensity={1} rotationIntensity={0.5} speed={2}>
      <mesh 
        ref={meshRef} 
        scale={1.9} 
        onClick={() => setClicked(true)}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
      >
        <sphereGeometry args={[1, 128, 128]} />
        <MeshDistortMaterial
          ref={materialRef}
          color="#d1d1eb"
          roughness={0.2}
          metalness={0.3}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
          iridescence={1}
          iridescenceIOR={1.5}
          iridescenceThicknessRange={[100, 400]}
          distort={0.45}
          speed={2.5}
        />
      </mesh>
    </Float>
  );
}

export function Blob() {
  return (
    <div className="w-full h-screen absolute inset-0 bg-[#79C3CC] flex flex-col items-center justify-center overflow-hidden">
      
      {/* Brand in Top Left Without Icon */}
      <div className="absolute top-0 left-0 z-20 p-8 flex items-center pointer-events-none">
        <span className="text-white font-semibold text-2xl tracking-tight drop-shadow-sm">Vocalize</span>
      </div>

      {/* Typography layer overlaying the 3D canvas */}
      <div className="absolute z-10 w-full flex flex-col items-center justify-center pointer-events-none gap-8 mt-4">
         <h1 
           className="text-[12vw] md:text-[130px] font-thin text-white leading-tight text-center tracking-tighter max-w-6xl drop-shadow-md" 
         >
           Listen. Think. Speak.
         </h1>

         <Link 
           href="#"
           className="pointer-events-auto mt-4 flex items-center gap-3 px-10 py-5 bg-white text-[#79C3CC] font-semibold rounded-full hover:scale-105 hover:shadow-2xl transition-all shadow-lg text-xl"
         >
           Coming Soon
           <ArrowRight className="w-6 h-6" />
         </Link>
      </div>

      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={2.5} color="#ffffff" />
        <directionalLight position={[-10, 10, -5]} intensity={2} color="#00ffff" />
        <spotLight position={[0, -10, 5]} intensity={3} color="#a600ff" angle={0.8} penumbra={1} />
        <spotLight position={[10, 0, -5]} intensity={2.5} color="#ff007f" />
        <pointLight position={[0, 0, 5]} intensity={1} color="#ffffff" />
        
        <BlobMesh />
      </Canvas>
      
      {/* Circular text decoration at the bottom */}
      <div className="absolute bottom-10 z-10 pointer-events-none">
         <div className="relative w-32 h-32 flex items-center justify-center animate-[spin_12s_linear_infinite]">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full text-white">
              <path id="circle" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" fill="none" />
              <text fontSize="7.5" letterSpacing="1.5" fill="currentColor">
                <textPath href="#circle">
                  BUILD AUTONOMOUS VOICE AGENTS • RAG • 
                </textPath>
              </text>
            </svg>
            <div className="w-3 h-3 border-2 border-white rotate-45" /> 
         </div>
      </div>
      
    </div>
  );
}
