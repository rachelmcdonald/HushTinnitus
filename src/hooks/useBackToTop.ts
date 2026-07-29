import { useCallback, useRef, useState } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

const FADE_DURATION = 200;

// Drives a floating "back to top" button: fades in once the user has
// scrolled past the halfway point of the content, fades out above it.
export function useBackToTop(scrollRef: React.RefObject<ScrollView | null>) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const contentHeightRef = useRef(0);
  const isAboveHalfwayRef = useRef(false);

  const fade = useCallback((show: boolean) => {
    if (show) setVisible(true);
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: FADE_DURATION,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !show) setVisible(false);
    });
  }, [opacity]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = e.nativeEvent.contentOffset.y;
    const halfway = contentHeightRef.current / 2;
    const isAboveHalfway = scrollY > halfway;
    if (isAboveHalfway !== isAboveHalfwayRef.current) {
      isAboveHalfwayRef.current = isAboveHalfway;
      fade(isAboveHalfway);
    }
  }, [fade]);

  const onContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeightRef.current = height;
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [scrollRef]);

  return { visible, opacity, onScroll, onContentSizeChange, scrollToTop };
}
