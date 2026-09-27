// * components/AnimatedPressable.js — shared spring interaction animation (v54)
import React, { forwardRef, useRef } from 'react';
import { Animated, Pressable } from 'react-native';

const AnimatedPressable = forwardRef(function AnimatedPressable(
  { children, style, disabled, onPressIn, onPressOut, ...props },
  ref
) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value) => {
    Animated.spring(scale, {
      toValue: value,
      friction: 8,
      tension: 150,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        ref={ref}
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled) animateTo(0.965);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateTo(1);
          onPressOut?.(event);
        }}
        style={typeof style === 'function' ? (state) => style(state) : style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
});

export default AnimatedPressable;
