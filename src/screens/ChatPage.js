import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, RefreshControl, TouchableNativeFeedback, StatusBar, Platform, BackHandler, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { database } from '../components/firebaseConfig'; // Firebase config import
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function ChatPage({ navigation, route }) {
  const [refreshing, setRefreshing] = useState(false);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [users, setUsers] = useState(null); // Users list to store all fetched users 
  const [chats, setChats] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('light');
const [currentUserEmail, setCurrentUserEmail] = useState(null);




  const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours}:${formattedMinutes} ${ampm}`;
};
useEffect(() => {
    const getCurrentUserEmail = async () => {
      const email = await fetchCurrentUserEmail();
      setCurrentUserEmail(email);
    };

    getCurrentUserEmail();
  }, []);

const fetchChats = async () => {
    try {
      const email = await SecureStore.getItemAsync('user-email');
      if (!email) return;

      const formattedEmail = email.replace(/[@.]/g, ''); // Firebase ফরম্যাট অনুযায়ী ঠিক করা

      // Message_data এর জন্য real-time listener
      const chatRef = database.ref('Message_data');
      chatRef.on('value', (snapshot) => {
        const chatData = snapshot.val();
        if (chatData) {
          const userChats = Object.keys(chatData)
            .filter(chatKey => chatKey.includes(formattedEmail)) // শুধুমাত্র ব্যবহারকারীর চ্যাট ফিল্টার করা
            .map(chatKey => {
              const otherUserEmail = chatKey.replace(formattedEmail, '').replace('_', '');
              const messages = chatData[chatKey];
              const messageArray = Object.values(messages);
              const lastMessage = messageArray.length > 0 ? messageArray[messageArray.length - 1] : null;

              return { 
                chatId: chatKey, 
                messages, 
                otherUserEmail, 
                lastMessageTime: lastMessage ? new Date(lastMessage.timestamp).getTime() : 0 // Timestamp কনভার্ট
              };
            })
            .sort((a, b) => b.lastMessageTime - a.lastMessageTime); // টাইম অনুযায়ী sort করা

          

          setChats(userChats);
          setRefreshing(false); // Stop refreshing after data is fetched
        }
      });

      // UserAuthList এর জন্য real-time listener
      const userRef = database.ref('UserAuthList');
      userRef.on('value', (snapshot) => {
        setUsers(snapshot.val() || {});
      });

      // Cleanup listener when component unmounts
      return () => {
        chatRef.off();
        userRef.off();
      };
    } catch (error) {
      console.error('❌ Error fetching chats:', error);
      setRefreshing(false); // Stop refreshing if there's an error
    }
};

  useEffect(() => {
    fetchChats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChats(); // This will refresh the chat list by calling fetchChats again
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    setHeaderElevated(scrollPosition > 5); // Set header elevation based on scroll position
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const email = await SecureStore.getItemAsync('user-email');
        if (email) {
          // Fetch user details from Firebase based on email
          const snapshot = await database.ref('UserAuthList').once('value');
          const users = snapshot.val();
          const user = Object.values(users).find((user) => user.Email === email);
          if (user) {
            setUserData(user); // Save user data for current user
          }
        }

        // Fetch all users from Firebase
        const usersSnapshot = await database.ref('UserAuthList').once('value');
        const usersData = usersSnapshot.val();
        setUsers(usersData); // Save all users data
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

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

  const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#fff' : '#fff',
  };
  const dynamicBorderColor = {
    borderColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };
  const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };

  const renderUserItem = ({ item }) => {
    if (item.Email === userData?.Email) {
      return null; // Skip rendering this user if the email matches the current user's email
    }

    return (
      <TouchableOpacity
        style={styles.userBox}
        onPress={() =>
          navigation.navigate('MessageViewPage', {
            profilePicture: item.profilePicture
              ? item.profilePicture
              : '../assets/user.png',
            fullName: `${item.firstName} ${item.lastName}`, // পুরো নাম
            email: item.Email, // Gmail পাঠানো
          })
        }
      >
        <View style={styles.imageWrapper}>
          <Image
            source={item.profilePicture ? { uri: item.profilePicture } : require('../assets/user.png')}
            style={[styles.userImg, offWhiteColor]}
          />
          <View style={[styles.onlineStatus, dynamicBorderColor]} />
        </View>
        <Text style={[styles.usernameText, dynamicTextColor]}>{item.firstName}</Text>
      </TouchableOpacity>
    );
  };

  // currentUserEmail ফেচ করার জন্য আলাদা ফাংশন
const fetchCurrentUserEmail = async () => {
  try {
    const currentUserEmail = await SecureStore.getItemAsync('user-email');
    return currentUserEmail;
  } catch (error) {
    console.error('Error fetching current user email:', error);
    return null;
  }
};

// renderChatItem ফাংশন
const renderChatItem = ({ item, currentUserEmail }) => {
  const user = Object.values(users).find(u => u.Email.replace(/[@.]/g, '') === item.otherUserEmail);
  const lastMessage = Object.values(item.messages)[Object.values(item.messages).length - 1];
  const lastMessageTime = lastMessage ? formatTime(lastMessage.timestamp) : 'No messages';

  const isSender = lastMessage?.senderEmail === currentUserEmail; // যদি Sender হয়
  const isReceiver = lastMessage?.receiverEmail === currentUserEmail; // যদি Receiver হয়
  const isMessageSeen = lastMessage?.status === 'seen';

  // যদি প্রাপক হয় এবং মেসেজ দেখা না হয়ে থাকে তাহলে bold, অন্যথায় normal
  const fontWeight = isReceiver && !isMessageSeen ? 'bold' : 'normal';

  // যদি **sender** হয় তাহলে textColor = gray, অন্যথায় আগের মতো
  const textColor = isSender ? 'gray' : isMessageSeen ? 'gray' : '#000';

  // Prefix নির্ধারণ (You বা He)
  const messagePrefix = isSender ? 'You: ' : 'He: ';

  return (
    <TouchableNativeFeedback
      onPress={() =>
        navigation.navigate('MessageViewPage', {
          profilePicture: user?.profilePicture || '../assets/user.png',
          fullName: `${user?.firstName} ${user?.lastName}`,
          email: user?.Email,
        })
      }
      background={Platform.OS === 'android' ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false) : undefined}
    >
      <View style={styles.userChatList}>
        <Image
          source={user?.profilePicture ? { uri: user.profilePicture } : require('../assets/user.png')}
          style={styles.userChatProfile}
        />
        <View style={styles.chatListContent}>
          <Text style={[styles.chatListUserName, dynamicTextColor, { color: '#000', fontWeight }]}>
            {user ? `${user.firstName} ${user.lastName}` : item.otherUserEmail}
          </Text>
          <View style={styles.listFlex}>
            <Text 
              style={[styles.chatListChatContent, { color: textColor, fontWeight }]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {messagePrefix}{lastMessage?.message || 'No messages'}
            </Text>
            <Text style={[styles.spanText, { color: textColor, fontWeight }]}>.</Text>
            <Text style={[styles.listTime, { color: textColor, fontWeight }]}>{lastMessageTime}</Text>
          </View>
        </View>
      </View>
    </TouchableNativeFeedback>
  );
};





  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header Section */}
      <View style={[styles.header, containerStyle, headerElevated ? styles.headerElevated : null]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={26} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>
          {userData ? userData.firstName + ' ' + userData.lastName : 'Loading...'}
        </Text>
        <TouchableOpacity style={styles.headerMenu}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="list-outline" size={30} color="black" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <FlatList
        data={[]} // Empty data to render only once
        renderItem={null} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
        ListHeaderComponent={
          <>
            <View style={[styles.searchBox, offWhiteColor]}>
              <Text style={[styles.searchText, dynamicTextColor]}>Search</Text>
            </View>

            {/* Horizontal Scrollable Users */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={users ? Object.values(users) : []}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.Email}
              ListEmptyComponent={
                <View style={styles.loadingUserBox}>
                  <View style={[styles.loadingUser, offWhiteColor]}></View>
                  <View style={[styles.loadingUser, offWhiteColor]}></View>
                  <View style={[styles.loadingUser, offWhiteColor]}></View>
                  <View style={[styles.loadingUser, offWhiteColor]}></View>
                </View>
              }
            />
          </>
        }
        ListFooterComponent={
          <FlatList
            data={chats}
            renderItem={({ item }) => renderChatItem({ item, currentUserEmail })}
      keyExtractor={(item) => item.chatId}
            ListEmptyComponent={
              <View style={styles.loadingChatListContainer}>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
         <View style={styles.loadingChatUserBox}>
           <View style={[styles.loadingProfile, offWhiteColor]}></View>
           <View style={styles.loadingChatBarBox}>
             <View style={[styles.loadingChatbar1, offWhiteColor]}></View>
           <View style={[styles.loadingChatbar2, offWhiteColor]}></View>
           </View>
         </View>
       </View>
            }
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16} // Smooth scrolling
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    height: '100%',
    width: '100%',
  },
  header: {
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    elevation: 0,
    shadowColor: 'transparent',
    zIndex: 1,
  },
  headerElevated: {
    elevation: 3, // elevated style
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  backButton: {
    padding: 4,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerMenu:{
    marginLeft: 'auto',
    padding: 2,
  },
  mainContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  searchBox: {
    width: '90%',
    marginLeft: '5%',
    backgroundColor: '#efefef',
    padding: 10,
    marginTop: 15,
    marginBottom: 30,
    borderRadius: 5,
  },
  userImg: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#efefef',
  },
  usernameTextYou:{
    textAlign: 'center',
    marginTop: 5,
    color: '#808080',
  },
  usernameText: {
    textAlign: 'center',
    marginTop: 5,
    
  },
  userBox: {
    padding: 10,
    marginRight: 2,
    maxWidth: 100,
  },
  scrollContainer: {
    marginTop: 20,
    paddingLeft: 5,
  },
  imageWrapper: {
    position: 'relative',
    width: 70,
    height: 70,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  onlineStatus: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: '#4caf50',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
    bottom: 2,
    right: 2,
  },
  chatListContainer:{
    width: '100%',
  },
  userChatList:{
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 8,
  },
  userChatProfile:{
    width: 55,
    height: 55,
    borderRadius: 50,
    backgroundColor: '#efefef',
  },
  chatListUserName:{
    fontSize: 17,
  },
  chatListChatContent:{
    fontSize: 14,
    color: '#808080',
    
  },
  chatContentAndTimeBox:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot:{
    marginTop: -5,
    color: '#808080',
    
  },
  chatTime:{
    color: '#808080',
  },
  newChatAvailable:{
    marginLeft: 'auto',
  },
  newChatDot:{
    backgroundColor: 'blue',
    padding: 4,
    borderRadius: 50,
  },
  loadingUser:{
    backgroundColor: '#efefef',
    height: 70,
    width: 70,
    borderRadius: 50,
  },
  loadingUserBox:{
    flexDirection: 'row',
    padding: 10,
    gap: 20,
  },
  loadingChatListContainer:{
    width: '100%',
    padding: 10,
  },
  loadingProfile:{
    backgroundColor: '#efefef',
    height: 60,
    width: 60,
    borderRadius: 50,
  },
  loadingChatBarBox:{
    width: '100%',
    marginLeft: 10,
  },
  loadingChatbar1:{
    width: '40%',
    backgroundColor: '#efefef',
    height: 12,
    borderRadius: 10,
  },
  loadingChatbar2: {
    width: '30%',
    backgroundColor: '#efefef',
    height: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  loadingChatUserBox:{
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  chatListContent:{
    width: '60%',
  },
  listFlex:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  spanText:{
    marginTop: -5,
    color: 'gray',
  },
  listTime:{
    color: 'gray',
  }
});