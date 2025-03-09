import React, { useState, useEffect, useRef } from 'react';
import { View, Image, TextInput, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, BackHandler, StatusBar, Animated, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { database, storage } from '../components/firebaseConfig'; // Correct import
import * as SecureStore from 'expo-secure-store';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { Video, Audio } from 'expo-av';




export default function PostCreatePage() {
  const navigation = useNavigation();
  const route = useRoute();
  const [currentTheme, setCurrentTheme] = useState('light');

  const [isPressed, setIsPressed] = useState(false);
  const [textInputHeight, setTextInputHeight] = useState(100);
  const [isPostButtonActive, setIsPostButtonActive] = useState(false);
  const [textInputValue, setTextInputValue] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePicture, setProfilePicture] = useState(''); // State to store profile picture URL 
  

  const { selectedImageUri: initialImageUri } = route.params || {};
  const [selectedImageUri, setSelectedImageUri] = useState(initialImageUri);
  const [selectedVideoUri, setSelectedVideoUri] = useState(null); 
  

  const slideAnim = useRef(new Animated.Value(300)).current;



    
    
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






  useEffect(() => {
    // Retrieve email from SecureStore
    SecureStore.getItemAsync('user-email').then(email => {
      if (email) {
        // Fetch user data from Firebase
        database.ref('UserAuthList').orderByChild('Email').equalTo(email).once('value', snapshot => {
          if (snapshot.exists()) {
            const userData = Object.values(snapshot.val())[0];
            setFirstName(userData.firstName);
            setLastName(userData.lastName);
            setProfilePicture(userData.profilePicture || ''); // Set profile picture from database (if available)
          }
        });
      }
    });
  }, []);

  const handlePressIn = () => {
    setIsPressed(true);
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handleImageSelection = () => {
    setSelectedVideoUri(null);  // Clear selected video when selecting an image
    setSelectedImageUri(null);  // Clear selected image when selecting a new image
    navigation.navigate('ImageGelleryPage');
  };

  const handleVideoSelection = async () => {
  try {
    const videoFeatureRef = database.ref("adminControl/videoFeature"); // Firebase v8 style

    videoFeatureRef.once("value", async (snapshot) => {
      const videoFeatureStatus = snapshot.val();

      if (videoFeatureStatus !== "on") {
        Alert.alert("Unavailable", "You can't use this feature right now, This feature is not available.");
        return;
      }

      // যদি videoFeature "on" থাকে, তাহলে ভিডিও সিলেক্ট করার অপশন দেখাবে
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You need to grant permission to access the media library.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedVideoUri(result.assets[0].uri);
        setSelectedImageUri(null);
      } else {
        Alert.alert("No video selected", "Please select a video.");
      }
    });
  } catch (error) {
    console.error("Error selecting video:", error);
    Alert.alert("Error", "An error occurred while selecting the video.");
  }
};
  
  useEffect(() => {
    if (route.params?.selectedImageUri) {
      setSelectedImageUri(route.params.selectedImageUri); // Update image URI if passed from ImageGalleryPage
    }
  }, [route.params?.selectedImageUri]);
  
  useEffect(() => {
  if (selectedImageUri || selectedVideoUri || textInputValue.trim().length > 0) {
    setIsPostButtonActive(true);
  } else {
    setIsPostButtonActive(false);
  }
}, [selectedImageUri, selectedVideoUri, textInputValue]);

  useEffect(() => {
    const backAction = () => {
      if (textInputValue || selectedImageUri || selectedVideoUri) {
        setIsModalVisible(true);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

    return () => backHandler.remove();
  }, [textInputValue, selectedImageUri, selectedVideoUri]);

  useEffect(() => {
    if (isModalVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 200,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible]);

  const handleTextSubmit = () => {
    setTextInputHeight(prevHeight => prevHeight + 10);
  };

  const handleBackPress = () => {
  if (textInputValue || selectedImageUri || selectedVideoUri) { // ভিডিও বা ইমেজও চেক করুন
    setIsModalVisible(true);
  } else {
    navigation.goBack();
  }
};

  const handleSaveDraft = () => {
    Alert.alert('Draft saved!');
    setIsModalVisible(false);
    navigation.goBack();
  };

  const handleDiscardPost = () => {
    setTextInputValue("");
    setIsModalVisible(false);
    navigation.goBack();
  };

const handlePost = async () => {
  if (!textInputValue && !selectedImageUri && !selectedVideoUri) {
    Alert.alert("Error", "Please add some text, select an image, or select a video before posting.");
    return;
  }

  const postId = Date.now().toString();

  try {
    // Show "Uploading..." Toast
    const toastId = Toast.show({
      type: 'info',
      text1: 'Uploading...',
      text2: 'Your post is being uploaded, please wait.',
      autoHide: false,
    });

    // Navigate back immediately
    navigation.goBack();

    let postImageUrl = "";
    let postVideoUrl = "";

    // Image upload if selected
    if (selectedImageUri) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        selectedImageUri,
        [{ resize: { width: 800 } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      const response = await fetch(manipulatedImage.uri);
      const blob = await response.blob();

      const storageRef = storage.ref().child(`postImages/${postId}`);
      const uploadTask = storageRef.put(blob);

      // Track the progress of the image upload
      uploadTask.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

        // Update the existing Toast message with image upload progress
        Toast.show({
          id: toastId, // Use the existing Toast id
          type: 'info',
          text1: 'Uploading...',
          text2: `Post uploading : ${Math.round(progress)}%`,
          autoHide: false,
        });
      });

      await uploadTask; // Wait until the image upload is complete
      postImageUrl = await storageRef.getDownloadURL();
    }

    // Video upload if selected
    if (selectedVideoUri) {
      const response = await fetch(selectedVideoUri);
      const blob = await response.blob();

      const storageRef = storage.ref().child(`postVideos/${postId}`);
      const uploadTask = storageRef.put(blob);

      // Track the progress of the video upload
      uploadTask.on('state_changed', snapshot => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

        // Update the existing Toast message with video upload progress
        Toast.show({
          id: toastId, // Use the existing Toast id
          type: 'info',
          text1: 'Uploading...',
          text2: `Video Uploading : ${Math.round(progress)}%`,
          autoHide: false,
        });
      });

      await uploadTask; // Wait until the video upload is complete
      postVideoUrl = await storageRef.getDownloadURL();
    }

    const userEmail = await SecureStore.getItemAsync("user-email");
    if (!userEmail) {
      Alert.alert("Error", "User email not found. Please log in again.");
      return;
    }

    const postData = {
      postId: postId,
      userName: `${firstName} ${lastName}`,
      profileImage: profilePicture || "",
      postText: textInputValue || "",
      postImage: postImageUrl,
      postVideo: postVideoUrl,
      timestamp: new Date().toISOString(),
      account: userEmail,
    };

    await database.ref(`All_Post/${postId}`).set(postData);

    // Play sound after successful upload
    const soundObject = new Audio.Sound();
    await soundObject.loadAsync(require('../assets/post-sound.mp3'));
    await soundObject.playAsync();

    // Hide "Uploading..." Toast and show success message
    Toast.hide(toastId);
    Toast.show({
      type: 'success',
      text1: 'Upload Successful',
      text2: 'Your post was uploaded successfully!',
    });

    // Reset input values
    setTextInputValue("");
    setTextInputHeight(100);
    setSelectedVideoUri(null);
    setSelectedImageUri(null);

  } catch (error) {
    console.error("Failed to save post:", error);
    Toast.hide(toastId);
    Toast.show({
      type: 'error',
      text1: 'Upload Failed',
      text2: 'Failed to upload your post. Please try again.',
    });
  }
};

// Image upload function
const uploadImage = async (imageUri, postId) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const storageRef = storage.ref().child(`postMedia/${postId}`);
    const snapshot = await storageRef.put(blob);
    const imageUrl = await snapshot.ref.getDownloadURL();
    return imageUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};

const uploadVideo = async (videoUri, postId) => {
  try {
    // ভিডিও ফাইলটি blob এ রূপান্তরিত করা
    const response = await fetch(videoUri);
    const blob = await response.blob();

    // Firebase Storage এ ভিডিও আপলোড করা
    const storageRef = storage.ref().child(`postVideos/${postId}`);
    const snapshot = await storageRef.put(blob);

    // ভিডিও ফাইলের ডাউনলোড URL পাওয়া
    const videoUrl = await snapshot.ref.getDownloadURL();
    return videoUrl;
  } catch (error) {
    console.error("Error uploading video:", error);
    throw error;
  }
}; 


   
   
const headerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff', 
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  }
  const containerStyle = {
    flex: 1,
    backgroundColor: currentTheme === 'dark' ? '#1a1a1a' : '#fff',
  };
  const textInputStyle = {
    height: textInputHeight,
    color: dynamicTextColor,
  };
  
  const borderColor = {
    
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };




  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.fixedHeader, headerStyle]}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons style={[styles.noneNone, dynamicTextColor]} name="arrow-back" size={30} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicTextColor]}>Create Post</Text>
        <TouchableOpacity
          style={[styles.postButton, !isPostButtonActive && styles.postButtonInactive]}
          disabled={!isPostButtonActive}
          onPress={handlePost} // Update this line
        >
          <Text style={styles.postButtonText}>Post</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.scrollContainer, borderColor]} showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        <View style={styles.postCreatePageInto}>
          {/* Use dynamic profile image from the state */}
          <Image 
            source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')} 
            style={styles.postCreateProfileImg} 
          />
          <View style={styles.intoDetails}>
            <Text style={[styles.UserName, dynamicTextColor]}>{firstName} {lastName}</Text>
            <View style={styles.publicBox}>
              <Ionicons style={styles.publicIcon} name="earth" size={13} />
              <Text style={styles.publicText}>Public</Text>
            </View>
          </View>
        </View>

        <View style={styles.inputBoxContainer}>
          <View style={styles.postTextInputBox}>
            <TextInput
  style={[styles.textInput, { height: textInputHeight }, dynamicTextColor]}
  multiline={true}
  placeholder={`What do you think, ${firstName}?`}
  placeholderTextColor={currentTheme === 'dark' ? '#fff' : '#808080'} // Dark mode এ #fff সেট করুন
  textAlignVertical="top"
  onChangeText={setTextInputValue}
  value={textInputValue}
  onSubmitEditing={handleTextSubmit}
/>
          </View>
        </View>

        {selectedImageUri && (
  <Image source={{ uri: selectedImageUri }} style={styles.selectedImage} />
)}

{selectedVideoUri && (
  <Video
    source={{ uri: selectedVideoUri }}
    style={styles.selectedVideo}
    useNativeControls
    resizeMode="cover"
    isLooping
  />
)}

        <TouchableOpacity
          style={[
            styles.selectPhotoContainer, borderColor, 
            isPressed && { backgroundColor: '#efefef' },
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleImageSelection}
        >
          <Ionicons style={styles.galleryIcon} name="images"/>
          <Text style={[styles.photoText, dynamicTextColor]}>Choose a Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.feelingsContainer, borderColor]} onPress={handleVideoSelection}>
  <Ionicons style={styles.videoIcon} name="logo-youtube"/>
  <Text style={[styles.photoText, dynamicTextColor]}>Create Reels</Text>
</TouchableOpacity>
        <TouchableOpacity style={[styles.feelingsContainer, borderColor]}>
          <Ionicons style={styles.fellingsIcon} name="happy"/>
          <Text style={[styles.photoText, dynamicTextColor]}>Feelings/Activity</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        transparent={true}
        visible={isModalVisible}
        animationType="none"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalBackground}>
            <Animated.View style={[styles.modalContainer, containerStyle, { transform: [{ translateY: slideAnim }] }]}>
              <Text style={[styles.modalTitle, dynamicTextColor]}>Want to finish your post later?</Text>
              <Text style={[styles.modalText, dynamicTextColor]}>Save it as a draft or you can continue editing it.</Text>
              <TouchableOpacity style={styles.modalOption} onPress={handleSaveDraft}>
                <Ionicons style={[styles.none, dynamicTextColor]} name="bookmark-outline" size={20} color="black" />
                <Text style={[styles.modalOptionText, dynamicTextColor]}>Save as draft</Text>
                </TouchableOpacity>
              <TouchableOpacity style={styles.modalOption} onPress={handleDiscardPost}>
                <Ionicons style={[styles.none, dynamicTextColor]} name="trash-outline" size={20} color="black" />
                <Text style={[styles.modalOptionText, dynamicTextColor]}>Discard Post</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOption} onPress={() => setIsModalVisible(false)}>
                <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={20} color="black" />
                <Text style={[styles.modalOptionText, dynamicTextColor]}>Continue Editing</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
  },
  fixedHeader: {
    position: 'absolute', // fixed position for the header
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10, // ensures header stays on top
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  postButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  postButtonInactive: {
    backgroundColor: '#b3b3b3',
  },
  postButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContainer: {
    marginTop: 60,
  },
  postCreatePageInto: {
    width: '100%',
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  postCreateProfileImg: {
    width: 45,
    height: 45,
    borderRadius: 50,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  UserName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  publicBox: {
    backgroundColor: '#EBF5FF',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    padding: 6,
    gap: 5,
    marginTop: 7,
    width: 70,
  },
  publicIcon: {
    color: '#0064D3',
  },
  publicText: {
    color: '#0064D3',
    fontWeight: 'bold',
  },
  inputBoxContainer: {
    width: '100%',
    
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTextInputBox: {
    width: '95%',
  },
  textInput: {
    fontSize: 17,
    padding: 10,
    
  },
  selectedImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    marginTop: 10,
    resizeMode: 'cover',
  },
  selectPhotoContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feelingsContainer: {
    width: '100%',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fellingsIcon:{
    color: '#FFBD00',
    fontSize: 25,
  },
  galleryIcon:{
    fontSize: 25,
    color: '#00B056'
  },
  videoIcon:{
    fontSize: 25,
    color: 'red',
  },
  photoText: {
    fontSize: 16,
    
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  modalOptionText: {
    fontSize: 16,
    marginLeft: 10,
  },
  modalOptionTextContinue: {
    fontSize: 16,
    marginLeft: 10,
    color: '#1876f2',
  },
  selectedVideo: {
  width: '100%',
  height: 200,
  marginVertical: 10,
},
});