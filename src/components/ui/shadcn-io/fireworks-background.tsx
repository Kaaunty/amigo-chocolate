import { useEffect, useRef } from 'react';
import { cn } from '../../../lib/utils';
import './fireworks-background.css';

interface FireworksBackgroundProps {
  className?: string;
  active?: boolean;
  fireworkSpeed?: { min: number; max: number };
  fireworkSize?: { min: number; max: number };
  particleSpeed?: { min: number; max: number };
  particleSize?: { min: number; max: number };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  color: string;
}

interface Firework {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
  particles: Particle[];
}

export function FireworksBackground({
  className,
  active = true,
  fireworkSpeed = { min: 8, max: 16 },
  fireworkSize = { min: 4, max: 10 },
  particleSpeed = { min: 4, max: 14 },
  particleSize = { min: 2, max: 10 },
}: FireworksBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fireworksRef = useRef<Firework[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hasPlayedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  // Cores da marca (Manual de Identidade Visual), visíveis sobre fundo branco
  const colors = [
    '#E30613', // Vermelho Rainha das Sete
    '#FF4D5A', // Vermelho claro
    '#A8040E', // Vermelho profundo
    '#0D181C', // Preto
    '#4A5559', // Cinza
  ];

  useEffect(() => {
    if (!active) {
      // Reset quando active muda para false
      hasPlayedRef.current = false;
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      fireworksRef.current = [];
      particlesRef.current = [];
      return;
    }

    if (!canvasRef.current) {
      return;
    }

    // Reset para permitir múltiplas execuções quando active muda para true
    hasPlayedRef.current = false;
    isAnimatingRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const createFirework = () => {
      const x = Math.random() * canvas.width;
      const y = canvas.height * 0.8;
      const speed = fireworkSpeed.min + Math.random() * (fireworkSpeed.max - fireworkSpeed.min);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      const size = fireworkSize.min + Math.random() * (fireworkSize.max - fireworkSize.min);
      const color = colors[Math.floor(Math.random() * colors.length)];

      const firework: Firework = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size,
        color,
        particles: [],
      };

      fireworksRef.current.push(firework);
    };

    const explodeFirework = (firework: Firework) => {
      const particleCount = 30 + Math.floor(Math.random() * 20);
      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = particleSpeed.min + Math.random() * (particleSpeed.max - particleSpeed.min);
        const size = particleSize.min + Math.random() * (particleSize.max - particleSize.min);

        particlesRef.current.push({
          x: firework.x,
          y: firework.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.015 + Math.random() * 0.01,
          size,
          color: firework.color,
        });
      }
    };

    const animate = () => {
      if (!ctx || !isAnimatingRef.current) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Atualizar fogos de artifício
      fireworksRef.current = fireworksRef.current.filter((firework) => {
        firework.x += firework.vx;
        firework.y += firework.vy;
        firework.vy += 0.2; // Gravidade
        firework.life -= 0.02;

        if (firework.life > 0) {
          ctx.globalAlpha = firework.life;
          ctx.fillStyle = firework.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = firework.color;
          ctx.beginPath();
          ctx.arc(firework.x, firework.y, firework.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          return true;
        } else {
          explodeFirework(firework);
          return false;
        }
      });

      // Atualizar partículas
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravidade
        particle.vx *= 0.99; // Resistência do ar
        particle.vy *= 0.99;
        particle.life -= particle.decay;

        if (particle.life > 0) {
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          ctx.shadowBlur = 15;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          return true;
        }
        return false;
      });

      ctx.globalAlpha = 1;

      // Criar novos fogos ocasionalmente (apenas nos primeiros 5 segundos)
      if (isAnimatingRef.current && fireworksRef.current.length < 3 && Math.random() < 0.02) {
        createFirework();
      }

      if (isAnimatingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Criar fogos iniciais
    for (let i = 0; i < 3; i++) {
      setTimeout(() => createFirework(), i * 500);
    }

    animate();

    // Parar após 5 segundos
    const cleanupTimeout = setTimeout(() => {
      isAnimatingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      fireworksRef.current = [];
      particlesRef.current = [];
    }, 5000);

    return () => {
      isAnimatingRef.current = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(cleanupTimeout);
      fireworksRef.current = [];
      particlesRef.current = [];
    };
  }, [active]);


  return (
    <canvas
      ref={canvasRef}
      className={cn('fireworks-background', className)}
      style={{ 
        display: active ? 'block' : 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    />
  );
}

