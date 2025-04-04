import React, { useEffect, useState } from 'react';
import { View, StatusBar, TouchableOpacity, StyleSheet, BackHandler, Alert, ActivityIndicator } from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Toast from 'react-native-toast-message';

const ImageViewPage = ({ route }) => {
  const { imageUri } = route.params;
  const navigation = useNavigation();

  const [isDownloading, setIsDownloading] = useState(false);

  const images = [
    {
      url: imageUri,
    },
  ];

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', backAction);
    };
  }, [navigation]);

  const downloadImage = async () => {
    setIsDownloading(true);
    try {
      const permission = await MediaLibrary.getPermissionsAsync();

      if (permission.status === 'denied') {
        Alert.alert(
          'Permission Required',
          'Media permissions are required to save the image. Please enable permissions in settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => MediaLibrary.requestPermissionsAsync(),
            },
          ],
        );
        setIsDownloading(false);
        return;
      }

      if (permission.status !== 'granted') {
        const requestPermission = await MediaLibrary.requestPermissionsAsync();
        if (requestPermission.status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Denied',
            text2: 'Please allow media permissions to download the image.',
          });
          setIsDownloading(false);
          return;
        }
      }

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `SOCIALBOOK_IMG_${timestamp}.jpg`;
      const folderUri = `${FileSystem.documentDirectory}Socialbook`;
      const fileUri = `${folderUri}/${fileName}`;

      // Ensure the directory exists
      const folderInfo = await FileSystem.getInfoAsync(folderUri);
      if (!folderInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      }

      // Download the file
      const download = await FileSystem.downloadAsync(imageUri, fileUri);

      // Save the file to the gallery
      const asset = await MediaLibrary.createAssetAsync(download.uri);
      await MediaLibrary.createAlbumAsync('Socialbook', asset, false);

      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: `Image saved as ${fileName}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Unable to download the image.',
      });
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={30} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={downloadImage}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="cloud-download-outline" size={30} color="white" />
          )}
        </TouchableOpacity>
      </View>
      <ImageViewer imageUrls={images} />
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    width: '100%',
    padding: 10,
    backgroundColor: '#000',
    flexDirection: 'row',
    position: 'absolute',
    top: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
  },
});

export default ImageViewPage;