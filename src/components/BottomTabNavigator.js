import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Text, StatusBar } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableRipple } from 'react-native-paper';
import * as SecureStore from 'expo-secure-store';
import { database } from '../components/firebaseConfig';
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MenuPage from '../screens/MenuPage';
import CreatePage from '../screens/CreatePage';
const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const [profilePicture, setProfilePicture] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [currentTheme, setCurrentTheme] = useState('light');
  const scrollViewRef = useRef(null);

  // ✅ **Profile Picture Fetching (From Old Code)**
  useEffect(() => {
    const getUserProfilePicture = async () => {
      try {
        const email = await SecureStore.getItemAsync('user-email');
        if (email) {
          const userSnapshot = await database
            .ref('UserAuthList')
            .orderByChild('Email')
            .equalTo(email)
            .once('value');
          const userData = userSnapshot.val();
          if (userData) {
            const user = Object.values(userData)[0];
            setProfilePicture(user.profilePicture);
          }
        }
      } catch (error) {
        console.error('Error fetching user data from Firebase', error);
      }
    };

    getUserProfilePicture();
  }, []);

  // ✅ **Realtime Notification Counter Fetching**
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const email = await SecureStore.getItemAsync('user-email');
        if (!email) return;

        database.ref('All_Post').on('value', (snapshot) => {
          let unseenNotifications = 0;

          snapshot.forEach((post) => {
            const postData = post.val();
            if (postData.account === email && postData.notifications) {
              Object.values(postData.notifications).forEach((notification) => {
                if (!notification.seenStatus) {
                  unseenNotifications++;
                }
              });
            }
          });

          setNotificationCount(unseenNotifications);
        });
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  // ✅ **Dark Mode Fetching & Status Bar Update**
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

  

const dyBorderColor = {
    borderColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarButton: (props) => (
          <TouchableRipple {...props} rippleColor="rgba(0, 0, 0, .10)">
            {props.children}
          </TouchableRipple>
        ),
        tabBarIcon: ({ focused }) => {
  let icon;
  let iconStyle = { width: 24, height: 24 }; // ডিফল্ট সাইজ

  if (route.name === 'Home') {
    icon = currentTheme === 'dark'
      ? focused
        ? require('../assets/homeAc_lite.png')
        : require('../assets/home-lite.png')
      : focused
        ? require('../assets/home-dark.png')
        : require('../assets/home.png');
  } else if (route.name === 'Create') {
    icon = currentTheme === 'dark'
      ? focused
        ? require('../assets/createAc-lite.png')
        : require('../assets/create-lite.png')
      : focused
        ? require('../assets/create-dark.png')
        : require('../assets/create.png');
        iconStyle = { width: 28, height: 28, marginTop: 2, };
  } else if (route.name === 'Friends') {
    icon = currentTheme === 'dark'
      ? focused
        ? require('../assets/friendsAc_lite.png')
        : require('../assets/friends-lite.png')
      : focused
        ? require('../assets/friends-dark.png')
        : require('../assets/friends.png');

    iconStyle = { width: 28, height: 28 }; // ✅ **Friends আইকনের জন্য আলাদা সাইজ**
  } else if (route.name === 'Notifications') {
    icon = currentTheme === 'dark'
      ? focused
        ? require('../assets/notiAc_lite.png')
        : require('../assets/noti-lite.png')
      : focused
        ? require('../assets/notification-dark.png')
        : require('../assets/notification.png');

    return (
      <View style={styles.iconContainer}>
        <Image source={icon} style={iconStyle} />
        {notificationCount > 0 && (
          <View style={[styles.notificationDot, dyBorderColor]}>
            <Text style={styles.notifiCounterText}>{notificationCount}</Text>
          </View>
        )}
      </View>
    );
  } else if (route.name === 'Menu') {
    icon = profilePicture
      ? { uri: profilePicture }
      : require('../assets/user.png');

    iconStyle = [
      styles.roundIcon,
      focused && { borderColor: currentTheme === 'dark' ? '#fff' : '#000', borderWidth: 2 },
    ];
  }

  return <Image source={icon} style={iconStyle} />;
},
        tabBarStyle: {
          elevation: currentTheme === 'dark' ? 0 : 3,
          shadowOpacity: currentTheme === 'dark' ? 0 : 0.1,
          backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
          borderTopWidth: currentTheme === 'dark' ? 0.5 : 0,
          borderColor: currentTheme === 'dark' ? '#65686D' : 'transparent',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Create" component={CreatePage} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Menu" component={MenuPage} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  roundIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  iconContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: -7,
    right: -14,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: '#DE2334',
    borderColor: '#fff',
    borderWidth: 2,
  },
  notifiCounterText: {
    color: '#fff',
    fontSize: 15,
  },
});