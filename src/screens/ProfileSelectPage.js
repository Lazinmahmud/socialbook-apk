import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StatusBar, FlatList, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// Photo Item Component (Optimized with memo)
const PhotoItem = React.memo(({ item, onSelect }) => (
  <TouchableOpacity onPress={() => onSelect(item.uri)}>
    <Image source={{ uri: item.uri }} style={styles.photo} />
  </TouchableOpacity>
));

export default function ProfileSelectPage({ navigation, route }) {
  const [photos, setPhotos] = useState([]);
  const [hasPermission, setHasPermission] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState("all_photos");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photoLimit, setPhotoLimit] = useState(50);
const [currentTheme, setCurrentTheme] = useState('light');

useEffect(() => {
    const loadDarkModeSetting = async () => {
      try {
        const darkModeSetting = await SecureStore.getItemAsync('darkModeSetting');
        setCurrentTheme(darkModeSetting === 'On' ? 'dark' : 'light');
      } catch (error) {
        console.error('Error loading dark mode setting:', error);
      }
    };
    loadDarkModeSetting();
  }, []);

  useEffect(() => {
    if (route?.params?.currentTheme) {
      setCurrentTheme(route.params.currentTheme);
    }
  }, [route?.params?.currentTheme]);

  useEffect(() => {
    StatusBar.setBackgroundColor(currentTheme === 'dark' ? '#262729' : '#fff');
    StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
  }, [currentTheme]);


const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  }
  const containerStyle = {
    flex: 1,
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };
  
  const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      console.log("MediaLibrary permission status:", status);
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        const albumData = await MediaLibrary.getAlbumsAsync();
        console.log("Loaded albums: ", albumData);
        const filteredAlbumData = albumData.filter(album => album.assetCount > 0);

        const allPhotosOption = { label: 'All Photos', value: 'all_photos' };
        const albumOptions = [allPhotosOption, ...filteredAlbumData.map(album => ({
          label: `${album.title} (${album.assetCount})`,
          value: album.id,
        }))];

        setAlbums(albumOptions);
        loadPhotos("all_photos");
      }
    })();
  }, []);

  const loadPhotos = async (albumId = null) => {
    setIsLoading(true);
    const albumAssets = await MediaLibrary.getAssetsAsync({
      album: albumId !== 'all_photos' ? albumId : null,
      mediaType: 'photo',
      first: photoLimit,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    setPhotos(albumAssets.assets);
    setIsLoading(false);
    if (albumAssets.assets.length > 0 && !selectedPhoto) {
      setSelectedPhoto(albumAssets.assets[0].uri);
    }
  };

  const loadMorePhotos = async () => {
    setPhotoLimit(prevLimit => prevLimit + 50);
    loadPhotos(selectedAlbum);
  };

  const cropImage = async () => {
    if (selectedPhoto) {
      const croppedPhoto = await ImageManipulator.manipulateAsync(
        selectedPhoto,
        [{ crop: { originX: 0, originY: 0, width: 300, height: 300 } }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG }
      );
      console.log("Cropped Photo URI:", croppedPhoto.uri);
    }
  };

  if (hasPermission === null) return <Text>Requesting permission...</Text>;
  if (hasPermission === false) return <Text>Permission denied</Text>;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="close-outline" size={35} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>Select profile picture</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfilePage', { selectedPhoto })}>
          <Text style={styles.nextButton}>Next</Text>
        </TouchableOpacity>
      </View>

      {isLoading && photos.length === 0 ? (
        <ActivityIndicator size="large" color="#000" style={styles.loadingIndicator} />
      ) : (
        <>
          {selectedPhoto && (
            <View style={styles.selectedPhotoContainer}>
              <Image source={{ uri: selectedPhoto }} style={styles.selectedPhoto} />
            </View>
          )}

          <DropDownPicker
            open={open}
            value={selectedAlbum}
            items={albums}
            setOpen={setOpen}
            setValue={setSelectedAlbum}
            onChangeValue={(value) => {
              setPhotos([]);
              setSelectedAlbum(value);
              loadPhotos(value);
            }}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            placeholder="Select Album"
            zIndex={1000}
            scrollViewProps={{ nestedScrollEnabled: true }}
          />

          <FlatList
            data={photos}
            numColumns={3}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PhotoItem item={item} onSelect={setSelectedPhoto} />}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 100, // Approximate height
              offset: 100 * index,
              index,
            })}
            onEndReached={loadMorePhotos}
            onEndReachedThreshold={0.5}
            ListFooterComponent={isLoading && <ActivityIndicator size="small" color="#000" />}
          />
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  dropdown: {
    width: 150,
    borderWidth: 0,
    elevation: 4,
    marginLeft: 10,
    marginBottom: 20,
  },
  dropdownContainer: {
    width: 150,
    borderWidth: 0,
    elevation: 4,
    marginLeft: 10,
  },
  nextButton: {
    color: '#fff',
    fontSize: 16,
    backgroundColor: '#1876f2',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 5,
  },
  loadingIndicator: {
    marginTop: 20,
    alignSelf: 'center',
  },
  selectedPhotoContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 20,
    elevation: 5,
    borderColor: '#ccc',
    borderWidth: 4,
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
  },
  photo: {
    width: 120,
    height: 120,
    backgroundColor: '#efefef',
    marginRight: 2,
    marginBottom: 2,
  },
});