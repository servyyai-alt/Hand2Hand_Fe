import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

const videoSource = require('../../../assets/videos/delivery-bg.mp4');

export function LoginBackgroundVideo() {
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (player) {
      player.loop = true;
      player.muted = true;
      player.play();
    }
  }, [player]);

  return (
    <View style={styles.container} pointerEvents="none">
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={false}
        contentFit="cover"
        playsInline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
