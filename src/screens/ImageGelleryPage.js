import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

export default function ImageGalleryPage( route ) {
  const navigation = useNavigation();
  const [albums, setAlbums] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedAlbumId, setSelectedAlbumId] = useState("recent");
  const [albumItems, setAlbumItems] = useState([{ label: "Gallery", value: "recent" }]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [pageCursor, setPageCursor] = useState(null);
  const [currentTheme, setCurrentTheme] = useState('light');

  const loadAlbumItems = useCallback(async () => {
    try {
      // সব অ্যালবাম + স্মার্ট অ্যালবাম লোড করা
      const albumList = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });

      console.log("All Albums:", albumList); // ডিবাগিংয়ের জন্য

      // ডিফল্ট অপশন (সাম্প্রতিক সব ফটো)
      const albumItemsData = [{ label: "Gallery", value: "recent" }];

      // প্রতিটি অ্যালবামের জন্য ডাটা তৈরি করা
      for (const album of albumList) {
        albumItemsData.push({ label: album.title, value: String(album.id) });
      }

      setAlbums(albumList);
      setAlbumItems(albumItemsData);
    } catch (error) {
      console.error("Error loading albums:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status === 'granted') {
        await loadAlbumItems();
        loadAlbumImages("recent", 100);
      }
    })();
  }, [loadAlbumItems]);

  const loadAlbumImages = async (albumId, limit) => {
    setLoading(true);
    try {
      let allAssets = [];
      let result;

      if (albumId === "recent") {
        result = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.photo,
          first: limit,
          after: pageCursor,
          sortBy: [[MediaLibrary.SortBy.creationTime, false]],
        });
      } else {
        result = await MediaLibrary.getAssetsAsync({
          album: albumId,
          mediaType: MediaLibrary.MediaType.photo,
          first: limit,
        });
      }

      allAssets = result.assets;
      setPageCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
      setPhotos((prevPhotos) => [...prevPhotos, ...allAssets]);
    } catch (error) {
      console.error("Failed to load album images:", error);
    }
    setLoading(false);
  };

  const handleAlbumSelect = (albumId) => {
    setSelectedAlbumId(albumId);
    setPhotos([]);
    loadAlbumImages(albumId, 100);
  };

  const handleImageSelect = (uri) => {
    navigation.navigate('PostCreatePage', { selectedImageUri: uri });
  };

  const renderFooter = () => {
    return loading ? <ActivityIndicator size="large" color="#000" style={[styles.loadingIndicator, dynamicTextColor]} /> : null;
  };

  const loadMoreImages = () => {
    if (hasNextPage) {
      loadAlbumImages(selectedAlbumId, 100);
    }
  };


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




const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    color: currentTheme === 'dark' ? '#fff' : '#000',
    
  };
const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
    
  };



  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="close" size={32} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicTextColor]}>Create New Post</Text>
        <TouchableOpacity style={styles.headerIcons} onPress={() => Alert.alert("Coming Soon", "This feature is coming soon!")}>
          <Ionicons name="camera" size={30} color="black" style={[styles.icon, dynamicTextColor]} />
        </TouchableOpacity>
      </View>

      <DropDownPicker
        open={open}
        value={selectedAlbumId}
        items={albumItems}
        setOpen={setOpen}
        setValue={setSelectedAlbumId}
        setItems={setAlbumItems}
        placeholder="Select an Album"
        onChangeValue={(value) => handleAlbumSelect(value)}
        style={[styles.dropdown, containerStyle]}
        dropDownContainerStyle={[styles.dropdownContainer, containerStyle]}
      />

      <FlatList
        data={photos}
        keyExtractor={(item, index) => `${item.albumId}-${item.uri}-${index}`}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleImageSelect(item.uri)}>
            <Image source={{ uri: item.uri }} style={styles.photo} />
          </TouchableOpacity>
        )}
        numColumns={3}
        style={styles.photoGallery}
        ListFooterComponent={renderFooter}
        onEndReached={loadMoreImages}
        onEndReachedThreshold={0.5}
      />
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
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Roboto_700Bold',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  icon: {
    marginLeft: 15,
  },
  dropdown: {
    marginTop: 10,
    width: 150,
    marginLeft: 10,
    elevation: 3,
    borderWidth: 0,
  },
  dropdownContainer: {
    marginHorizontal: 10,
    elevation: 3,
    width: 150,
    borderWidth: 0,
  },
  loadingIndicator: {
    marginTop: 25,
    marginBottom: 20,
    alignSelf: 'center',
  },
  photoGallery: {
    flex: 1,
    marginTop: 10,
    width: '100%',
  },
  photo: {
    width: 119,
    height: 150,
    marginRight: 2,
    marginBottom: 2,
    borderRadius: 1,
    backgroundColor: '#efefef',
  },
});