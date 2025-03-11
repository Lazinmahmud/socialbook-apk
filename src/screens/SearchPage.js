import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, ScrollView, TouchableOpacity, StyleSheet, Image, Text, TouchableNativeFeedback, Platform, KeyboardAvoidingView, StatusBar, BackHandler} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase, ref, onValue } from 'firebase/database';
import * as SecureStore from 'expo-secure-store';

export default function SearchPage({ route, navigation }) {
  const { autoFocus } = route.params || {}; // Check if autoFocus is passed
  const [searchText, setSearchText] = useState('');
  const [userList, setUserList] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const searchInputRef = useRef(null); // Create a ref for 
  const [currentTheme, setCurrentTheme] = useState('light'); // Default theme set as 'light'

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



  // Focus on TextInput if autoFocus is true
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus(); // Add delay to ensure keyboard appears
      }, 100); // 100ms delay
    }
  }, [autoFocus]);

  // Fetch user data from Firebase on component mount
  useEffect(() => {
    const db = getDatabase();
    const userRef = ref(db, 'UserAuthList'); // Firebase database path
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const users = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        setUserList(users);
      } else {
        setUserList([]);
      }
    });
  }, []);

  // Filter users based on search text
  useEffect(() => {
    if (searchText === '') {
      setFilteredUsers([]);
    } else {
      const filtered = userList.filter((user) => {
        const firstNameMatch = user.firstName.toLowerCase().startsWith(searchText.toLowerCase());
        const lastNameMatch = user.lastName.toLowerCase().startsWith(searchText.toLowerCase());
        return firstNameMatch || lastNameMatch; // Match with either firstName or lastName
      });
      setFilteredUsers(filtered);
    }
  }, [searchText, userList]);

  // Function to highlight matched text
  const highlightText = (text, highlight) => {
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <Text key={index} style={{ fontWeight: 'bold', color: {dynamicTextColor} }}>
          {part}
        </Text>
      ) : (
        <Text key={index}>{part}</Text>
      )
    );
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
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };
  
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };
  
  const searchBoxColor = {
    backgroundColor: currentTheme === 'dark' ? '#3B3C3E' : '#efefef',
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };
  
  
  

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} // Adjust behavior for iOS
    >
      <View style={[styles.container, containerStyle ]}>
        {/* Header */}
        <View style={[styles.header, containerStyle ]}>
          <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
            <Ionicons style={[styles.none, dynamicTextColor ]} name="chevron-back-outline" size={27} color="black" />
          </TouchableOpacity>
          <TextInput
            ref={searchInputRef} // Attach ref here
            style={[styles.searchInput, searchBoxColor ]}
            placeholder="Search"
            placeholderTextColor="#888"
            value={searchText}
            onChangeText={(text) => setSearchText(text)}
            keyboardType="default"
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {/* Search Results */}
        <ScrollView style={styles.mainContainer}>
          {filteredUsers.map((user) => (
           <TouchableNativeFeedback
  key={user.id}
  background={
    Platform.OS === 'android'
      ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false)
      : undefined
  }
  onPress={() => {
    console.log('Navigating to UserProfilePage with email:', user.Email); // Add this line
    navigation.navigate('UserProfilePage', { email: user.Email });
  }}
>
  <View style={styles.userSearchResult}>
    <Image
      source={{ uri: user.profilePicture || '../assets/user.png' }}
      style={styles.profileImg}
    />
    <View>
      <Text style={[styles.userName, dynamicTextColor ]}>
      {highlightText(`${user.firstName} ${user.lastName}`, searchText)}
    </Text>
    <Text style={styles.profileText}>Profile</Text>
    </View>
    <Ionicons style={[styles.nextIcon, dynamicTextColor ]} name="arrow-forward-outline" size={27} color="black" />
  </View>
</TouchableNativeFeedback>
          ))}
          {filteredUsers.length === 0 && searchText !== '' && (
            <Text style={styles.noResults}>No results found for "{searchText}"</Text>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingRight: 15,
    paddingVertical: 10,
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 3,
  },
  backIcon: {
    padding: 5,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
  },
  mainContainer: {
    marginTop: 15,
    flex: 1,
  },
  userSearchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 18,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  nextIcon:{
    marginLeft: 'auto',
  },
  profileText:{
    color: 'gray',
    fontSize: 12,
  }
});