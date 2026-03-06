import React from 'react';

interface HireShieldLogoProps {
  size?: number;
  className?: string;
}

const HireShieldLogo = ({ 
  size = 48,
  className = ""
}: HireShieldLogoProps) => {
  return (
    <svg 
      width={size * 4} 
      height={size} 
      viewBox="0 0 240 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        letterSpacing: '-0.02em'
      }}
    >
      <text 
        x="0" 
        y="42" 
        fontFamily="Inter, system-ui, -apple-system, sans-serif" 
        fontWeight="700" 
        fontSize="48" 
        fill="#16A34A"
        style={{
          letterSpacing: '-0.02em'
        }}
      >
        Hire
      </text>
      <text 
        x="82" 
        y="42" 
        fontFamily="Inter, system-ui, -apple-system, sans-serif" 
        fontWeight="700" 
        fontSize="48" 
        fill="#1F2937"
        style={{
          letterSpacing: '-0.02em'
        }}
      >
        Shield
      </text>
    </svg>
  );
};

// Usage:
// <HireShieldLogo size={48} />
// <HireShieldLogo size={32} className="custom-class" />

export { HireShieldLogo };
