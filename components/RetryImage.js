// * components/RetryImage.js — network image retry helper
import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'react-native';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY = 3000;

export default function RetryImage({
  uri,
  style,
  resizeMode = 'contain',
  onExhausted,
  ...props
}) {
  const [attempt, setAttempt] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    setAttempt(1);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [uri]);

  if (!uri) return null;

  const handleError = () => {
    if (timerRef.current) return;

    if (attempt < MAX_ATTEMPTS) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setAttempt((current) => current + 1);
      }, RETRY_DELAY);
      return;
    }

    onExhausted?.();
  };

  return (
    <Image
      key={`${uri}::retry-${attempt}`}
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={handleError}
      {...props}
    />
  );
}
