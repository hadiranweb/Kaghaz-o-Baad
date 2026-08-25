import { useEffect, useRef } from 'react';

interface PaperParticle { x: number; y: number; size: number; speed: number; sway: number; phase: number; rotation: number; opacity: number; }

export function AmbientPaperParticles({ count = 26, className = '' }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = canvas?.parentElement;
    if (!canvas || !section) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const particles: PaperParticle[] = [];
    let frame = 0;
    let running = false;
    let last = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = section.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      particles.length = 0;
      const scale = Math.min(1, Math.max(0.45, Math.sqrt((width * height) / (1440 * 900))));
      const total = Math.round(count * scale);
      for (let i = 0; i < total; i += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          size: 3 + Math.random() * 7,
          speed: 4 + Math.random() * 9,
          sway: 5 + Math.random() * 12,
          phase: Math.random() * Math.PI * 2,
          rotation: Math.random() * Math.PI,
          opacity: 0.12 + Math.random() * 0.22,
        });
      }
    };

    const draw = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000 || 0, 1 / 30);
      last = now;
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.y += particle.speed * dt;
        particle.phase += dt * 0.7;
        particle.rotation += dt * 0.35;
        if (particle.y > height + 16) {
          particle.y = -16;
          particle.x = Math.random() * width;
        }
        const x = particle.x + Math.sin(particle.phase) * particle.sway;
        context.save();
        context.translate(x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = particle.opacity;
        context.fillStyle = 'hsl(39 67% 70%)';
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.58);
        context.restore();
      });
      frame = window.requestAnimationFrame(draw);
    };

    const renderStatic = () => {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = particle.opacity;
        context.fillStyle = 'hsl(39 67% 70%)';
        context.fillRect(-particle.size / 2, -particle.size / 3, particle.size, particle.size * 0.58);
        context.restore();
      });
    };

    const start = () => {
      if (reduceMotion.matches || document.hidden || running) return;
      running = true;
      last = performance.now();
      frame = window.requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      window.cancelAnimationFrame(frame);
    };
    const onMotionChange = () => { stop(); renderStatic(); if (!reduceMotion.matches) start(); };
    const onVisibility = () => document.hidden ? stop() : start();
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting ? start() : stop(), { threshold: 0.02 });
    const resizeObserver = new ResizeObserver(() => { resize(); seed(); if (reduceMotion.matches) renderStatic(); });

    resize();
    seed();
    observer.observe(section);
    resizeObserver.observe(section);
    reduceMotion.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', onVisibility);
    if (reduceMotion.matches) renderStatic();
    else start();

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      reduceMotion.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', onVisibility);
      context.clearRect(0, 0, width, height);
    };
  }, [count]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />;
}
