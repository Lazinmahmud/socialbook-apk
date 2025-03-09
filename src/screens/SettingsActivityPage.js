import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, ActivityIndicator, StatusBar, Alert, BackHandler, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';

export default function MenuPage({ navigation, route }) {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [loading, setLoading] = useState(false);

  // SecureStore থেকে ডার্ক মোড সেটিংস লোড করুন
  useEffect(() => {
    const loadDarkModeSetting = async () => {
      try {
        const darkModeSetting = await SecureStore.getItemAsync('darkModeSetting');
        if (darkModeSetting === 'On') {
          setCurrentTheme('dark');
        } else if (darkModeSetting === 'Off') {
          setCurrentTheme('light');
        } else {
          const systemColorScheme = useColorScheme(); // সিস্টেম থিম চেক করুন
          setCurrentTheme(systemColorScheme);
        }
      } catch (error) {
        console.error('Error loading dark mode setting:', error);
      }
    };

    loadDarkModeSetting();
  }, []);

  // DarkModePage থেকে থিম আপডেট করুন
  useEffect(() => {
    if (route?.params?.currentTheme) {
      setCurrentTheme(route.params.currentTheme);
    }
  }, [route?.params?.currentTheme]);

  // স্ট্যাটাস বারের কালার সেট করুন
  useEffect(() => {
    StatusBar.setBackgroundColor(currentTheme === 'dark' ? '#262729' : '#fff');
    StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
  }, [currentTheme]);
  
  
  const handleLogout = async () => {
    Alert.alert(
      "Logout?",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await SecureStore.deleteItemAsync('user-email');
              console.log("User logged out");

              setTimeout(() => {
                setLoading(false);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'LoginPage' }],
                });
              }, 1500);
            } catch (error) {
              setLoading(false);
              Alert.alert("Error", "There was an error logging out.");
            }
          } 
        },
      ]
    );
  };
  
  
  
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
  
  

  // ডাইনামিক কন্টেইনার স্টাইল
  const containerStyle = {
    flex: 1,
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };
const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };
const btnBackground = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#EAEAEA',
  };
  // ডাইনামিক সেকশন স্টাইল
  const sectionStyle = {
    borderBottomColor: currentTheme === 'dark' ? '#000' : '#efefef',
    borderBottomWidth: 8,
  };
  
  // ডাইনামিক হেডার স্টাইল
  const headerContainerStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
  };

  // ডাইনামিক টেক্সট কালার
  const textColor = currentTheme === 'dark' ? '#fff' : '#000';
  
  const searchBoxColor = currentTheme === 'dark' ? '#333333' : '#efefef';
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };

  return (
    <View style={containerStyle}>
      {/* স্ট্যাটাস বার */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Logging out...</Text>
        </View>
      )}
      <StatusBar backgroundColor={currentTheme === 'dark' ? '#262729' : '#fff'} barStyle={currentTheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={headerContainerStyle}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back-outline" size={24} color={textColor} />
  </TouchableOpacity>
  <Text style={[styles.header, { color: textColor }]}>Settings and activity</Text>
</View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollContainer}>
        {/* Search Box */}
        <View backgroundColor={searchBoxColor} style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="gray" style={styles.searchIcon} />
          <TextInput style={[styles.searchInput, { color: textColor }]} placeholder="Search" placeholderTextColor="gray" />
        </View>

        {/* Your Account Section */}
        <View style={[styles.section, sectionStyle]}>
          <TouchableOpacity style={styles.verifiSection} onPress={() => navigation.navigate('AccountCenter')}>
            <Ionicons style={[styles.accountIcon, dynamicTextColor]} name="person-circle-outline" size={25} />
          <Text style={[styles.labelText, dynamicTextColor]}>Accounts Center</Text>
      <Ionicons style={[styles.arrowIcon, dynamicTextColor]} name="chevron-forward" size={23} color="#808080" />
          </TouchableOpacity>
        </View>

        {/* How You Use SocialBook Section */}
        <Text style={[styles.sectionHeader, { color: textColor }]}>How you use SocialBook</Text>
        <View style={[styles.section, sectionStyle]}>
          <SettingsRow icon="bookmark-outline" title="Saved" textColor={textColor} />
          <SettingsRow icon="time-outline" title="Archive" textColor={textColor} />
          <SettingsRow icon="bar-chart-outline" title="Your activity" textColor={textColor} />
          <SettingsRow icon="notifications-outline" title="Notifications" textColor={textColor} />
          <SettingsRow icon="time-outline" title="Time management" textColor={textColor} />
        </View>

        {/* For Professionals Section */}
        <Text style={[styles.sectionHeader, { color: textColor }]}>For professionals</Text>
        <View style={[styles.section, sectionStyle]}>
          <SettingsRow icon="stats-chart-outline" title="Insights" textColor={textColor} />
          <SettingsRow icon="calendar-outline" title="Scheduled content" textColor={textColor} />
          
          <TouchableOpacity onPress={() => navigation.navigate('VerifyPage')}  style={styles.verifiSection}>
            <Image
        source={require('../assets/verified.png')} 
        style={{ width: 25, height: 25, marginRight: 5, }} 
      />
      <Text style={[styles.labelText, dynamicTextColor]}>Get socialbook verified</Text>
      <Ionicons style={[styles.arrowIcon, dynamicTextColor]} name="chevron-forward" size={23} color="#808080" />
          </TouchableOpacity>
        
        </View>
        <Text style={[styles.sectionHeader, { color: textColor }]}>Settings</Text>
        <View style={[styles.section, sectionStyle]}>
          
          <TouchableOpacity style={[styles.darkModeBtn, btnBackground ]} onPress={() => navigation.navigate('DarkModePage', { currentTheme })}>
            <Text style={[styles.none, dynamicTextColor]}>Dark mode</Text>
          </TouchableOpacity>
          
          
        </View> 
        
        <Text style={[styles.sectionHeader, { color: textColor }]}>Log Out</Text>
        <View style={[styles.section, sectionStyle]}>
          
          <TouchableOpacity onPress={handleLogout} style={[styles.lgButton, offWhiteColor]}>
          <Ionicons name="log-out-outline" style={styles.logOutIcon} color="red"/>
          <Text style={[styles.lgText, dynamicTextColor]}>Log out</Text>
        </TouchableOpacity>
          
          
        </View>
        
      </ScrollView>
    </View>
  );
}

// Reusable component for settings row
function SettingsRow({ icon, title, textColor }) {
  const [isActive, setIsActive] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.row, isActive && styles.activeRow]}
      onPressIn={() => setIsActive(true)}
      onPressOut={() => setIsActive(false)}
    >
      <Ionicons name={icon} size={24} color={textColor} />
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Ionicons name="chevron-forward-outline" size={24} color={textColor} style={styles.rightIcon} />
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  scrollContainer: {
    marginTop: 50,
    height: '100%',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    marginLeft: 14,
  },
  section: {
    borderBottomWidth: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'space-between',
  },
  activeRow: {
    backgroundColor: '#e0e0e0',
  },
  title: {
    fontSize: 14,
    marginLeft: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginTop: 20,
    height: 40,
    marginBottom: 20,
    width: '90%',
    marginLeft: '5%',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  rightIcon: {
    marginLeft: 'auto',
  },
  lgButton:{
    width: '90%',
    marginLeft: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 8,
    borderRadius: 5,
    gap: 5,
    elevation: 1,
  },
  logOutIcon:{
    fontSize: 18,
  },
  lgText:{
    fontSize: 15,
  },
  darkModeBtn:{
    width: '90%',
    marginLeft: '5%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efefef',
    elevation: 1,
    marginBottom: 20,
    padding: 15,
    borderRadius: 5,
    gap: 5,
  },
  loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    loadingText:{
      marginTop: 8,
      color: 'gray',
      fontSize: 14,
    },
    verifiSection:{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 13,
    },
    arrowIcon:{
      marginLeft: 'auto',
    },
    labelText:{
      marginLeft: 5,
    },
    accountIcon:{
      marginRight: 5,
    }
});