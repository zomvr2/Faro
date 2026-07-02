import {
  MARKER_ENTER_ANIMATION_MS,
  MARKER_EXIT_ANIMATION_MS,
} from "@/features/map/constants/markerAnimations";
import {
  type PropsWithChildren,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  Animated,
  Easing,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

type AnimatedMarkerContentProps = PropsWithChildren<ViewProps & {
  isVisible: boolean;
  style: StyleProp<ViewStyle>;
}>;

export function AnimatedMarkerContent({
  children,
  isVisible,
  style,
  ...viewProps
}: AnimatedMarkerContentProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const animatedStyle = useMemo(
    () => ({
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0],
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.82, 1],
          }),
        },
      ],
    }),
    [progress]
  );

  useEffect(() => {
    const animation = Animated.timing(progress, {
      duration: isVisible ? MARKER_ENTER_ANIMATION_MS : MARKER_EXIT_ANIMATION_MS,
      easing: isVisible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [isVisible, progress]);

  return (
    <Animated.View
      {...viewProps}
      collapsable={false}
      pointerEvents={isVisible ? "auto" : "none"}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}
