"use client";

import { useState, useEffect } from 'react';

interface CountdownResult {
  timeRemaining: string;
  isUnderOneHour: boolean;
  isUnder24Hours: boolean;
  hasExpired: boolean;
}

export function useCountdown(closingDate: Date | string): CountdownResult {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isUnderOneHour, setIsUnderOneHour] = useState(false);
  const [isUnder24Hours, setIsUnder24Hours] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const closingTime = new Date(closingDate).getTime();
      const difference = closingTime - now;

      // Bet has closed
      if (difference <= 0) {
        setHasExpired(true);
        setTimeRemaining('Closed');
        return;
      }

      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Under 24 hours - show countdown
      if (hours < 24) {
        setIsUnder24Hours(true);

        // Under 1 hour - show with seconds, pulse yellow
        if (hours < 1) {
          setIsUnderOneHour(true);
          setTimeRemaining(`${minutes}m ${seconds}s`);
        } else {
          setIsUnderOneHour(false);
          setTimeRemaining(`${hours}h ${minutes}m`);
        }
      } else {
        // Over 24 hours - show normal date
        setIsUnder24Hours(false);
        setIsUnderOneHour(false);
        const date = new Date(closingDate);
        setTimeRemaining(
          date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          })
        );
      }
    };

    // Initial calculation
    calculateTimeRemaining();

    // Update every second if under 24 hours
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [closingDate]);

  return { timeRemaining, isUnderOneHour, isUnder24Hours, hasExpired };
}
