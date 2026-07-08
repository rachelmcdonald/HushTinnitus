// Drop-in ScrollView replacement that renders a persistent custom scroll
// indicator on the right edge. Android hides the native scrollbar by default
// and iOS's is too subtle to notice, so this makes "there's more below" clear
// without relying on the platform scrollbar.
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/src/theme';
import { useTheme } from '@/src/context/ThemeContext';

type Props = ScrollViewProps & {
  showIndicator?: boolean;
  indicatorColor?: string;
};

const TRACK_WIDTH = 3;
const INDICATOR_RIGHT = 4;
const FADE_IN_DURATION = 400;

const ScrollWithIndicator = forwardRef<ScrollView, Props>(function ScrollWithIndicator(
  {
    showIndicator = true,
    indicatorColor,
    style,
    contentContainerStyle,
    onScroll,
    onContentSizeChange,
    onLayout,
    scrollEventThrottle,
    ...rest
  },
  ref,
) {
  const { isDark } = useTheme();

  const [viewHeight, setViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasFadedIn = useRef(false);

  const canScroll = showIndicator && viewHeight > 0 && contentHeight > viewHeight;

  // Fade the indicator in once, the first time there's something to scroll.
  useEffect(() => {
    if (canScroll && !hasFadedIn.current) {
      hasFadedIn.current = true;
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: FADE_IN_DURATION,
        useNativeDriver: true,
      }).start();
    }
  }, [canScroll, fadeAnim]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(e.nativeEvent.contentOffset.y);
      onScroll?.(e);
    },
    [onScroll, scrollY],
  );

  const handleContentSizeChange = useCallback(
    (w: number, h: number) => {
      setContentHeight(h);
      onContentSizeChange?.(w, h);
    },
    [onContentSizeChange],
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      setViewHeight(e.nativeEvent.layout.height);
      onLayout?.(e);
    },
    [onLayout],
  );

  const trackColor = isDark ? Colors.midnight : Colors.tealLight;
  const thumbColor = indicatorColor ?? (isDark ? Colors.calmWave : Colors.deepTide);

  const thumbHeight = canScroll ? (viewHeight / contentHeight) * viewHeight : 0;
  const scrollRange = Math.max(contentHeight - viewHeight, 1);
  const thumbTravel = Math.max(viewHeight - thumbHeight, 0);

  const translateY = scrollY.interpolate({
    inputRange: [0, scrollRange],
    outputRange: [0, thumbTravel],
    extrapolate: 'clamp',
  });

  // Reserve space on the right so content never sits behind the indicator,
  // without clobbering any larger horizontal padding the screen already set.
  const flatContent = (StyleSheet.flatten(contentContainerStyle) ?? {}) as ViewStyle;
  const existingRight = flatContent.paddingRight ?? flatContent.paddingHorizontal ?? 0;
  const mergedContentStyle = showIndicator
    ? [contentContainerStyle, { paddingRight: Math.max(Number(existingRight) || 0, 12) }]
    : contentContainerStyle;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={ref}
        style={style}
        contentContainerStyle={mergedContentStyle}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleLayout}
        scrollEventThrottle={scrollEventThrottle ?? 16}
        {...rest}
      />

      {canScroll && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.track,
            { height: viewHeight, backgroundColor: trackColor, opacity: fadeAnim },
          ]}
        >
          <Animated.View
            style={[
              styles.thumb,
              {
                height: thumbHeight,
                backgroundColor: thumbColor,
                transform: [{ translateY }],
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
});

export default ScrollWithIndicator;

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  track: {
    position: 'absolute',
    top: 0,
    right: INDICATOR_RIGHT,
    width: TRACK_WIDTH,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: TRACK_WIDTH,
    borderRadius: 2,
  },
});
