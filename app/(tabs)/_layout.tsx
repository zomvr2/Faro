import { TabBarIcon } from "@/components/TabBarIcon";
import { MapCameraProvider, useMapCameraControls } from "@/components/map/MapCameraContext";
import { AddReportSheet } from "@/features/reports/components/AddReportSheet";
import { useCreateReportForm } from "@/features/reports/hooks/useCreateReportForm";
import { useNearbyReportNotifications } from "@/features/reports/hooks/useNearbyReportNotifications";
import { BottomSheetModal, BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Tabs, useSegments } from "expo-router";
import { LocateFixedIcon, MapIcon, PlusIcon, RssIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 22;
const TAB_BAR_HEIGHT = 62;
const TAB_BAR_SIDE_OFFSET = 16;
const TAB_BAR_MIN_BOTTOM = 20;
const MAP_CENTER_BUTTON_SIZE = 54;
const MAP_CENTER_BUTTON_GAP = 12;

export default function TabLayout() {
  return (
    <MapCameraProvider>
      <TabsContent />
    </MapCameraProvider>
  );
}

function TabsContent() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheetModal>(null);
  const createReportForm = useCreateReportForm();
  const { clearSubmitError } = createReportForm;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { hasNearbyReports, markReportNotified } = useNearbyReportNotifications();
  const { canCenterOnUser, centerOnUser, isCenteredOnUser, isMapIntroActive } = useMapCameraControls();
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM);
  const isMapTabActive = segments.length === 1;

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2000);
  }, []);

  const openAddSheet = useCallback(() => {
    clearSubmitError();
    addSheetRef.current?.present();
  }, [clearSubmitError]);

  const closeAddSheet = useCallback(() => {
    addSheetRef.current?.dismiss();
  }, []);

  const handleReportCreated = useCallback(
    (createdReport: { $id: string }) => {
      markReportNotified(createdReport.$id);
      showToast("Publicado");
    },
    [markReportNotified, showToast]
  );

  return (
    <BottomSheetModalProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelPosition: "beside-icon",
          tabBarShowLabel: false,
          tabBarActiveTintColor: "#F4F4F4",
          tabBarInactiveTintColor: "#8E8E8E",
          tabBarItemStyle: {
            height: TAB_BAR_HEIGHT,
            justifyContent: "center",
            alignItems: "center",
          },
          tabBarStyle: isMapIntroActive
            ? { display: "none" }
            : {
                paddingBottom: 0,
                position: "absolute",
                left: TAB_BAR_SIDE_OFFSET,
                right: TAB_BAR_SIDE_OFFSET,
                bottom: tabBarBottom,
                borderRadius: 24,
                height: TAB_BAR_HEIGHT,
                marginHorizontal: 12,
                elevation: 10,
                backgroundColor: "rgba(15, 15, 15, 0.94)",
                borderTopWidth: 0,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
                shadowColor: "#000000",
                shadowOpacity: 0.28,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
              },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon Icon={MapIcon} color={color} focused={focused} size={ICON_SIZE} />
            ),
            animation: "fade",
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            title: "Add",
            tabBarIcon: () => null,
            tabBarButton: ({ accessibilityState, accessibilityLabel, testID }) => (
              <Pressable
                onPress={openAddSheet}
                accessibilityState={accessibilityState}
                accessibilityLabel={accessibilityLabel}
                testID={testID}
                style={({ pressed }) => ({
                  top: -16,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.86 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#F4F4F4",
                    borderWidth: 4,
                    borderColor: "#0F0F0F",
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 12,
                    shadowColor: "#000000",
                    shadowOpacity: 0.35,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 8 },
                  }}
                >
                  <PlusIcon size={25} color="#111111" strokeWidth={3} />
                </View>
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="rss"
          options={{
            title: "RSS",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon Icon={RssIcon} color={color} focused={focused} size={ICON_SIZE} />
            ),
            tabBarBadge: hasNearbyReports ? " " : undefined,
            tabBarBadgeStyle: {
              minWidth: 9,
              height: 9,
              borderRadius: 999,
              backgroundColor: "#FF3B3B",
              borderWidth: 1.5,
              borderColor: "#0F0F0F",
              top: 5,
              aspectRatio: 1,
            },
            animation: "fade",
          }}
        />
      </Tabs>

      {canCenterOnUser && !isMapIntroActive && isMapTabActive ? (
        <Pressable
          onPress={centerOnUser}
          accessibilityRole="button"
          accessibilityLabel="Centrar mapa en mi ubicacion"
          style={({ pressed }) => ({
            position: "absolute",
            right: TAB_BAR_SIDE_OFFSET,
            bottom: tabBarBottom + TAB_BAR_HEIGHT + MAP_CENTER_BUTTON_GAP,
            width: MAP_CENTER_BUTTON_SIZE,
            height: MAP_CENTER_BUTTON_SIZE,
            borderRadius: 22,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: isCenteredOnUser ? "#F4F4F4" : "rgba(15, 15, 15, 0.94)",
            borderWidth: 1,
            borderColor: isCenteredOnUser ? "rgba(255, 255, 255, 0.7)" : "rgba(255, 255, 255, 0.1)",
            elevation: 10,
            shadowColor: "#000000",
            shadowOpacity: 0.28,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 8 },
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <LocateFixedIcon
            size={23}
            color={isCenteredOnUser ? "#111111" : "#D8D8D8"}
            strokeWidth={isCenteredOnUser ? 2.8 : 2.4}
          />
        </Pressable>
      ) : null}

      <AddReportSheet
        bottomInset={insets.bottom}
        form={createReportForm}
        onClose={closeAddSheet}
        onReportCreated={handleReportCreated}
        sheetRef={addSheetRef}
      />

      {toastMessage ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: tabBarBottom + TAB_BAR_HEIGHT + 24,
            alignItems: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "rgba(16, 186, 113, 0.95)",
            }}
          >
            <Text style={{ color: "#032313", fontWeight: "800", fontSize: 13 }}>{toastMessage}</Text>
          </View>
        </View>
      ) : null}
    </BottomSheetModalProvider>
  );
}
