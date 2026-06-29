import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';

interface FloatingXpProps {
  value: number;
}

export function FloatingXp({ value }: FloatingXpProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [animValue]);

  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [10, -45],
  });

  const opacity = animValue.interpolate({
    inputRange: [0, 0.2, 0.8, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = animValue.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0.8, 1.2, 0.9],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Text style={styles.text}>+{value} XP</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: '45%',
    zIndex: 99,
  },
  text: {
    color: '#00F0FF',
    fontWeight: '900',
    fontSize: 16,
    textShadowColor: 'rgba(0, 240, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
export default FloatingXp;
