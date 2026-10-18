import { useMemo } from "react";

import { useResponsiveTypography } from "@/hooks/use-responsive-typography";

export function useLayoutTokens() {
  const { scale } = useResponsiveTypography();

  return useMemo(
    () => ({
      spacing: {
        xs: Math.round(4 * scale),
        sm: Math.round(8 * scale),
        md: Math.round(12 * scale),
        lg: Math.round(16 * scale),
        xl: Math.round(20 * scale),
        xxl: Math.round(24 * scale),
      },
      radius: {
        sm: Math.round(10 * scale),
        md: Math.round(14 * scale),
        lg: Math.round(18 * scale),
        xl: Math.round(24 * scale),
        pill: 999,
      },
    }),
    [scale],
  );
}
