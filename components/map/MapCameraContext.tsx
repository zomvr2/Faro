import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";

type CenterOnUserHandler = () => Promise<void> | void;

type MapCameraContextValue = {
  canCenterOnUser: boolean;
  isCenteredOnUser: boolean;
  centerOnUser: () => Promise<void>;
  setIsCenteredOnUser: (isCenteredOnUser: boolean) => void;
  registerCenterOnUser: (handler: CenterOnUserHandler | null) => void;
};

const MapCameraContext = createContext<MapCameraContextValue | undefined>(undefined);

export function MapCameraProvider({ children }: PropsWithChildren) {
  const [centerOnUserHandler, setCenterOnUserHandler] = useState<CenterOnUserHandler | null>(null);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState(false);

  const centerOnUser = useCallback(async () => {
    if (!centerOnUserHandler) {
      return;
    }

    await centerOnUserHandler();
  }, [centerOnUserHandler]);

  const registerCenterOnUser = useCallback((handler: CenterOnUserHandler | null) => {
    setCenterOnUserHandler(() => handler);
  }, []);

  const value = useMemo(
    () => ({
      canCenterOnUser: Boolean(centerOnUserHandler),
      isCenteredOnUser,
      centerOnUser,
      setIsCenteredOnUser,
      registerCenterOnUser,
    }),
    [centerOnUser, centerOnUserHandler, isCenteredOnUser, registerCenterOnUser]
  );

  return <MapCameraContext.Provider value={value}>{children}</MapCameraContext.Provider>;
}

export function useMapCameraControls() {
  const context = useContext(MapCameraContext);

  if (!context) {
    throw new Error("useMapCameraControls must be used inside MapCameraProvider");
  }

  return context;
}
