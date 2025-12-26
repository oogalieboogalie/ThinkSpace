import { useState, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';

interface ProximityOptions {
  proximityRadius?: number; // Distance in pixels before UI appears
  fadeDuration?: number; // Animation duration in ms
  spawnOffset?: number; // How far from cursor to spawn
}

export const useProximity = (options: ProximityOptions = {}) => {
  const {
    proximityRadius = 100,
    fadeDuration = 300,
    spawnOffset = 20
  } = options;

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);
  const [spawnPos, setSpawnPos] = useState({ x: 0, y: 0 });
  const elementRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const elementCenterX = rect.left + rect.width / 2;
        const elementCenterY = rect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(e.clientX - elementCenterX, 2) +
          Math.pow(e.clientY - elementCenterY, 2)
        );

        const wasNear = isNear;
        const shouldBeNear = distance < proximityRadius;

        if (shouldBeNear !== wasNear) {
          setIsNear(shouldBeNear);

          if (shouldBeNear) {
            // Calculate spawn position based on cursor direction
            const angle = Math.atan2(
              e.clientY - elementCenterY,
              e.clientX - elementCenterX
            );

            setSpawnPos({
              x: elementCenterX + Math.cos(angle) * spawnOffset,
              y: elementCenterY + Math.sin(angle) * spawnOffset
            });
          }
        }
      }
    };

    const handleMouseLeave = () => {
      setIsNear(false);
    };

    document.addEventListener('mousemove', handleMouseMove);

    if (elementRef.current) {
      elementRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (elementRef.current) {
        elementRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [proximityRadius, spawnOffset, isNear]);

  return {
    cursorPos,
    isNear,
    spawnPos,
    elementRef,
    // CSS for the spawned UI
    getSpawnedUIStyle: () => ({
      position: 'fixed',
      left: `${spawnPos.x}px`,
      top: `${spawnPos.y}px`,
      transform: `translate(-50%, -50%) scale(${isNear ? 1 : 0.3})`,
      opacity: isNear ? 1 : 0,
      transition: `all ${fadeDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      pointerEvents: isNear ? ('auto' as CSSProperties['pointerEvents']) : ('none' as CSSProperties['pointerEvents']),
      zIndex: 9999,
    } as CSSProperties),
    getSpawnedUIClass: () => `
      proximity-ui
      ${isNear ? 'proximity-active' : 'proximity-inactive'}
    `,
  };
};

// Utility hook for edge proximity (for sidebars, etc.)
export const useEdgeProximity = (edge: 'left' | 'right' | 'top' | 'bottom', options: ProximityOptions = {}) => {
  const {
    proximityRadius = 75,
    fadeDuration = 300,
  } = options;

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      let distanceToEdge = 0;
      switch (edge) {
        case 'left':
          distanceToEdge = e.clientX;
          break;
        case 'right':
          distanceToEdge = window.innerWidth - e.clientX;
          break;
        case 'top':
          distanceToEdge = e.clientY;
          break;
        case 'bottom':
          distanceToEdge = window.innerHeight - e.clientY;
          break;
      }

      const shouldBeNear = distanceToEdge < proximityRadius;
      if (shouldBeNear !== isNear) {
        setIsNear(shouldBeNear);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [edge, proximityRadius, isNear]);

  return {
    cursorPos,
    isNear,
    getEdgeUIStyle: () => {
      const baseStyle = {
        position: 'fixed' as const,
        transition: `all ${fadeDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        zIndex: 9999,
        pointerEvents: isNear ? 'auto' : 'none' as const,
      };

      switch (edge) {
        case 'left':
          return {
            ...baseStyle,
            left: '0',
            top: '0',
            bottom: '0',
            width: isNear ? '300px' : '0',
            opacity: isNear ? 1 : 0,
            transform: `translateX(${isNear ? '0' : '-100%'})`,
          };
        case 'right':
          return {
            ...baseStyle,
            right: '0',
            top: '0',
            bottom: '0',
            width: isNear ? '300px' : '0',
            opacity: isNear ? 1 : 0,
            transform: `translateX(${isNear ? '0' : '100%'})`,
          };
        case 'top':
          return {
            ...baseStyle,
            top: '0',
            left: '0',
            right: '0',
            height: isNear ? '200px' : '0',
            opacity: isNear ? 1 : 0,
            transform: `translateY(${isNear ? '0' : '-100%'})`,
          };
        case 'bottom':
          return {
            ...baseStyle,
            bottom: '0',
            left: '0',
            right: '0',
            height: isNear ? '200px' : '0',
            opacity: isNear ? 1 : 0,
            transform: `translateY(${isNear ? '0' : '100%'})`,
          };
      }
    },
  };
};
