import { useMemo } from "react";
import {
  mapPayload,
  scriptJSON,
  type NepalMapProps,
} from "@/components/maps/document";
/** Keep the large route geometry out of frequent GPS-only bridge messages. */
export function useMapPayload(props: NepalMapProps) {
  const {
    region,
    regionNonce,
    selectedId,
    positions,
    importedSegments,
    walkingRoutes,
    walkingRouteId,
    endpoints,
  } = props;
  const fixed = useMemo(
    () =>
      scriptJSON({
        ...mapPayload({
          region,
          regionNonce,
          selectedId,
          positions,
          importedSegments,
          walkingRoutes,
          walkingRouteId,
          endpoints,
          myCoords: null,
          followUser: false,
          onSelectTrek: () => undefined,
        }),
        myCoords: undefined,
        followUser: undefined,
      }),
    [
      region,
      regionNonce,
      selectedId,
      positions,
      importedSegments,
      walkingRoutes,
      walkingRouteId,
      endpoints,
    ],
  );
  const moving = scriptJSON({
    myCoords: props.myCoords,
    followUser: props.followUser,
  });
  return { fixed, moving };
}
