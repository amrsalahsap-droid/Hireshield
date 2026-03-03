'use client';

import React from 'react';

interface LogoProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function Logo({ src, alt, className, fallback }: LogoProps) {
  const [imgError, setImgError] = React.useState(false);

  if (imgError && fallback) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
}
