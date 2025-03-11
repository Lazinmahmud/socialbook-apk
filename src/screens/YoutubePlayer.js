import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const YouTubePlayer = ({ route }) => {
  const { videoId } = route.params;
  const { width } = Dimensions.get('window'); // স্ক্রিনের প্রস্থ বের করা
  
  const videoHeight = width * (9 / 16); // 16:9 অনুপাতে ভিডিওর উচ্চতা সেট করা
  
  const htmlContent = `
    <html>
      <body style="margin: 0; padding: 0; overflow: hidden; background-color: black;">
        <iframe 
          width="100%" 
          height="100%" 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&showinfo=0&modestbranding=1&fs=1" 
          frameborder="0" 
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <View style={[styles.videoWrapper, { width, height: videoHeight }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          javaScriptEnabled={true}
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          domStorageEnabled={true}
          startInLoadingState={true}
        />
      </View>
    </View>
  );
};

export default YouTubePlayer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center', // কেন্দ্রস্থলে রাখা
    justifyContent: 'center',
  },
  videoWrapper: {
    backgroundColor: 'black', // ব্যাকগ্রাউন্ড কালো রাখা
  },
});