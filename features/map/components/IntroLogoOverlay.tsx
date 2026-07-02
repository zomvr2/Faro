import { Animated, StyleSheet, View } from "react-native";

const INTRO_LOGO_SIZE = 240;

type IntroLogoOverlayProps = {
  opacity: Animated.Value;
};

export function IntroLogoOverlay({ opacity }: IntroLogoOverlayProps) {
  return (
    <View pointerEvents="none" style={styles.introOverlay}>
      <Animated.Image
        source={require("@/assets/faro_full_nobg.png")}
        style={[styles.introLogo, { opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  introOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5, 10, 18, 0.32)",
  },
  introLogo: {
    width: INTRO_LOGO_SIZE,
    height: INTRO_LOGO_SIZE,
  },
});
