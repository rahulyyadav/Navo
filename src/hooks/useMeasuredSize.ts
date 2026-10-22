import { useCallback, useState } from 'react';
import type { View } from 'react-native';

type Measurable = View & {
  getBoundingClientRect?: () => { width: number; height: number };
  measure?: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

/**
 * onLayout only arrives with the next rendered frame, which leaves anything
 * positioned against it unsized on first paint. Measure the node directly on
 * mount and keep onLayout for later resizes.
 */
export function useMeasuredSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const measureRef = useCallback((node: View | null) => {
    const host = node as Measurable | null;
    if (!host) return;
    if (typeof host.getBoundingClientRect === 'function') {
      const rect = host.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) setSize({ width: rect.width, height: rect.height });
      return;
    }
    host.measure?.((_x, _y, width, height) => {
      if (width > 0 || height > 0) setSize({ width, height });
    });
  }, []);
  const onLayout = useCallback((event: { nativeEvent: { layout: { width: number; height: number } } }) => {
    const { width, height } = event.nativeEvent.layout;
    setSize(current => (current.width === width && current.height === height ? current : { width, height }));
  }, []);
  return { measureRef, size, onLayout };
}
