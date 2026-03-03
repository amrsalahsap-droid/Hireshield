import React from 'react';

interface RiskBadgeProps {
  level: 'safe' | 'investigate' | 'high';
  label: string;
}

export function RiskBadge({ level, label }: RiskBadgeProps) {
  const styles = {
    safe: {
      background: 'bg-risk-safe-bg',
      text: 'text-risk-safe',
    },
    investigate: {
      background: 'bg-risk-investigate-bg',
      text: 'text-risk-investigate',
    },
    high: {
      background: 'bg-risk-high-bg',
      text: 'text-risk-high',
    },
  };

  const style = styles[level];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-badge text-label font-medium ${style.background} ${style.text}`}>
      {label}
    </span>
  );
}
