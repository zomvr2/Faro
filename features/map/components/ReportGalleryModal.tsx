import { ImageIcon, XIcon } from "lucide-react-native";
import { useEffect, useRef } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

type ReportGalleryModalProps = {
  imageUrls: string[];
  selectedIndex: number;
  visible: boolean;
  onClose: () => void;
  onSelectedIndexChange: (index: number) => void;
};

export function ReportGalleryModal({
  imageUrls,
  selectedIndex,
  visible,
  onClose,
  onSelectedIndexChange,
}: ReportGalleryModalProps) {
  const galleryListRef = useRef<FlatList<string>>(null);
  const { width: galleryWidth, height: galleryHeight } = useWindowDimensions();

  useEffect(() => {
    if (!visible || imageUrls.length === 0) {
      return;
    }

    requestAnimationFrame(() => {
      galleryListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
    });
  }, [imageUrls.length, selectedIndex, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.galleryOverlay}>
        <View style={styles.galleryHeader}>
          <View style={styles.galleryCounterChip}>
            <ImageIcon size={14} color="#D5E4FB" strokeWidth={2.2} />
            <Text style={styles.galleryCounterText}>
              {selectedIndex + 1}/{Math.max(1, imageUrls.length)}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.galleryCloseButton} hitSlop={10}>
            <XIcon color="#D5E4FB" size={21} />
          </Pressable>
        </View>

        <FlatList
          ref={galleryListRef}
          data={imageUrls}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={2}
          getItemLayout={(_, index) => ({
            length: galleryWidth,
            offset: galleryWidth * index,
            index,
          })}
          onScrollToIndexFailed={() => {
            galleryListRef.current?.scrollToOffset({
              offset: selectedIndex * galleryWidth,
              animated: false,
            });
          }}
          onMomentumScrollEnd={(event) => {
            const offsetX = event.nativeEvent.contentOffset.x;
            const nextIndex = Math.round(offsetX / Math.max(1, galleryWidth));
            onSelectedIndexChange(Math.max(0, Math.min(nextIndex, imageUrls.length - 1)));
          }}
          renderItem={({ item }) => (
            <View style={[styles.gallerySlide, { width: galleryWidth }]}>
              <Image
                source={{ uri: item }}
                style={[styles.galleryImage, { maxHeight: galleryHeight * 0.78 }]}
                resizeMode="contain"
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  galleryOverlay: {
    flex: 1,
    backgroundColor: "rgba(3, 8, 14, 0.97)",
    justifyContent: "center",
  },
  galleryHeader: {
    position: "absolute",
    top: 56,
    left: 16,
    right: 16,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  galleryCounterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(200, 216, 242, 0.28)",
    backgroundColor: "rgba(8, 21, 37, 0.62)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  galleryCounterText: {
    color: "#D5E4FB",
    fontSize: 13,
    fontWeight: "700",
  },
  galleryCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(200, 216, 242, 0.28)",
    backgroundColor: "rgba(8, 21, 37, 0.62)",
    alignItems: "center",
    justifyContent: "center",
  },
  gallerySlide: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
});
