import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type ResponsiveTypeScale = {
  title: number;
  body: number;
  secondary: number;
  label: number;
  caption: number;
  input: number;
  button: number;
};

export function useResponsiveTypography() {
  const { width } = useWindowDimensions();
  const scale = Math.min(1.06, Math.max(0.9, width / 390));

  const type = useMemo<ResponsiveTypeScale>(
    () => ({
      title: Math.round(16 * scale),
      body: Math.round(14 * scale),
      secondary: Math.round(12 * scale),
      label: Math.round(11 * scale),
      caption: Math.round(10 * scale),
      input: Math.round(24 * scale),
      button: Math.round(15 * scale),
    }),
    [scale],
  );

  const maxContentWidth = Math.min(460, Math.max(320, width - 24));

  return {
    width,
    scale,
    type,
    maxContentWidth,
  };
}
