import React, { useEffect, useRef } from "react";

export default function InfernalCanvas({ madness = true, onFpsUpdate }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Particle system
    const particleCount = madness ? 120 : 60;
    const particles = [];

    const mouse = {
      x: width / 2,
      y: height / 2,
      prevX: width / 2,
      prevY: height / 2,
      vx: 0,
      vy: 0,
      radius: madness ? 180 : 120,
    };

    const handleMouseMove = (e) => {
      mouse.vx = e.clientX - mouse.prevX;
      mouse.vy = e.clientY - mouse.prevY;
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Color palettes
    const infernalColors = [
      "rgba(255, 59, 48, ",   // Crimson red
      "rgba(255, 149, 0, ",   // Ember orange
      "rgba(255, 204, 0, ",   // Solar gold
      "rgba(147, 51, 234, ",  // Void purple
      "rgba(236, 72, 153, ",  // Neon magenta
    ];

    const elegantColors = [
      "rgba(99, 102, 241, ",  // Indigo
      "rgba(56, 189, 248, ",  // Sky cyan
      "rgba(139, 92, 246, ",  // Violet
      "rgba(148, 163, 184, ", // Slate
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * (madness ? 3.5 : 2) + 0.8,
        speedX: (Math.random() - 0.5) * (madness ? 2.5 : 0.8),
        speedY: (Math.random() - 0.5) * (madness ? 2.5 : 0.8) - (madness ? 0.6 : 0.2), // upward drift for embers
        baseAlpha: Math.random() * 0.7 + 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        pulseSpeed: Math.random() * 0.05 + 0.01,
        colorPrefix: madness
          ? infernalColors[Math.floor(Math.random() * infernalColors.length)]
          : elegantColors[Math.floor(Math.random() * elegantColors.length)],
        life: Math.random() * 100,
      });
    }

    // FPS tracker
    let lastTime = performance.now();
    let frameCount = 0;
    let fps = 60;

    const render = (currentTime) => {
      frameCount++;
      if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
        if (onFpsUpdate) onFpsUpdate(fps, particles.length);
      }

      ctx.clearRect(0, 0, width, height);

      // Ambient radial dark gradient following cursor
      if (madness) {
        const radGlow = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          10,
          mouse.x,
          mouse.y,
          mouse.radius * 2
        );
        radGlow.addColorStop(0, "rgba(255, 60, 0, 0.08)");
        radGlow.addColorStop(0.5, "rgba(147, 51, 234, 0.03)");
        radGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = radGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw and update particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life += p.pulseSpeed;
        p.alpha = p.baseAlpha + Math.sin(p.life) * 0.25;

        // Mouse gravity / velocity interaction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * (madness ? 2.5 : 1.2);
          if (madness) {
            // Embers vortex toward and scatter around cursor
            p.x += (dx / dist) * force * 1.5 + mouse.vx * 0.15;
            p.y += (dy / dist) * force * 1.5 + mouse.vy * 0.15;
            p.alpha = Math.min(1, p.alpha + 0.4);
          } else {
            // Soft deflection
            p.x -= (dx / dist) * force * 0.8;
            p.y -= (dy / dist) * force * 0.8;
          }
        }

        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around bounds
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.colorPrefix}${Math.max(0, p.alpha)})`;
        ctx.shadowBlur = madness ? p.size * 3.5 : p.size * 1.5;
        ctx.shadowColor = `${p.colorPrefix}0.8)`;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset
      }

      // Connect close particles with subtle energy filaments in madness mode
      if (madness) {
        ctx.lineWidth = 0.5;
        for (let i = 0; i < particles.length; i += 2) {
          for (let j = i + 1; j < particles.length; j += 3) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 75) {
              ctx.strokeStyle = `rgba(255, 120, 40, ${0.15 * (1 - dist / 75)})`;
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.stroke();
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [madness, onFpsUpdate]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
      style={{ opacity: madness ? 0.95 : 0.6 }}
    />
  );
}
