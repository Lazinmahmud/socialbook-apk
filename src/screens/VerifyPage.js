import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { database } from '../components/firebaseConfig';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const VerifyPage = ({ navigation, route }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isAgeEligible, setIsAgeEligible] = useState(false);
  const [has10Posts, setHas10Posts] = useState(false);


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
  const fetchUserData = async () => {
    try {
      const storedEmail = await SecureStore.getItemAsync('user-email');
      if (storedEmail) {
        setEmail(storedEmail);

        const snapshot = await database.ref('UserAuthList').once('value');
        const users = snapshot.val();

        for (let id in users) {
          if (users[id].Email === storedEmail) {
            setFullName(users[id].firstName + ' ' + users[id].lastName);
            setProfilePic(users[id].profilePicture || null);

            const birthDate = new Date(users[id].dateOfBirth);
            const currentDate = new Date();
            const age = currentDate.getFullYear() - birthDate.getFullYear();

            // Change age eligibility condition to 18 years
            if (age > 14 || (age === 14 && currentDate >= new Date(birthDate.setFullYear(birthDate.getFullYear() + 14)))) {
              setIsAgeEligible(true);
            } else {
              setIsAgeEligible(false);
            }

            break;
          }
        }

        const postsSnapshot = await database.ref('All_Post').once('value');
        const allPosts = postsSnapshot.val();
        let userPostCount = 0;

        for (let postId in allPosts) {
          if (allPosts[postId].account === storedEmail) {
            userPostCount++;
          }
        }

        setHas10Posts(userPostCount >= 10);
        setLoading(false);  // Set loading to false once data is loaded
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);  // Stop loading if there's an error
    }
  };

  fetchUserData();
}, []);

  // Check if all criteria are met to enable the "Next" button
  const isNextButtonEnabled = profilePic && isAgeEligible && has10Posts;
  
  
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };
  
const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };
  
  

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Loading Indicator */}
      {loading ? (
        <ActivityIndicator size="large" color="#000" style={styles.loadingIndicator} />
      ) : (
        <>
          <View style={[styles.headerContainer, containerStyle]}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={24} />
            </TouchableOpacity>
            <Text style={[styles.header, dynamicTextColor]}> SocialBook Verified</Text>
          </View>

          {/* Profile Picture and Name Section */}
          <View style={styles.profileContainer}>
            <View style={styles.imageWrapper}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileImage} />
              ) : (
                <Image source={require('../assets/user.png')} style={styles.profileImage} />
              )}
              <View style={styles.nameBox}>
                <Text style={[styles.name, dynamicTextColor]}>{fullName}</Text>
                <Image source={require('../assets/verified.png')} style={styles.verifyIcon} />
              </View>
            </View>
          </View>

          <Text style={[styles.noteHeader, dynamicTextColor]}>You are added to our verification list.</Text>
          <Text style={styles.note}>1. To get the SocialBook Verified Badge, you must complete our verified criteria.</Text>
          <Text style={styles.note}>2. Start the verification process with 3 steps.</Text>
          <Text style={styles.note}>3. Apply for verification with your commonly used name, your original profile picture, and your real-life activities.</Text>

          <View style={styles.diagramContainer}>
            <View style={styles.row}>
              <Ionicons 
                name={profilePic ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color={profilePic ? "green" : "gray"} 
              />
              <Text style={[styles.diagramText, dynamicTextColor]}>Original profile picture and real name</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.row}>
              <Ionicons 
                name={has10Posts ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color={has10Posts ? "green" : "gray"} 
              />
              <Text style={[styles.diagramText, dynamicTextColor]}>You must have at least 10 posts on your account.</Text>
            </View>
            <View style={styles.line} />
            <View style={styles.row}>
              <Ionicons 
                name={isAgeEligible ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color={isAgeEligible ? "green" : "gray"} 
              />
              <Text style={[styles.diagramText, dynamicTextColor]}>Your age must be 14 years or above</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: isNextButtonEnabled ? "#000" : "#cccccc" }]} 
            disabled={!isNextButtonEnabled}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Next</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#ccc',
    paddingBottom: 5,
    zIndex: 1,
    borderBottomColor: '#D4D8D9',
  },
  header: {
    fontSize: 20,
    marginLeft: 10,
    textAlign: 'center',
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  imageWrapper: {
    alignItems: 'center',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    elevation: 3,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  nameBox: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifyIcon: {
    width: 24,
    height: 24,
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  diagramText: {
    fontSize: 16,
    marginLeft: 10,
  },
  line: {
    height: 30,
    width: 2,
    backgroundColor: 'gray',
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  diagramContainer:{
    marginTop: 25,
  },
  noteHeader:{
    marginTop: 15,
    marginBottom: 10,
    fontSize: 18,
    fontFamily: 'Poppins_500Medium',
  },
  note:{
    color: 'gray',
    fontSize: 14,
    marginBottom: 10,
  },
  loadingIndicator:{
    marginTop: 'auto',
    marginBottom: 'auto',
  }
});

export default VerifyPage;