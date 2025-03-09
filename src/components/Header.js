import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native'; // Navigation hook
import { Ionicons } from '@expo/vector-icons';

const Header = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.headerContainer}>
      <Text style={styles.logoText}>Socialbook</Text>
      <View style={styles.iconsContainer}>
        <TouchableOpacity 
        onPress={() => navigation.navigate('PostCreatePage')}
        >
          <Ionicons style={styles.createIcon} name="add-circle" color="#000"/>
        </TouchableOpacity>
        <TouchableOpacity
  onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}
>
  <Ionicons style={styles.searchIcon} name="search-outline"/>
</TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatPage')}>
          <Ionicons style={styles.chatIcon} name="chatbubble-ellipses" color="#000"/>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 7,
    backgroundColor: '#fff',
    borderBottomColor: '#ccc',
    zIndex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#D4D8D9',
  },
  logoText:{
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    width: '60%',
    color: '#000',
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 15,
    
  },
  searchIcon: {
    fontSize: 32,
  },
  chatIcon:{
    fontSize: 29,
  },
  createIcon:{
    fontSize: 30,
  },
});

export default Header;