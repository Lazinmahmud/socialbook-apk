import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators, TransitionSpecs } from '@react-navigation/stack';
import BottomTabNavigator from './src/components/BottomTabNavigator';
import { StatusBar, AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { database } from './src/components/firebaseConfig';
import Toast from 'react-native-toast-message';
import { useFonts } from 'expo-font';
import { Poppins_400Regular, Poppins_500Medium, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { Pacifico_400Regular, Pacifico_700Bold } from '@expo-google-fonts/pacifico';
import VideoPage from './src/screens/VideoPage';
import VerifyPage from './src/screens/VerifyPage';
import AccountCenter from './src/screens/AccountCenter';
import PostCreatePage from './src/screens/PostCreatePage';
import ShowReactPage from './src/screens/ShowReactPage';
import MessageViewPage from './src/screens/MessageViewPage';
import ImageViewPage from './src/screens/ImageViewPage';
import ChatPage from './src/screens/ChatPage';
import UserProfilePage from './src/screens/UserProfilePage';
import SettingsActivityPage from './src/screens/SettingsActivityPage';
import HomeScreen from './src/screens/HomeScreen';
import CreatePage from './src/screens/CreatePage';
import ImageGelleryPage from './src/screens/ImageGelleryPage';
import LoginPage from './src/screens/LoginPage';
import SignUpPage from './src/screens/SignUpPage';
import EditProfilePage from './src/screens/EditProfilePage';
import ProfileSelectPage from './src/screens/ProfileSelectPage';
import SearchPage from './src/screens/SearchPage';
import PostViewPage from './src/screens/PostViewPage';
import DarkModePage from './src/screens/DarkModePage';
import FriendsScreen from './src/screens/FriendsScreen';


const Stack = createStackNavigator();
SplashScreen.preventAutoHideAsync(); // Prevent splash screen from auto hiding

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [appState, setAppState] = useState(AppState.currentState);
  const [userData, setUserData] = useState(null);
  
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_700Bold,
    Roboto_400Regular,
    Roboto_700Bold,
    Pacifico_400Regular,
    Pacifico_700Bold,
  });
  
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const email = await SecureStore.getItemAsync('user-email');
        setIsLoggedIn(!!email);
      } catch (error) {
        console.log('Error retrieving login status:', error);
        setIsLoggedIn(false);
      } finally {
        await SplashScreen.hideAsync();
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const email = await SecureStore.getItemAsync('user-email');
      if (email) {
        const snapshot = await database
          .ref('UserAuthList')
          .orderByChild('Email')
          .equalTo(email)
          .once('value');

        const user = snapshot.val();
        if (user) {
          const userId = Object.keys(user)[0]; // Get userId based on email
          setUserData({ userId, ...Object.values(user)[0] }); // Store user data and userId
          
          // Set activeStatus to true when user opens the app
          await database.ref(`UserAuthList/${userId}`).update({ activeStatus: true });
        }
      }
    };

    fetchUserData();

    // ❌ subscription.remove() এই লাইনটি মুছে ফেলুন
}, []);

  useEffect(() => {
  const handleAppStateChange = async (nextAppState) => {
    const email = await SecureStore.getItemAsync('user-email');  // Get email from SecureStore

    if (email && nextAppState === 'active') {
      // When the app comes to the foreground, set activeStatus to true for the logged-in user
      const userSnapshot = await database.ref('UserAuthList').orderByChild('Email').equalTo(email).once('value');
      if (userSnapshot.exists()) {
        const userId = Object.keys(userSnapshot.val())[0]; // Get the user ID from the snapshot
        await database.ref(`UserAuthList/${userId}`).update({ activeStatus: true });
      }
    } else {
      // When the app goes to the background, set activeStatus to false for the logged-in user
      if (email) {
        const userSnapshot = await database.ref('UserAuthList').orderByChild('Email').equalTo(email).once('value');
        if (userSnapshot.exists()) {
          const userId = Object.keys(userSnapshot.val())[0];
          await database.ref(`UserAuthList/${userId}`).update({ activeStatus: false });
        }
      }
    }
  };

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove(); // ✅ নতুন মেথড ব্যবহার করুন
  };
}, []);

  if (isLoggedIn === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <Stack.Navigator
        initialRouteName={isLoggedIn ? "MainApp" : "LoginPage"}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="LoginPage"
          component={LoginPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="SignUpPage" 
          component={SignUpPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        
        <Stack.Screen 
          name="MainApp" 
          component={BottomTabNavigator} 
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen
          name="PostCreatePage"
          component={PostCreatePage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen
          name="ImageGelleryPage"
          component={ImageGelleryPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="EditProfilePage" 
          component={EditProfilePage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="ProfileSelectPage" 
          component={ProfileSelectPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="HomeScreen" 
          component={HomeScreen}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="CreatePage" 
          component={CreatePage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="SettingsActivityPage" 
          component={SettingsActivityPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="SearchPage" 
          component={SearchPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="UserProfilePage" 
          component={UserProfilePage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="ChatPage" 
          component={ChatPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 200 } },
              close: { animation: 'timing', config: { duration: 200 } },
            },
          }}
        />
        <Stack.Screen 
  name="ImageViewPage" 
  component={ImageViewPage}
  options={{
    headerShown: false,
    cardStyleInterpolator: ({ current, layouts }) => ({
      cardStyle: {
        opacity: current.progress,
      },
    }),
    transitionSpec: {
      open: TransitionSpecs.FadeInFromBottomAndroidSpec,
      close: TransitionSpecs.FadeOutToBottomAndroidSpec,
    },
  }}
/>

        <Stack.Screen 
  name="VideoPage" 
  component={VideoPage}
  options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
/>

        
        <Stack.Screen 
          name="PostViewPage" 
          component={PostViewPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        
        <Stack.Screen 
          name="DarkModePage" 
          component={DarkModePage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen 
          name="VerifyPage" 
          component={VerifyPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen
          name="MessageViewPage"
          component={MessageViewPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
        <Stack.Screen
          name="ShowReactPage"
          component={ShowReactPage}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forBottomSheetAndroid,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
         <Stack.Screen 
          name="AccountCenter" 
          component={AccountCenter}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
         <Stack.Screen 
          name="FriendsScreen" 
          component={FriendsScreen}
          options={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open: { animation: 'timing', config: { duration: 160 } },
              close: { animation: 'timing', config: { duration: 160 } },
            },
          }}
        />
         
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}