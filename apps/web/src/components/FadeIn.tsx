'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className = '', ...props }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${isVisible ? 'animate-fadeInUp' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}s` }}
      {...props}
    >
      {children}
    </div>
  );
}
