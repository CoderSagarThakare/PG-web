import React from 'react';
import { cn } from '../../utils/cn';

export const Logo = ({ size = 48, showText = true, subtitle, className = '', centered = false }) => {
  return (
    <div 
      className={cn(
        'flex items-center gap-3',
        centered ? 'justify-center' : 'justify-start',
        className
      )}
    >
      <img 
        src="/Logo.png" 
        alt="StaySync Logo" 
        className="object-contain drop-shadow-md"
        style={{ 
          width: size, 
          height: size
        }} 
      />
      {showText && (
        <div className={cn('flex flex-col', centered ? 'items-center' : 'items-start')}>
          <h1 
            className="font-extrabold tracking-tight bg-gradient-to-br from-[#6c63ff] to-[#00d4aa] bg-clip-text text-transparent"
            style={{ 
              fontSize: size * 0.5, 
              lineHeight: 1
            }}
          >
            StaySync
          </h1>
          {subtitle && (
            <p 
              className="text-gray-500 dark:text-[#6b6e82] uppercase font-semibold"
              style={{ 
                fontSize: size * 0.28, 
                letterSpacing: '1px',
                lineHeight: 1,
                marginTop: '4px'
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
