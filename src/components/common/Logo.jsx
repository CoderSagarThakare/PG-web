import React from 'react';

export const Logo = ({ size = 48, showText = true, subtitle, className = '', centered = false }) => {
  return (
    <div 
      className={`logo-container ${className}`} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: centered ? 'center' : 'flex-start',
        gap: '12px' 
      }}
    >
      <img 
        src="/Logo.png" 
        alt="StaySync Logo" 
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))'
        }} 
      />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: centered ? 'center' : 'flex-start' }}>
          <h1 style={{ 
            fontSize: size * 0.5, 
            fontWeight: 800, 
            margin: 0,
            lineHeight: 1,
            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            StaySync
          </h1>
          {subtitle && (
            <p style={{ 
              fontSize: size * 0.28, 
              color: 'var(--text-muted)', 
              margin: '4px 0 0 0',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              lineHeight: 1
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
