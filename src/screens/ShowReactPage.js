import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, BackHandler, FlatList, Image, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../components/firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as SecureStore from 'expo-secure-store';

export default function ShowReactPage({ navigation, route }) {
  const { postId } = route.params;
  const [likedUsers, setLikedUsers] = useState([]);
  const [userAuthList, setUserAuthList] = useState([]);
  const [likeCount, setLikeCount] = useState(0);
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

  useEffect(() => {
    const postRef = database.ref(`All_Post/${postId}/likedUsers`);
    postRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersArray = Object.entries(data).map(([email, name]) => ({
          email,
          name,
        }));
        setLikedUsers(usersArray);
        setLikeCount(usersArray.length);
      }
    });

    const userAuthRef = database.ref('UserAuthList');
    userAuthRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const authUsers = Object.values(data).map((user) => ({
          email: user.Email.replace(/,|\./g, ''),
          profilePicture: user.profilePicture,
        }));
        setUserAuthList(authUsers);
      }
    });

    return () => {
      postRef.off();
      userAuthRef.off();
    };
  }, [postId]);

  const getUserProfilePicture = (email) => {
    const cleanedEmail = email.replace(/,|\./g, '');
    const user = userAuthList.find((user) => user.email === cleanedEmail);
    return user ? user.profilePicture : null;
  };

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const dynamicBorderColor = {
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };

  const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };

  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };

  const renderUserItem = ({ item }) => {
    const profilePicture = getUserProfilePicture(item.email);

    return (
      <View style={[styles.userReact, dynamicBorderColor]}>
        <View style={styles.reactIconAndProfile}>
          <Image
            source={
              profilePicture
                ? { uri: profilePicture }
                : require('../assets/user.png')
            }
            style={styles.userReactProfile}
          />
          <AntDesign style={styles.reactIcon} name="like1" size={20} />
        </View>
        <Text style={[styles.reactUserNameText, dynamicTextColor]}>{item.name}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.header, containerStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.backIcon, dynamicTextColor]} name="arrow-back-outline" size={26} />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>People who reacted</Text>
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}
        >
          <Ionicons style={[styles.searchIcon, dynamicTextColor]} name="search-outline" />
        </TouchableOpacity>
      </View>

      <View style={[styles.reactHeader, containerStyle]}>
        <Text style={[styles.reactHeaderText, { color: '#1876f2' }]}>All {likeCount}</Text>
      </View>

      <FlatList
        data={likedUsers}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderUserItem}
        contentContainerStyle={[styles.scrollContainer, containerStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header:{
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.5,
  },
  backIcon:{
    padding: 4,
  },
  headerText:{
    fontSize: 18,
  },
  reactHeader:{
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.5,
  },
  reactHeaderText:{
    marginLeft: 10,
    fontSize: 15,
    color: '#1876f2',
  },
  scrollContainer:{
    width: '100%',
    backgroundColor: '#fff',
  },
  userReact:{
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userReactProfile:{
    width: 45,
    height: 45,
    borderRadius: 50,
  },
  reactIconAndProfile:{
    position: 'relative',
  },
  reactUserNameText:{
    fontWeight: 'bold',
  },
  reactIcon:{
    color: '#fff',
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#1876f2',
    fontSize: 13,
    borderRadius: 50,
    padding: 3,
    elevation: 2,
  },
  searchBox:{
    marginLeft: 'auto',
  },
  searchIcon:{
    fontSize: 28,
  }
});