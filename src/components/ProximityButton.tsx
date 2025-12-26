import React, { ReactNode } from 'react';
import { useProximity } from '../hooks/useProximity';

interface ProximityButtonProps {
  icon: ReactNode;
  label?: string;
  proximityRadius?: number;
  children: ReactNode; // The floating controls that appear
  onClick?: () => void;
}

const ProximityButton: React.FC<ProximityButtonProps> = ({
  icon,
  label,
  proximityRadius = 150,
  children,
  onClick,
}) => {
  const { cursorPos, isNear, elementRef, getSpawnedUIStyle } = useProximity({
    proximityRadius,
  });

  return (
    <>
      {/* Invisible trigger element */}
      <button
        ref={elementRef}
        onClick={onClick}
        className={`
          relative group
          transition-all duration-300
          hover:scale-110
        `}
      >
        {/* Main button */}
        <div
          className={`
            w-14 h-14 rounded-2xl
            bg-gradient-to-br from-primary to-blue-500
            shadow-lg shadow-purple-500/30
            flex items-center justify-center
            border-2 border-purple-400/50
            transition-all duration-300
            ${isNear ? 'scale-110 shadow-purple-500/60 border-purple-300' : 'group-hover:shadow-purple-500/40'}
          `}
          style={{
            background: isNear
              ? 'linear-gradient(135deg, #a855f7, #3b82f6, #06b6d4)'
              : undefined,
            boxShadow: isNear
              ? '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(59, 130, 246, 0.3)'
              : undefined,
          }}
        >
          <div
            className={`
              transition-transform duration-300
              ${isNear ? 'scale-125' : ''}
            `}
          >
            {icon}
          </div>

          {/* Ripple effect on hover */}
          <div
            className={`
              absolute inset-0 rounded-2xl
              transition-all duration-500
              ${isNear ? 'bg-purple-500/20 animate-ping' : ''}
            `}
          />

          {/* Glow effect */}
          {isNear && (
            <div
              className={`
                absolute -inset-2 rounded-2xl
                bg-gradient-to-r from-primary to-blue-500
                opacity-30 blur-xl
                animate-pulse
              `}
            />
          )}
        </div>

        {/* Label */}
        {label && (
          <div
            className={`
              absolute top-full mt-2 left-1/2 -translate-x-1/2
              px-3 py-1 bg-black/90 backdrop-blur-sm
              border border-primary/30 rounded-lg
              text-xs text-white font-medium whitespace-nowrap
              transition-all duration-300
              ${isNear ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}
            `}
          >
            {label}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-l border-t border-primary/30 rotate-45" />
          </div>
        )}
      </button>

      {/* Spawned Floating Controls */}
      {isNear && (
        <div style={getSpawnedUIStyle()}>
          <div
            className="relative"
            style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.95), rgba(15, 15, 35, 0.95))',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 0 50px rgba(168, 85, 247, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.1)',
              minWidth: '280px',
            }}
          >
            {/* Particles effect */}
            <div className="absolute inset-0 overflow-hidden rounded-16 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-purple-400 rounded-full animate-pulse"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                />
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10">
              {children}
            </div>

            {/* Connecting line to button */}
            <div
              className="absolute -top-12 left-1/2 -translate-x-1/2"
              style={{
                width: '2px',
                height: '40px',
                background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.8), transparent)',
              }}
            />
          </div>
        </div>
      )}

      {/* Cursor proximity indicator */}
      {isNear && (() => {
        const indicatorStyle: any = {
          position: 'fixed',
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
          width: `${proximityRadius * 2}px`,
          height: `${proximityRadius * 2}px`,
          transform: 'translate(-50%, -50%)',
          border: '2px dashed rgba(168, 85, 247, 0.3)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 9998,
          animation: 'pulse 2s ease-in-out infinite',
        };
        return <div style={indicatorStyle as React.CSSProperties} />;
      })()}
    </>
  );
};

export default ProximityButton;
