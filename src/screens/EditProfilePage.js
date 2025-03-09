import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, ActivityIndicator, StatusBar, BackHandler} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImageManipulator from 'expo-image-manipulator';
import Toast from 'react-native-toast-message';
import { database, storage } from '../components/firebaseConfig';

export default function ProfileScreen({ navigation, route }) {
  const [bioHeight, setBioHeight] = useState(80);
  const [isButtonActive, setIsButtonActive] = useState(false);
  const [profilePicture, setProfilePicture] = useState(null);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const selectedPhoto = route.params?.selectedPhoto;
  const [currentTheme, setCurrentTheme] = useState('light');
  
    // Handle hardware back button press
  useEffect(() => {
    const backAction = () => {
      // Go back to the previous screen
      navigation.goBack();
      return true; // Return true to prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove(); // Cleanup listener
  }, [navigation]);
  
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
  
  

  // ফর্মের প্রাথমিক মানগুলি স্টেট
  const [initialFirstName, setInitialFirstName] = useState('');
  const [initialLastName, setInitialLastName] = useState('');
  const [initialBio, setInitialBio] = useState('');
  const [initialProfilePicture, setInitialProfilePicture] = useState('');

  useEffect(() => {
    const processImage = async () => {
      if (selectedPhoto) {
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedPhoto,
            [{ resize: { width: 800 } }], // Resolution সামান্য কমানো হলো (default 1000+ px থেকে 800px)
            { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG } // High Quality (compress: 1.0)
          );
          setProfilePicture(manipulatedImage.uri);
          setIsButtonActive(true);
        } catch (error) {
          console.error("Error processing image:", error);
          Alert.alert("Error", "Failed to process image.");
        }
      }
    };

    processImage();
}, [selectedPhoto]);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const email = await SecureStore.getItemAsync('user-email');
        if (!email) {
          Alert.alert('Error', 'No email found in local storage');
          setLoading(false);
          return;
        }

        const snapshot = await database.ref('UserAuthList').once('value');
        const users = snapshot.val();
        let userFound = false;

        for (let id in users) {
          if (users[id].Email === email) {
            userFound = true;
            const fetchedFirstName = users[id].firstName || '';
            const fetchedLastName = users[id].lastName || '';
            const fetchedBio = users[id].bio || '';
            const fetchedProfilePicture = users[id].profilePicture || '';

            setFirstName(fetchedFirstName);
            setLastName(fetchedLastName);
            setBio(fetchedBio);
            setProfilePicture(fetchedProfilePicture);

            setInitialFirstName(fetchedFirstName);
            setInitialLastName(fetchedLastName);
            setInitialBio(fetchedBio);
            setInitialProfilePicture(fetchedProfilePicture);

            break;
          }
        }

        if (!userFound) {
          Alert.alert('Error', 'User not found');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const isChanged =
      firstName !== initialFirstName ||
      lastName !== initialLastName ||
      bio !== initialBio ||
      profilePicture !== initialProfilePicture;

    setIsButtonActive(isChanged);
  }, [firstName, lastName, bio, profilePicture, initialFirstName, initialLastName, initialBio, initialProfilePicture]);

  const handleSaveChanges = async () => {
  setLoading(true);
  try {
    const email = await SecureStore.getItemAsync('user-email');
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No email found in local storage',
      });
      setLoading(false);
      return;
    }

    const snapshot = await database.ref('UserAuthList').once('value');
    const users = snapshot.val();
    let userId = null;

    for (let id in users) {
      if (users[id].Email === email) {
        userId = id;
        break;
      }
    }

    if (!userId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'No matching user found',
      });
      setLoading(false);
      return;
    }

    const updates = { firstName, lastName, bio };
    let downloadURL = initialProfilePicture;

    if (profilePicture !== initialProfilePicture) {
      const response = await fetch(profilePicture);
      const blob = await response.blob();

      // Generate a unique filename for the new profile picture
      const uniqueFileName = `profilePictures/${userId}/${new Date().getTime()}.jpg`;
      const storageRef = storage.ref().child(uniqueFileName);
      await storageRef.put(blob);

      downloadURL = await storageRef.getDownloadURL();
      updates.profilePicture = downloadURL;
    }

    await database.ref(`UserAuthList/${userId}`).update(updates);

    // **Generate Timestamp-Based postId**
    const timestamp = new Date().getTime().toString(); // 1740536066807 এর মতো টাইমস্ট্যাম্প আইডি
    const formattedTimestamp = new Date().toISOString();

    if (profilePicture !== initialProfilePicture) {
  // শুধু যদি profile picture পরিবর্তন হয়, তাহলে post store করবে
  const profileUpdatePost = {
    postId: timestamp,
    account: email,
    userName: `${firstName} ${lastName}`,
    profileImage: downloadURL,
    postImage: downloadURL,
    postVideo: '',
    postType: 'profilePic',
    timestamp: formattedTimestamp,
  };

  // **Custom postId দিয়ে Store করা**
  await database.ref(`All_Post/${timestamp}`).set(profileUpdatePost);
}

    Toast.show({
      type: 'success',
      text1: 'Save Change successfully',
      text2: 'Your profile was updated successfully!',
      position: 'top',
      topOffset: 8,
    });

    setIsButtonActive(false);
    setInitialFirstName(firstName);
    setInitialLastName(lastName);
    setInitialBio(bio);
    setInitialProfilePicture(downloadURL);

    navigation.goBack();
  } catch (error) {
    console.error('Error updating profile:', error);
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Failed to update profile',
    });
  } finally {
    setLoading(false);
  }
};

const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#fff' : '#fff',
  };
  
const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };

const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };
  

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.headerContainer, containerStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={24} color="black" />
        </TouchableOpacity>
        <Text style={[styles.header, dynamicTextColor]}>Edit Profile</Text>
      </View>

      <ScrollView style={[styles.mainScrollContainer, containerStyle]}>
        <View style={styles.editProfileBox}>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSelectPage')}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileImage} />
            ) : (
              <Image source={require('../assets/user.png')} style={styles.profileImage} />
            )}
          </TouchableOpacity>
          <Text style={styles.editText}>Tap to select profile picture</Text>
          <Text style={styles.noteText}>Profile also share to news feed.</Text>
        </View>

        <View style={styles.editNameContainer}>
          <View style={[styles.nameEditBox, offWhiteColor]}>
            <TextInput
              style={[styles.textInputName, dynamicTextColor]}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>
          <View style={[styles.nameEditBox, offWhiteColor]}>
            <TextInput
              style={[styles.textInputName, dynamicTextColor]}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
        </View>

        <View style={[styles.BioEditBox, offWhiteColor, { height: bioHeight }]}>
          <Text style={styles.placeholderText}>Bio</Text>
          <TextInput
            style={[styles.textInput, dynamicTextColor]}
            multiline={true}
            textAlignVertical="top"
            placeholder="Describe something about yourself" 
            placeholderTextColor={currentTheme === 'dark' ? '#fff' : '#808080'}
            value={bio}
            onChangeText={setBio}
            onContentSizeChange={(event) =>
              setBioHeight(Math.max(80, event.nativeEvent.contentSize.height))
            }
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveChangeBtn, offWhiteColor,
            { backgroundColor: isButtonActive ? '#000' : '#ccc' },
          ]}
          disabled={!isButtonActive || loading}
          onPress={handleSaveChanges}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}





const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#DADBDF',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  mainScrollContainer: {
    marginTop: 45,
    padding: 10,
    backgroundColor: '#fff',
  },
  editProfileBox: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 50,
  },
  editText: {
    marginTop: 8,
    color: '#1876f2',
    textAlign: 'center',
  },
  noteText:{
    textAlign: 'center',
    marginTop: 6,
    color: '#808080',
  },
  editNameContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  nameEditBox: {
    backgroundColor: '#efefef',
    height: 60,
    width: '48%',
    borderRadius: 10,
    justifyContent: 'center',
  },
  textInputName: {
    padding: 10,
  },
  BioEditBox: {
    marginTop: 20,
    width: '100%',
    minHeight: 80,
    borderRadius: 10,
    backgroundColor: '#efefef',
    padding: 10,
  },
  placeholderText: {
    color: '#707781',
    marginBottom: 5,
  },
  textInput: {
    paddingBottom: 10,
  },
  saveChangeBtn: {
    width: '100%',
    backgroundColor: '#000',
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  saveBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  }
});