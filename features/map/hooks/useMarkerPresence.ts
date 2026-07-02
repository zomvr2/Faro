import { MARKER_EXIT_ANIMATION_MS } from "@/features/map/constants/markerAnimations";
import { useEffect, useMemo, useRef, useState } from "react";

export type PresentMarker<T> = {
  isVisible: boolean;
  item: T;
  key: string;
};

type MarkerWithKey<T> = {
  item: T;
  key: string;
};

export function useMarkerPresence<T>(
  items: readonly T[],
  getKey: (item: T) => string
): PresentMarker<T>[] {
  const visibleKeysRef = useRef<Set<string>>(new Set());
  const pruneTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keyedItems = useMemo<MarkerWithKey<T>[]>(
    () => items.map((item) => ({ item, key: getKey(item) })),
    [getKey, items]
  );
  const [presentMarkers, setPresentMarkers] = useState<PresentMarker<T>[]>(() =>
    keyedItems.map(({ item, key }) => ({ isVisible: true, item, key }))
  );

  useEffect(() => {
    const visibleKeys = new Set(keyedItems.map(({ key }) => key));
    visibleKeysRef.current = visibleKeys;

    setPresentMarkers((previousMarkers) => {
      const nextMarkers = keyedItems.map(({ item, key }) => ({
        isVisible: true,
        item,
        key,
      }));

      previousMarkers.forEach((marker) => {
        if (!visibleKeys.has(marker.key)) {
          nextMarkers.push({ ...marker, isVisible: false });
        }
      });

      return nextMarkers;
    });

    const pruneTimer = setTimeout(() => {
      setPresentMarkers((previousMarkers) =>
        previousMarkers.filter((marker) => marker.isVisible || visibleKeysRef.current.has(marker.key))
      );
      pruneTimersRef.current = pruneTimersRef.current.filter((timer) => timer !== pruneTimer);
    }, MARKER_EXIT_ANIMATION_MS);

    pruneTimersRef.current.push(pruneTimer);
  }, [keyedItems]);

  useEffect(() => () => {
    pruneTimersRef.current.forEach(clearTimeout);
    pruneTimersRef.current = [];
  }, []);

  return presentMarkers;
}
