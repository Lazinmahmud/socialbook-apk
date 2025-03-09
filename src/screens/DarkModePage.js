import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, FlatList, 
  useColorScheme, BackHandler, StatusBar 
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const DarkModePage = ({ navigation, route }) => {
  const [selectedOption, setSelectedOption] = useState('Off'); 
  const systemColorScheme = useColorScheme(); 
  const [currentTheme, setCurrentTheme] = useState(route.params?.currentTheme || 'light');

  const options = [
    { id: '1', label: 'On' },
    { id: '2', label: 'Off' },
    { id: '3', label: 'Use system settings' },
  ];

  const saveOptionToSecureStore = async (option) => {
    try {
      await SecureStore.setItemAsync('darkModeSetting', option);
    } catch (error) {
      console.error('Error saving option to Secure Store:', error);
    }
  };

  const loadOptionFromSecureStore = async () => {
    try {
      const storedOption = await SecureStore.getItemAsync('darkModeSetting');
      if (storedOption) {
        setSelectedOption(storedOption);
        setCurrentTheme(storedOption === 'On' ? 'dark' : storedOption === 'Off' ? 'light' : systemColorScheme);
      }
    } catch (error) {
      console.error('Error loading option from Secure Store:', error);
    }
  };

  const handleOptionPress = (option) => {
    setSelectedOption(option);
    saveOptionToSecureStore(option);
    const newTheme = option === 'On' ? 'dark' : option === 'Off' ? 'light' : systemColorScheme;
    setCurrentTheme(newTheme);
    navigation.setParams({ currentTheme: newTheme });

    // **StatusBar রিয়েল-টাইমে পরিবর্তন**
    StatusBar.setBarStyle(newTheme === 'dark' ? 'light-content' : 'dark-content');
  };

  useEffect(() => {
    loadOptionFromSecureStore();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    if (selectedOption === 'Use system settings') {
      setCurrentTheme(systemColorScheme);
      StatusBar.setBarStyle(systemColorScheme === 'dark' ? 'light-content' : 'dark-content');
    }
  }, [systemColorScheme]);

  useEffect(() => {
    // **থিম চেঞ্জ হলে StatusBar স্বয়ংক্রিয়ভাবে পরিবর্তন হবে**
    StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
  }, [currentTheme]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      backgroundColor: currentTheme === 'dark' ? '#262729' : '#ffffff',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      
      color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    },
    optionContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
    },
    optionText: {
      fontSize: 16,
      color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    },
    radioButtonOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: selectedOption === 'On' ? '#007AFF' : currentTheme === 'dark' ? '#ffffff' : '#000000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    radioButtonInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: '#007AFF',
    },
    infoText: {
      fontSize: 14,
      marginTop: 16,
      color: currentTheme === 'dark' ? '#ffffff' : '#000000',
    },
    headerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
},
backButton: {
  marginRight: 10,
  padding: 8,
  fontSize: 25,
},
  }), [currentTheme, selectedOption]);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
    <Ionicons name="arrow-back" size={26} color={currentTheme === 'dark' ? '#ffffff' : '#000000'} />
  </TouchableOpacity>
  <Text style={styles.header}>Dark mode</Text>
</View>
      <FlatList
        data={options}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.optionContainer} onPress={() => handleOptionPress(item.label)}>
            <Text style={styles.optionText}>{item.label}</Text>
            <View style={[styles.radioButtonOuter, selectedOption === item.label && { borderColor: '#007AFF' }]}>
              {selectedOption === item.label && <View style={styles.radioButtonInner} />}
            </View>
          </TouchableOpacity>
        )}
      />
      {selectedOption === 'Use system settings' && (
        <Text style={styles.infoText}>
          We'll adjust your appearance based on your device's system settings.
        </Text>
      )}
    </View>
  );
};

export default DarkModePage;