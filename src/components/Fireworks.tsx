import { useEffect, useRef } from 'react';
import './Fireworks.css';

interface FireworksProps {
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  decay: number;
}

const Fireworks = ({ active }: FireworksProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const hasPlayedRef = useRef(false);
  const isAnimatingRef = useRef(false);

  useEffect(() => {
    if (!active || !canvasRef.current || hasPlayedRef.current) {
      return;
    }

    // Marcar como já executado
    hasPlayedRef.current = true;
    isAnimatingRef.current = true;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ajustar tamanho do canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const colors = [
      '#FFD700', // Gold
      '#C98A5B', // Caramel
      '#F2C078', // Honey
      '#45B7D1', // Blue
      '#8A5A3C', // Cocoa
      '#E0A25A', // Light caramel
      '#F7DC6F', // Yellow
      '#BB8FCE', // Purple
      '#9c5a0c', // Caramel
      '#D4A373', // Toffee
    ];

    const createFirework = () => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * (canvas.height * 0.3) + canvas.height * 0.1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const particleCount = 30 + Math.floor(Math.random() * 20);

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const speed = 2 + Math.random() * 4;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          life: 1,
          decay: 0.015 + Math.random() * 0.01,
        });
      }
    };

    const animate = () => {
      if (!ctx || !isAnimatingRef.current) return;

      // Limpar canvas completamente (transparente)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Atualizar e desenhar partículas
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.1; // Gravidade
        particle.life -= particle.decay;

        if (particle.life > 0) {
          ctx.globalAlpha = particle.life;
          ctx.fillStyle = particle.color;
          
          // Brilho
          ctx.shadowBlur = 15;
          ctx.shadowColor = particle.color;
          
          ctx.beginPath();
          const size = 2 + particle.life * 1.5;
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.shadowBlur = 0;
          
          return true;
        }
        return false;
      });

      ctx.globalAlpha = 1;
      
      // Continuar animação enquanto estiver ativo
      if (isAnimatingRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Criar alguns fogos iniciais
    for (let i = 0; i < 5; i++) {
      setTimeout(() => createFirework(), i * 300);
    }

    // Iniciar animação
    animate();

    // Parar animação após 5 segundos
    const cleanupTimeout = setTimeout(() => {
      isAnimatingRef.current = false;
      particlesRef.current = [];
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }, 5000);

    return () => {
      isAnimatingRef.current = false;
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(cleanupTimeout);
      particlesRef.current = [];
    };
  }, [active]);

  // Reset quando active muda para false
  useEffect(() => {
    if (!active) {
      hasPlayedRef.current = false;
    }
  }, [active]);

  return <canvas ref={canvasRef} className="fireworks-canvas" />;
};

export default Fireworks;

