import {
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import {
  CameraIcon,
  ChevronsRightIcon,
  CircleAlertIcon,
  FlameIcon,
  ImageIcon,
  LightbulbIcon,
  ShieldIcon,
  SirenIcon,
  TrafficConeIcon,
  Trash2Icon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react-native";
import { useCallback, useMemo, type RefObject } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";

import {
  MAX_REPORT_IMAGES,
  type CreateReportFormController,
} from "@/features/reports/hooks/useCreateReportForm";
import type { ReportDocument } from "@/services/appwrite";

const CATEGORY_CARD_WIDTH = 138;
const CATEGORY_CARD_GAP = 10;
const CATEGORY_SNAP_INTERVAL = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;

type AddReportSheetProps = {
  bottomInset: number;
  form: CreateReportFormController;
  onClose: () => void;
  onReportCreated: (report: ReportDocument) => void;
  sheetRef: RefObject<BottomSheetModal | null>;
};

export function AddReportSheet({
  bottomInset,
  form,
  onClose,
  onReportCreated,
  sheetRef,
}: AddReportSheetProps) {
  const snapPoints = useMemo(() => ["90%"], []);
  const categories = useMemo(
    () => [
      { value: "security" as const, label: "Seguridad", Icon: ShieldIcon },
      { value: "traffic" as const, label: "Transito", Icon: TrafficConeIcon },
      { value: "infrastructure" as const, label: "Infraestructura", Icon: CircleAlertIcon },
      { value: "accident" as const, label: "Accidente", Icon: SirenIcon },
      { value: "waste" as const, label: "Basura", Icon: Trash2Icon },
      { value: "lighting" as const, label: "Problema de luz", Icon: LightbulbIcon },
      { value: "noise" as const, label: "Ruidos", Icon: Volume2Icon },
      { value: "fire" as const, label: "Incendio", Icon: FlameIcon },
    ],
    []
  );
  const {
    description,
    handlePickFromLibrary,
    handleTakePhoto,
    isSubmitting,
    removeSelectedMedia,
    selectedCategory,
    selectedMedia,
    setDescription,
    setSelectedCategory,
    setTitle,
    submitError,
    submitReport,
    title,
    totalUploadProgress,
    uploadProgressByUri,
  } = form;

  const handleSubmitReport = useCallback(async () => {
    const createdReport = await submitReport();

    if (!createdReport) {
      return;
    }

    onReportCreated(createdReport);
    onClose();
  }, [onClose, onReportCreated, submitReport]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      enableDynamicSizing={false}
      enablePanDownToClose
      enableContentPanningGesture={false}
      backgroundStyle={{
        backgroundColor: "#141414",
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
      }}
      handleIndicatorStyle={{
        width: 38,
        height: 4,
        borderRadius: 999,
        backgroundColor: "rgba(245, 248, 255, 0.34)",
      }}
    >
      <BottomSheetScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={{
          paddingHorizontal: 16,
        }}
        contentContainerStyle={{
          paddingBottom: Math.max(bottomInset + 14, 28),
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                alignSelf: "flex-start",
                borderRadius: 999,
                backgroundColor: "#F4F4F4",
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <Text style={{ color: "#111111", fontSize: 11, fontWeight: "900" }}>Nuevo reporte</Text>
            </View>
            <Text style={{ color: "#FFFFFF", fontSize: 30, fontWeight: "900", lineHeight: 34 }}>
              Publicar incidente
            </Text>
            <Text style={{ color: "#A5A5A5", fontSize: 14, fontWeight: "600", lineHeight: 20 }}>
              Cuentanos que pasa para ayudar a la comunidad.
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#242424",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <XIcon color="#EDEDED" size={20} />
          </Pressable>
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "#9E9E9E",
              fontSize: 12,
              letterSpacing: 0.8,
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            Titulo
          </Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Semaforo apagado en Av. Balmaceda"
            placeholderTextColor="#707070"
            maxLength={120}
            style={{
              minHeight: 50,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              backgroundColor: "#1F1F1F",
              color: "#F4F4F4",
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 15,
              fontWeight: "700",
            }}
          />
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "#9E9E9E",
              fontSize: 12,
              letterSpacing: 0.8,
              fontWeight: "900",
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
            {categories.map(({ value, label, Icon }, index) => {
              const isSelected = selectedCategory === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setSelectedCategory(value)}
                  style={{
                    width: CATEGORY_CARD_WIDTH,
                    height: 66,
                    borderRadius: 16,
                    backgroundColor: isSelected ? "#F4F4F4" : "#1F1F1F",
                    borderWidth: 1,
                    borderColor: isSelected ? "rgba(255, 255, 255, 0.75)" : "rgba(255, 255, 255, 0.1)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingHorizontal: 10,
                    gap: 8,
                    marginRight: index === categories.length - 1 ? 0 : CATEGORY_CARD_GAP,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? "#111111" : "rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <Icon color={isSelected ? "#F4F4F4" : "#D8D8D8"} size={17} />
                  </View>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: isSelected ? "#111111" : "#E2E2E2",
                      fontWeight: "900",
                      fontSize: 12,
                      flex: 1,
                    }}
                  >
                    {label}
                  </Text>
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
            <Text style={{ color: "#8E8E8E", fontSize: 12, fontWeight: "700" }}>
              Desliza para ver mas categorias
            </Text>
            <ChevronsRightIcon color="#D8D8D8" size={14} />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "#9E9E9E",
              fontSize: 12,
              letterSpacing: 0.8,
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            Descripcion
          </Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe brevemente el incidente..."
            placeholderTextColor="#707070"
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 112,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              backgroundColor: "#1F1F1F",
              color: "#F4F4F4",
              paddingHorizontal: 14,
              paddingVertical: 12,
              fontSize: 15,
              fontWeight: "600",
              lineHeight: 21,
            }}
          />
        </View>

        <View style={{ gap: 12 }}>
          <Text
            style={{
              color: "#9E9E9E",
              fontSize: 12,
              letterSpacing: 0.8,
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            Evidencia visual
          </Text>

          <View
            style={{
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 18,
              paddingVertical: 16,
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#1F1F1F",
              paddingHorizontal: 12,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 23,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#2B2B2B",
              }}
            >
              <UploadIcon color="#F4F4F4" size={20} />
            </View>
            <Text style={{ color: "#F4F4F4", fontSize: 17, fontWeight: "900" }}>Tomar foto o subir</Text>
            <Text style={{ color: "#9A9A9A", fontSize: 13, fontWeight: "700" }}>
              {selectedMedia.length}/{MAX_REPORT_IMAGES} imagenes seleccionadas
            </Text>

            <View style={{ flexDirection: "row", gap: 10, width: "100%" }}>
              <Pressable
                onPress={() => {
                  void handleTakePhoto();
                }}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: "#2A2A2A",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <CameraIcon size={16} color="#F2F2F2" />
                <Text style={{ color: "#F2F2F2", fontWeight: "900" }}>Camara</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  void handlePickFromLibrary();
                }}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  backgroundColor: "#2A2A2A",
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                <ImageIcon size={16} color="#F2F2F2" />
                <Text style={{ color: "#F2F2F2", fontWeight: "900" }}>Galeria</Text>
              </Pressable>
            </View>

            {selectedMedia.length > 0 ? (
              <GestureScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 10, paddingRight: 2 }}
                style={{ width: "100%" }}
              >
                {selectedMedia.map((media, index) => (
                  <View key={`${media.uri}-${index}`} style={{ width: 88, height: 88 }}>
                    <Image
                      source={{ uri: media.uri }}
                      style={{ width: 88, height: 88, borderRadius: 14, backgroundColor: "#2A2A2A" }}
                      contentFit="cover"
                    />

                    {isSubmitting ? (
                      <View
                        style={{
                          position: "absolute",
                          left: 6,
                          right: 6,
                          bottom: 6,
                          gap: 4,
                        }}
                      >
                        <View
                          style={{
                            height: 5,
                            borderRadius: 999,
                            backgroundColor: "rgba(0, 0, 0, 0.45)",
                            overflow: "hidden",
                          }}
                        >
                          <View
                            style={{
                              width: `${Math.min(100, Math.max(0, uploadProgressByUri[media.uri] ?? 0))}%`,
                              height: "100%",
                              backgroundColor: "#F4F4F4",
                            }}
                          />
                        </View>
                        <Text style={{ color: "#F4F4F4", fontSize: 11, fontWeight: "900", textAlign: "right" }}>
                          {Math.round(uploadProgressByUri[media.uri] ?? 0)}%
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={() => removeSelectedMedia(index)}
                      disabled={isSubmitting}
                      hitSlop={10}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: "rgba(0, 0, 0, 0.74)",
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: isSubmitting ? 0.45 : 1,
                      }}
                    >
                      <XIcon size={14} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </GestureScrollView>
            ) : null}

            {isSubmitting && selectedMedia.length > 0 ? (
              <Text style={{ color: "#D8D8D8", fontSize: 12, fontWeight: "900" }}>
                Subiendo imagenes: {totalUploadProgress}%
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          onPress={() => {
            void handleSubmitReport();
          }}
          disabled={isSubmitting}
          style={{
            height: 52,
            borderRadius: 999,
            backgroundColor: isSubmitting ? "#AFAFAF" : "#F4F4F4",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "row",
            gap: 9,
            marginTop: 6,
            opacity: isSubmitting ? 0.85 : 1,
          }}
        >
          <UploadIcon color="#111111" size={18} />
          <Text style={{ color: "#111111", fontWeight: "900", fontSize: 16 }}>
            {isSubmitting ? "Publicando..." : "Publicar Reporte"}
          </Text>
        </Pressable>

        {submitError ? <Text style={{ color: "#FF8C8C", fontSize: 13, fontWeight: "800" }}>{submitError}</Text> : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}
