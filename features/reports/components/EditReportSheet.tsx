import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
  CalendarClockIcon,
  CheckIcon,
  CircleAlertIcon,
  FlameIcon,
  LightbulbIcon,
  ShieldIcon,
  SirenIcon,
  TrafficConeIcon,
  Trash2Icon,
  Volume2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView as GestureScrollView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  ReportCategory,
  ReportDocument,
  ReportUpdateData,
} from "@/services/appwrite";

const CATEGORY_CARD_WIDTH = 138;
const CATEGORY_CARD_GAP = 10;
const CATEGORY_SNAP_INTERVAL = CATEGORY_CARD_WIDTH + CATEGORY_CARD_GAP;

type EditReportSheetProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onSubmit: (data: ReportUpdateData) => Promise<boolean>;
  report: ReportDocument | null;
  sheetRef: RefObject<BottomSheetModal | null>;
};

type EditCategoryOption = {
  Icon: LucideIcon;
  label: string;
  value: ReportCategory;
};

export function EditReportSheet({
  isSubmitting,
  onClose,
  onDismiss,
  onSubmit,
  report,
  sheetRef,
}: EditReportSheetProps) {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ["90%"], []);
  const categories = useMemo<EditCategoryOption[]>(
    () => [
      { value: "security", label: "Seguridad", Icon: ShieldIcon },
      { value: "traffic", label: "Transito", Icon: TrafficConeIcon },
      { value: "infrastructure", label: "Infraestructura", Icon: CircleAlertIcon },
      { value: "accident", label: "Accidente", Icon: SirenIcon },
      { value: "waste", label: "Basura", Icon: Trash2Icon },
      { value: "lighting", label: "Problema de luz", Icon: LightbulbIcon },
      { value: "noise", label: "Ruidos", Icon: Volume2Icon },
      { value: "fire", label: "Incendio", Icon: FlameIcon },
      { value: "event", label: "Evento", Icon: CalendarClockIcon },
    ],
    []
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ReportCategory>("security");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setSubmitError(null);

    if (!report) {
      setTitle("");
      setDescription("");
      setCategory("security");
      return;
    }

    setTitle(report.title ?? "");
    setDescription(report.description ?? "");
    setCategory(report.category);
  }, [report?.$id]);

  const renderBottomSheetBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      pressBehavior={isSubmitting ? "none" : "close"}
      opacity={0.48}
    />
  ), [isSubmitting]);

  const handleClose = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    onClose();
  }, [isSubmitting, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      setSubmitError("Agrega un titulo antes de guardar.");
      return;
    }

    if (!trimmedDescription) {
      setSubmitError("Agrega una descripcion antes de guardar.");
      return;
    }

    setSubmitError(null);

    const didSubmit = await onSubmit({
      title: trimmedTitle,
      category,
      description: trimmedDescription,
    });

    if (didSubmit) {
      onClose();
    }
  }, [category, description, onClose, onSubmit, title]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      index={0}
      stackBehavior="push"
      onDismiss={onDismiss}
      enableDynamicSizing={false}
      enablePanDownToClose={!isSubmitting}
      enableContentPanningGesture={false}
      backdropComponent={renderBottomSheetBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
    >
      {report ? (
        <BottomSheetScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator
          style={styles.sheetScroll}
          contentContainerStyle={[
            styles.sheetContent,
            {
              paddingBottom: Math.max(insets.bottom + 14, 28),
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <View style={styles.headerPill}>
                <Text style={styles.headerPillText}>Editar reporte</Text>
              </View>
              <Text style={styles.title}>Actualizar datos</Text>
              <Text style={styles.subtitle}>
                Ajusta la informacion visible del reporte.
              </Text>
            </View>

            <Pressable onPress={handleClose} disabled={isSubmitting} hitSlop={10} style={styles.closeButton}>
              <XIcon color="#EDEDED" size={20} />
            </Pressable>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Titulo</Text>
            <BottomSheetTextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                setSubmitError(null);
              }}
              editable={!isSubmitting}
              maxLength={120}
              placeholder="Titulo del reporte"
              placeholderTextColor="#707070"
              style={styles.textInput}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <GestureScrollView
              horizontal
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={CATEGORY_SNAP_INTERVAL}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.categoryList}
            >
              {categories.map(({ value, label, Icon }, index) => {
                const isSelected = category === value;

                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setCategory(value);
                      setSubmitError(null);
                    }}
                    disabled={isSubmitting}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                      pressed && styles.pressed,
                      isSubmitting && styles.disabled,
                      { marginRight: index === categories.length - 1 ? 0 : CATEGORY_CARD_GAP },
                    ]}
                  >
                    <View style={[styles.categoryIcon, isSelected && styles.categoryIconSelected]}>
                      <Icon color={isSelected ? "#F4F4F4" : "#D8D8D8"} size={17} />
                    </View>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.categoryLabel,
                        isSelected && styles.categoryLabelSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </GestureScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descripcion</Text>
            <BottomSheetTextInput
              value={description}
              onChangeText={(value) => {
                setDescription(value);
                setSubmitError(null);
              }}
              editable={!isSubmitting}
              multiline
              textAlignVertical="top"
              placeholder="Describe brevemente el incidente..."
              placeholderTextColor="#707070"
              style={[styles.textInput, styles.descriptionInput]}
            />
          </View>

          <View style={styles.infoPanel}>
            <Text style={styles.infoText}>
              La ubicacion y las imagenes originales no se modifican desde esta vista.
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.actionButton,
                styles.cancelButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              <Text style={[styles.actionText, styles.cancelButtonText]}>Cancelar</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.actionButton,
                styles.saveButton,
                pressed && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              <CheckIcon color="#111111" size={18} strokeWidth={3} />
              <Text style={[styles.actionText, styles.saveButtonText]}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Text>
            </Pressable>
          </View>

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
        </BottomSheetScrollView>
      ) : null}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#141414",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(245, 248, 255, 0.34)",
  },
  sheetScroll: {
    paddingHorizontal: 16,
  },
  sheetContent: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  headerPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#F4F4F4",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerPillText: {
    color: "#111111",
    fontSize: 11,
    fontWeight: "900",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  subtitle: {
    color: "#A5A5A5",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  fieldGroup: {
    gap: 12,
  },
  fieldLabel: {
    color: "#9E9E9E",
    fontSize: 12,
    letterSpacing: 0.8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  textInput: {
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
  },
  descriptionInput: {
    minHeight: 112,
    lineHeight: 21,
    fontWeight: "600",
  },
  categoryList: {
    paddingRight: CATEGORY_CARD_GAP,
  },
  categoryCard: {
    width: CATEGORY_CARD_WIDTH,
    height: 66,
    borderRadius: 16,
    backgroundColor: "#1F1F1F",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 10,
    gap: 8,
  },
  categoryCardSelected: {
    backgroundColor: "#F4F4F4",
    borderColor: "rgba(255, 255, 255, 0.75)",
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  categoryIconSelected: {
    backgroundColor: "#111111",
  },
  categoryLabel: {
    color: "#E2E2E2",
    fontWeight: "900",
    fontSize: 12,
    flex: 1,
  },
  categoryLabelSelected: {
    color: "#111111",
  },
  infoPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#1F1F1F",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    color: "#A5A5A5",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
  },
  cancelButton: {
    backgroundColor: "#242424",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  saveButton: {
    backgroundColor: "#F4F4F4",
  },
  actionText: {
    fontWeight: "900",
    fontSize: 16,
  },
  cancelButtonText: {
    color: "#F4F4F4",
  },
  saveButtonText: {
    color: "#111111",
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.62,
  },
  errorText: {
    color: "#FF8C8C",
    fontSize: 13,
    fontWeight: "800",
  },
});
