import React, { useMemo, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence, Easing } from "react-native-reanimated";
import { Colors, Fonts } from "@/constants/theme";

interface EncryptionWallpaperProps {
  inputText: string;
  publicKey?: string;
}

const HEX_CHARS = "0123456789ABCDEF";
const CRYPTO_CHARS = "0123456789ABCDEFabcdef=/+";

function generateRandomHex(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += HEX_CHARS[Math.floor(Math.random() * HEX_CHARS.length)];
  }
  return result;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateEncryptionData(input: string, seed: string, rowIndex: number): string {
  const combined = input + seed + rowIndex.toString();
  const hash = hashString(combined);
  let result = "";
  const length = 32;
  
  for (let i = 0; i < length; i++) {
    const charIndex = (hash * (i + 1) * (rowIndex + 1)) % CRYPTO_CHARS.length;
    result += CRYPTO_CHARS[Math.floor(charIndex)];
  }
  return result;
}

interface DataRowProps {
  text: string;
  opacity: number;
  isHighlighted: boolean;
  rowIndex: number;
}

function DataRow({ text, opacity, isHighlighted, rowIndex }: DataRowProps) {
  const animatedOpacity = useSharedValue(opacity);
  
  useEffect(() => {
    animatedOpacity.value = withTiming(opacity, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: animatedOpacity.value,
  }));

  const formattedText = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < text.length; i += 4) {
      chunks.push(text.slice(i, i + 4));
    }
    return chunks.join(" ");
  }, [text]);

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <Text style={[
        styles.hexText,
        isHighlighted && styles.hexTextHighlighted,
        rowIndex % 3 === 0 && styles.hexTextCyan,
      ]}>
        {formattedText}
      </Text>
    </Animated.View>
  );
}

export function EncryptionWallpaper({ inputText, publicKey = "" }: EncryptionWallpaperProps) {
  const [tick, setTick] = useState(0);
  const { height } = Dimensions.get("window");
  const numRows = Math.floor(height / 20);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    const result = [];
    const seed = publicKey + tick.toString();
    
    for (let i = 0; i < numRows; i++) {
      const baseOpacity = 0.03 + (Math.sin(i * 0.3) * 0.02);
      const inputInfluence = inputText.length > 0 ? 0.08 : 0;
      const highlightedRows = inputText.length > 0 ? 
        [Math.abs(hashString(inputText)) % numRows, 
         (Math.abs(hashString(inputText)) + 5) % numRows,
         (Math.abs(hashString(inputText)) + 10) % numRows] : [];
      
      const isHighlighted = highlightedRows.includes(i);
      const opacity = isHighlighted ? 0.25 : baseOpacity + inputInfluence;
      
      const text = inputText.length > 0 
        ? generateEncryptionData(inputText, seed, i)
        : generateRandomHex(32);

      result.push({
        text,
        opacity,
        isHighlighted,
        rowIndex: i,
      });
    }
    return result;
  }, [inputText, publicKey, numRows, tick]);

  return (
    <View style={styles.container} pointerEvents="none">
      {rows.map((row, index) => (
        <DataRow key={index} {...row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0,
  },
  row: {
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  hexText: {
    fontFamily: Fonts?.mono,
    fontSize: 10,
    color: Colors.dark.secondary,
    letterSpacing: 1,
  },
  hexTextHighlighted: {
    color: Colors.dark.primary,
    textShadowColor: Colors.dark.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  hexTextCyan: {
    color: Colors.dark.primary,
  },
});
