import { useEffect, useRef, useState } from 'react';

export const BrainAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handleChange = () => setIsReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    fetch('/brain-character.svg')
      .then(response => response.text())
      .then(text => setSvgContent(text))
      .catch(err => console.error('Failed to load SVG:', err));
  }, []);

  useEffect(() => {
    if (isReducedMotion || !containerRef.current || !svgContent) return;
    
    const container = containerRef.current;
    const svgElement = container.querySelector('svg');
    if (!svgElement) return;

    const leftPupil = svgElement.getElementById('_مردمک_چپ') as SVGGElement | null;
    const rightPupil = svgElement.getElementById('_مردمک_راست') as SVGGElement | null;
    const bodyPart = svgElement.getElementById('_بدن_کاراکتر') as SVGGElement | null;
    
    if (!leftPupil || !rightPupil) return;

    const leftEyeCenter = { x: 658, y: 511.4 };
    const rightEyeCenter = { x: 377.1, y: 511.4 };
    const maxPupilMove = 15;

    const handleMouseMove = (e: MouseEvent) => {
      if (!svgElement) return;
      const svgRect = svgElement.getBoundingClientRect();
      const svgViewBox = svgElement.viewBox.baseVal;
      const mouseX = ((e.clientX - svgRect.left) / svgRect.width) * svgViewBox.width;
      const mouseY = ((e.clientY - svgRect.top) / svgRect.height) * svgViewBox.height;
      
      const leftAngle = Math.atan2(mouseY - leftEyeCenter.y, mouseX - leftEyeCenter.x);
      const rightAngle = Math.atan2(mouseY - rightEyeCenter.y, mouseX - rightEyeCenter.x);
      
      leftPupil.style.transform = `translate(${Math.cos(leftAngle) * maxPupilMove}px, ${Math.sin(leftAngle) * maxPupilMove}px)`;
      leftPupil.style.transition = 'transform 0.1s ease-out';
      rightPupil.style.transform = `translate(${Math.cos(rightAngle) * maxPupilMove}px, ${Math.sin(rightAngle) * maxPupilMove}px)`;
      rightPupil.style.transition = 'transform 0.1s ease-out';

      if (isHovering && bodyPart) {
        const centerX = svgViewBox.width / 2;
        const centerY = svgViewBox.height / 2;
        bodyPart.style.transform = `translate(${(mouseX - centerX) * 0.01}px, ${(mouseY - centerY) * 0.01}px)`;
        bodyPart.style.transition = 'transform 0.3s ease-out';
      } else if (bodyPart) {
        bodyPart.style.transform = 'translate(0, 0)';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isReducedMotion, svgContent, isHovering]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full mx-auto"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {svgContent ? (
        <div
          className={`w-full h-auto cursor-pointer ${!isReducedMotion ? 'brain-float' : ''}`}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          aria-label="Brain character with moving eyes"
        />
      ) : (
        <div className="w-full aspect-square bg-muted animate-pulse rounded-lg" />
      )}
    </div>
  );
};
