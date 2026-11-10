"use client";

import { useEffect, useState } from "react";

/**
 * Skeleton Loading Effect with Shimmer
 * Enhanced skeleton loading for smooth user experience
 */
export function SkeletonLoader({
  className = "",
  variant = "rectangular",
}: {
  className?: string;
  variant?: "rectangular" | "circular" | "text";
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const baseClasses = "skeleton";
  const variantClasses = {
    rectangular: "rounded-lg",
    circular: "rounded-full",
    text: "rounded",
  }[variant];

  return (
    <div
      className={`${baseClasses} ${variantClasses} ${className} ${isLoaded ? 'animate-pulse' : ''}`}
      style={isLoaded ? {} : { animation: 'shimmer 1.6s linear infinite' }}
    />
  );
}