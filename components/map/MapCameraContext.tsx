import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";

type CenterOnUserHandler = () => Promise<void> | void;

type MapCameraContextValue = {
  canCenterOnUser: boolean;
  isCenteredOnUser: boolean;
  isMapIntroActive: boolean;
  centerOnUser: () => Promise<void>;
  setIsCenteredOnUser: (isCenteredOnUser: boolean) => void;
  setIsMapIntroActive: (isMapIntroActive: boolean) => void;
  registerCenterOnUser: (handler: CenterOnUserHandler | null) => void;
};

const MapCameraContext = createContext<MapCameraContextValue | undefined>(undefined);

export function MapCameraProvider({ children }: PropsWithChildren) {
  const [centerOnUserHandler, setCenterOnUserHandler] = useState<CenterOnUserHandler | null>(null);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState(false);
  const [isMapIntroActive, setIsMapIntroActive] = useState(false);

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
      isMapIntroActive,
      centerOnUser,
      setIsCenteredOnUser,
      setIsMapIntroActive,
      registerCenterOnUser,
    }),
    [centerOnUser, centerOnUserHandler, isCenteredOnUser, isMapIntroActive, registerCenterOnUser]
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
