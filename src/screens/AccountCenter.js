import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StatusBar, StyleSheet, ScrollView, Modal, Pressable } from 'react-native';
import { database } from '../components/firebaseConfig';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const AccountCenter = ({ navigation, route }) => {
  
const [profilePic, setProfilePic] = useState(null);
const [email, setEmail] = useState('');
const [fullName, setFullName] = useState('');
const [gender, setGender] = useState('');
const [dateOfBirth, setDateOfBirth] = useState(''); 
const [modalVisible, setModalVisible] = useState(false);
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
            setGender(users[id].gender);  // Gender সেট করা
            setDateOfBirth(users[id].dateOfBirth); // Date of Birth সেট করা
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  fetchUserData();
}, []);

const formatDate = (dateString) => {
  if (!dateString) return ''; // যদি ডেটা না থাকে, তাহলে খালি রিটার্ন করবে
  const date = new Date(dateString);

  // বয়স বের করা
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();

  // যদি জন্ম মাস বা দিন এখনও না আসে, তাহলে বয়স ১ বছর কমাতে হবে
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return `${date.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  })} (${age} years old)`;
};

const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };
  
const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };

const cardStyle = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#fff',
  };
const appBorderColor = {
    borderColor: currentTheme === 'dark' ? '#333333' : '#fff',
  };


  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.headerContainer, containerStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={27} />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>Account Center</Text>
        {profilePic ? (
          <Image source={{ uri: profilePic }} style={styles.profileImage} />
        ) : (
          <Image source={require('../assets/user.png')} style={styles.profileImage} />
        )}
      </View>
      
      <ScrollView>
        <View style={[styles.accountCardContainer, cardStyle]}>
        <View style={styles.accountCard}>
          <View>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.profileImageCard} />
            ) : (
              <Image source={require('../assets/user.png')} style={styles.profileImageCard} />
            )}
            <Image source={require('../assets/appIcon.png')} style={[styles.logoImg, appBorderColor]} />
          </View>
         <View>
           <Text style={[styles.name, dynamicTextColor]}>{fullName}</Text>
           <Text style={styles.appNameText}>Socialbook</Text>
         </View>
         <Ionicons style={[styles.activeIcon]} name="checkmark-circle" size={23} color="green" />
        </View>
         <TouchableOpacity style={styles.addAcBtn}>
           <Text style={styles.addAcBtnText}>Add accounts</Text>
         </TouchableOpacity>
      </View>
      
      <View style={[styles.personalDetailsBox, cardStyle]}>
        <Text style={[styles.titleText, dynamicTextColor]}>Personal details</Text>
        
        <View style={styles.box}>
          <View>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Contact info</Text>
          <Text style={styles.contentText}>{email}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.box}>
  <View>
    <Text style={[styles.boxTitleText,dynamicTextColor]}>Birthday</Text>
  <Text style={styles.contentText}>{formatDate(dateOfBirth)}</Text>  
  </View>
  <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
</TouchableOpacity>
        
        <TouchableOpacity style={styles.box}>
          <View>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Gender</Text>
          <Text style={styles.contentText}>{gender}</Text>
          </View>
          <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
        </TouchableOpacity>
      </View>
      
      
      <View style={[styles.personalDetailsBox, cardStyle]}>
        <Text style={[styles.titleText, dynamicTextColor]}>Password and security</Text>
        
        <View style={styles.box}>
          <View>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Account</Text>
          <Text style={styles.contentText}>{email}</Text>
          </View>
        </View>
        
        <View style={styles.box}>
  <View>
    <Text style={[styles.boxTitleText,dynamicTextColor]}>Password</Text>
  <Text style={styles.contentText}>********</Text>  
  </View>
</View>

        <TouchableOpacity style={styles.box}>
  <View>
    <Text style={[styles.boxTitleText,dynamicTextColor]}>Change password</Text>
  <Text style={styles.contentText}>********</Text>  
  </View>
  <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
</TouchableOpacity>
      </View>
      
      
      <View style={[styles.personalDetailsBox, cardStyle]}>
        <Text style={[styles.titleText, dynamicTextColor]}>Security alert</Text>
        
        <TouchableOpacity style={styles.box}>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Saved login</Text>
          <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.box}>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Two-factor authentication</Text>
          <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.box}>
            <Text style={[styles.boxTitleText,dynamicTextColor]}>Login alert</Text>
          <Ionicons style={[styles.arrowIcon]} name="chevron-forward" size={23} color="#808080" />
        </TouchableOpacity>
        
      </View>
      
      <View style={[styles.deleteAcBox, cardStyle]}>
          <Text style={[styles.titleText, dynamicTextColor]}>Deactivation or deletion</Text>
          <TouchableOpacity style={styles.AcDltBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.dltBtnText}>Delete Account</Text>
            <Ionicons name="chevron-forward" size={23} color="#808080" />
          </TouchableOpacity>
        </View>
        <Modal
  animationType="slide"
  transparent={true}
  visible={modalVisible}
  onRequestClose={() => setModalVisible(false)}
>
  <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
    <View style={[styles.modalContainer, cardStyle]}>
      <Text style={[styles.modalTitle, dynamicTextColor]}>Delete Account</Text>
      <Text style={[styles.modalText, dynamicTextColor]}>
        Are you sure you want to delete your account? This action cannot be undone.
      </Text>
      <View style={styles.listContainer}>
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Please confirm that you are deleting your account. Once deleted, you will not be able to recover it in the future.
  </Text>
  
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Once you delete your account, it will be permanently removed from Socialbook. All data and posts associated with your account will also be deleted, and you will not be able to recover them in the future.
  </Text>
  
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Additionally, all photos, videos, writings, and messages you have shared with friends from this account will also be permanently deleted.
  </Text>
  
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Even though your account will be deleted, the messages you have sent to others will still remain in their inbox.
  </Text>
  
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Certain data may be retained on our servers for a limited time due to legal or security reasons, but it will not be publicly accessible.
  </Text>
  
  <Text style={styles.listText}>
    <Text style={styles.listItem}>• </Text>
    Once deleted, we cannot restore any data or content from your account, including photos, videos, and posts.
  </Text>
</View>

      <View style={styles.modalOptions}>
        <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setModalVisible(false)}>
          <Text style={styles.modalButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalButtonDelete} onPress={() => alert('Account Deleted!')}>
          <Text style={styles.modalButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Pressable>
</Modal>
      </ScrollView>
      
    </View>
  );
};

const styles = StyleSheet.create({
  container:{
    backgroundColor: '#fff',
    height: '100%',
    width: '100%',
  },
  headerContainer:{
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.4,
  },
  backBtn:{
    padding: 5,
  },
  headerText:{
    fontSize: 15,
  },
  profileImage:{
    width: 25,
    height: 25,
    borderRadius: 50,
  },
  accountCardContainer:{
    marginTop: 20,
    width: '90%',
    marginLeft: '5%',
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 15,
    backgroundColor: '#fff',
    elevation: 3,
  },
  profileImageCard:{
    width: 45,
    height: 45,
    borderRadius: 50,
    position: 'relative',
    backgroundColor: '#efefef',
  },
  accountCard:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeIcon:{
    marginLeft: 'auto',
  },
  addAcBtn:{
    marginTop: 20,
    borderColor: '#ccc',
    borderWidth: 0.5,
    padding: 10,
    borderRadius: 10,
  },
  addAcBtnText:{
    textAlign: 'center',
    color: '#1876f2',
  },
  name:{
    fontFamily: 'Roboto_400Regular',
    fontSize: 16,
  },
  appNameText: {
    color: 'gray',
    fontFamily: 'Roboto_400Regular',
  },
  logoImg:{
    width: 25,
    height: 25,
    borderRadius: 50,
    position: 'absolute',
    borderColor: '#fff',
    borderWidth: 3,
    right: -5,
    bottom: -5,
  },
  personalDetailsBox:{
    marginTop: 20,
    width: '90%',
    marginLeft: '5%',
    borderColor: '#ccc',
    backgroundColor: '#fff',
    elevation: 3,
    borderRadius: 10,
    padding: 15,
  },
  deleteAcBox:{
    marginTop: 20,
    marginBottom: 20,
    width: '90%',
    marginLeft: '5%',
    borderColor: '#ccc',
    backgroundColor: '#fff',
    elevation: 3,
    borderRadius: 10,
    padding: 15,
  },
  titleText:{
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: 20,
    fontFamily: 'Roboto_400Regular',
  },
  box:{
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  boxTitleText:{
    fontSize: 15,
    fontFamily: 'Roboto_400Regular',
  },
  contentText:{
    color: '#5C6C7B',
    marginTop: 3,
    fontFamily: 'Roboto_400Regular',
  },
  AcDltBtn:{
    padding: 10,
    borderColor: '#ccc',
    borderWidth: 0.5,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
   justifyContent: 'space-between',
  },
  dltBtnText:{
    color: 'red',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#fff',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  listContainer:{
    marginBottom: 40,
  },
  listText:{
    marginTop: 15,
  },
  listItem:{
    fontWeight: 'bold',
    fontSize: 17,
  },
  modalOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButtonCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#6c757d',
    marginRight: 10,
  },
  modalButtonDelete: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    backgroundColor: '#d9534f',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccountCenter;