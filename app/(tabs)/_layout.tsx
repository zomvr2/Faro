import { TabBarIcon } from "@/components/TabBarIcon";
import { MapCameraProvider, useMapCameraControls } from "@/components/map/MapCameraContext";
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Tabs } from "expo-router";
import {
  ChevronsRightIcon,
  CircleAlertIcon,
  DropletsIcon,
  LightbulbIcon,
  LocateFixedIcon,
  MapIcon,
  PawPrintIcon,
  PlusIcon,
  RssIcon,
  ShieldIcon,
  TrafficConeIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_SIZE = 25;
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_SIDE_OFFSET = 16;
const TAB_BAR_MIN_BOTTOM = 20;
const MAP_CENTER_BUTTON_SIZE = 54;
const MAP_CENTER_BUTTON_GAP = 12;
const CATEGORY_CARD_WIDTH = 160;
const CATEGORY_CARD_GAP = 12;
const CATEGORY_SNAP_INTERVAL = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;

export default function TabLayout() {
  return (
    <MapCameraProvider>
      <TabsContent />
    </MapCameraProvider>
  );
}

function TabsContent() {
  const insets = useSafeAreaInsets();
  const addSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["100%"], []);
  const [selectedCategory, setSelectedCategory] = useState("Infraestructura");
  const [description, setDescription] = useState("");
  const { canCenterOnUser, centerOnUser, isCenteredOnUser, isMapIntroActive } = useMapCameraControls();
  const tabBarBottom = Math.max(insets.bottom, TAB_BAR_MIN_BOTTOM);

  const categories = useMemo(
    () => [
      { label: "Seguridad", Icon: ShieldIcon },
      { label: "Tránsito", Icon: TrafficConeIcon },
      { label: "Infraestructura", Icon: CircleAlertIcon },
      { label: "Mascotas", Icon: PawPrintIcon },
      { label: "Basura", Icon: Trash2Icon },
      { label: "Alumbrado", Icon: LightbulbIcon },
      { label: "Ruidos", Icon: Volume2Icon },
      { label: "Agua", Icon: DropletsIcon },
    ],
    []
  );

  const openAddSheet = useCallback(() => {
    addSheetRef.current?.present();
  }, []);

  const closeAddSheet = useCallback(() => {
    addSheetRef.current?.dismiss();
  }, []);

  return (
    <BottomSheetModalProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelPosition: "beside-icon",
          tabBarShowLabel: false,
          tabBarStyle: isMapIntroActive
            ? { display: "none" }
            : {
                paddingBottom: 0,
                position: "absolute",
                left: TAB_BAR_SIDE_OFFSET,
                right: TAB_BAR_SIDE_OFFSET,
                bottom: tabBarBottom,
                borderRadius: 20,
                height: TAB_BAR_HEIGHT,
                marginHorizontal: 16,
                elevation: 6,
                backgroundColor: "rgb(0, 0, 0, 0.8)",
              },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon Icon={MapIcon} color={color} focused={focused} size={ICON_SIZE} />
            ),
            animation: "fade"
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
                  top: -18,
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <View
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 29,
                    backgroundColor: "#00C8FF",
                    justifyContent: "center",
                    alignItems: "center",
                    elevation: 8,
                  }}
                >
                  <PlusIcon size={26} color="#00131A" />
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
            animation: "fade",
          }}
        />
      </Tabs>

      {canCenterOnUser && !isMapIntroActive ? (
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
            borderRadius: MAP_CENTER_BUTTON_SIZE / 3,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            borderWidth: 1,
            borderColor: "rgba(167, 184, 207, 0.4)",
            elevation: 9,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <LocateFixedIcon size={24} color={isCenteredOnUser ? "#25C7FF" : "#7E95B2"} />
        </Pressable>
      ) : null}

      <BottomSheetModal
        ref={addSheetRef}
        snapPoints={snapPoints}
        index={0}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backgroundStyle={{ backgroundColor: "rgba(0, 0, 0, 0.94)" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(167, 184, 207, 0.55)" }}
      >
        <BottomSheetScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{
            paddingHorizontal: 20,
          }}
          contentContainerStyle={{
            paddingBottom: Math.max(insets.bottom, 20),
            gap: 15,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ gap: 6, width: "70%" }}>
              <Text style={{ color: "#E7F0FF", fontSize: 32, fontWeight: "800" }}>Nuevo Reporte</Text>
              <Text style={{ color: "#91A8C2", fontSize: 15, fontWeight: "500" }}>
                Cuentanos que pasa para ayudar a la comunidad.
              </Text>
            </View>
            <Pressable
              onPress={closeAddSheet}
              hitSlop={10}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <XIcon color="#A7B8CF" size={20} />
            </Pressable>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Categoria del incidente
            </Text>

            <GestureScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CATEGORY_SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={{ paddingRight: CATEGORY_CARD_GAP }}
            >
              {categories.map(({ label, Icon }, index) => {
                const isSelected = selectedCategory === label;
                return (
                  <Pressable
                    key={label}
                    onPress={() => setSelectedCategory(label)}
                    style={{
                      width: CATEGORY_CARD_WIDTH,
                      height: 84,
                      borderRadius: 16,
                      backgroundColor: isSelected ? "#15254A" : "rgba(255, 255, 255, 0.05)",
                      borderWidth: 1.5,
                      borderColor: isSelected ? "#00C8FF" : "rgba(167, 184, 207, 0.24)",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      paddingHorizontal: 14,
                      gap: 10,
                      marginRight: index === categories.length - 1 ? 0 : CATEGORY_CARD_GAP,
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "rgba(0, 200, 255, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      <Icon color={isSelected ? "#00C8FF" : "#C8D8F2"} size={18} />
                    </View>
                    <Text style={{ color: "#C8D8F2", fontWeight: "600", fontSize: 13 }}>{label}</Text>
                  </Pressable>
                );
              })}
            </GestureScrollView>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 6,
                paddingRight: 4,
              }}
            >
              <Text style={{ color: "#7E95B2", fontSize: 12, fontWeight: "600" }}>
                Desliza para ver mas categorias
              </Text>
              <ChevronsRightIcon color="#25C7FF" size={14} />
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Descripcion
            </Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe brevemente el incidente..."
              placeholderTextColor="#7E95B2"
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 120,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "rgba(125, 160, 195, 0.5)",
                backgroundColor: "rgba(14, 34, 70, 0.4)",
                color: "#D7E5FB",
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
              }}
            />
          </View>

          <View style={{ gap: 12 }}>
            <Text
              style={{
                color: "#25C7FF",
                fontSize: 12,
                letterSpacing: 1.6,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              Evidencia visual
            </Text>

            <Pressable
              style={{
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: "rgba(125, 160, 195, 0.5)",
                borderRadius: 18,
                paddingVertical: 24,
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(14, 34, 70, 0.4)",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(37, 199, 255, 0.16)",
                }}
              >
                <UploadIcon color="#25C7FF" size={22} />
              </View>
              <Text style={{ color: "#D7E5FB", fontSize: 17, fontWeight: "700" }}>Tomar foto o subir</Text>
              <Text style={{ color: "#7E95B2", fontSize: 14 }}>Sube hasta 3 imagenes en alta calidad</Text>
            </Pressable>
          </View>

          <Pressable
            style={{
              height: 56,
              borderRadius: 16,
              backgroundColor: "#00C8FF",
              justifyContent: "center",
              alignItems: "center",
              flexDirection: "row",
              gap: 10,
              marginTop: 12,
            }}
          >
            <UploadIcon color="#00131A" size={18} />
            <Text style={{ color: "#00131A", fontWeight: "800", fontSize: 18 }}>Publicar Reporte</Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </BottomSheetModalProvider>
  )
}