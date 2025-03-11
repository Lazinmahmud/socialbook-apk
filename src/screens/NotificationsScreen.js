import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, TouchableNativeFeedback, Platform, RefreshControl, BackHandler, ActivityIndicator, Alert, StatusBar, Dimensions } from 'react-native'; 
import { TabView, SceneMap, TabBar, } from 'react-native-tab-view';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../components/firebaseConfig';
import AntDesign from '@expo/vector-icons/AntDesign';
import { formatDistanceToNow } from 'date-fns';
import * as SecureStore from 'expo-secure-store';

export default function NotificationsScreen( route ) {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [elevation, setElevation] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [newNotification, setNewNotification] = useState(false); // নতুন নোটিফিকেশন স্টেট
  const elevationRef = useRef(0);
  const [headerElevated, setHeaderElevated] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [notificationCount, setNotificationCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [oldNotifications, setOldNotifications] = useState([]);
  
  const [routes] = useState([
    { key: 'newNotifi', title: 'Newest' },
    { key: 'oldNotifi', title: 'Oldest' },
  ]);
  
  const renderTabBar = (props) => (
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: currentTheme === 'dark' ? '#fff' : '#000' }} // Active Tab Indicator
    style={[styles.tabbar, { backgroundColor: 'transparent' }]} // Tabbar BG Transparent
    activeColor={currentTheme === 'dark' ? '#fff' : '#000'} // Active Tab Text Color
    inactiveColor={currentTheme === 'dark' ? '#bbb' : 'gray'} // Inactive Tab Text Color
  />
);
  
  const NotificationItem = ({ item }) => {
  const handleMenuPress = () => {
    // এলার্ট শো করা
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(item), // ডিলিট ফাংশন কল করা
        },
      ],
      { cancelable: true }
    );
  };

  // ডিলিট ফাংশন
  const handleDelete = async (item) => {
    try {
      // Firebase থেকে নোটিফিকেশন ডিলিট করা
      const notificationRef = database.ref(`All_Post/${item.postId}/notifications/${item.timestamp}`);
      await notificationRef.remove(); // নোটিফিকেশন মুছে ফেলা

      // যদি আপনি স্টেটের মধ্যে থেকে এই আইটেম মুছতে চান, তবে এখানে `setNotifications` ব্যবহার করুন:
      // setNotifications(prevNotifications => prevNotifications.filter(notification => notification.timestamp !== item.timestamp));

      console.log("Notification deleted successfully");
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return (
    <TouchableNativeFeedback
      background={
        Platform.OS === 'android'
          ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false)
          : undefined
      }
      onPress={() => handleNotificationPress(item)}
    >
      <View
  style={[
    styles.notifiBox,
    item.seenStatus
      ? { backgroundColor: 'transparent' } // Seen হলে transparent হবে
      : { backgroundColor: currentTheme === 'dark' ? '#24303C' : '#E3F2FD' }, // Dark বা Light Mode অনুযায়ী কালার সেট হবে
  ]}
>
        <View style={styles.profilebox}>
          <Image source={{ uri: item.profileImage }} style={styles.notifyUserProfile} />
          {item.commentText ? (
            <Ionicons style={styles.commentIcon} name="chatbubble" />
          ) : (
            <AntDesign name="like1" style={styles.likeIcon} />
          )}
        </View>
        <View style={styles.notifiContentBox}>
          <Text style={[styles.notifyTextContent, dynamicTextColor]}>
            <Text style={[styles.nameText, dynamicTextColor]}>{item.commentedBy || item.likedBy}{' '}</Text>
            {item.commentText ? 'commented on your post' : 'liked your post'}
          </Text>
          {/* এক লাইনে `postText` দেখাবে */}
          {item.postText && (
            <Text 
              style={[styles.postText, dynamicTextColor]} 
              numberOfLines={1} 
              ellipsizeMode="tail"
            >
              {`"${item.postText}"`}
            </Text>
          )}
          <View style={styles.notifyTimeAndReactionBox}>
            <Text style={styles.notifyTime}>
              {new Date().getTime() - new Date(item.timestamp).getTime() <= 60000
                ? 'Just now'
                : formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }).replace('about ', '')
              }
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.reactionText}>{item.reactionText}</Text>
          </View>
        </View>
        {item.postImage && <Image source={{ uri: item.postImage }} style={styles.notifiImg} />}
        <TouchableOpacity style={styles.menuIcon} onPress={handleMenuPress}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="ellipsis-horizontal" size={18} />
        </TouchableOpacity>
      </View>
    </TouchableNativeFeedback>
  );
};
  
  
const NewNotifiRoute = () => (
  <FlatList
    data={notifications} // ২৪ ঘণ্টার মধ্যে আসা নতুন নোটিফিকেশন
    keyExtractor={(item, index) => index.toString()}
    showsVerticalScrollIndicator={false}
    renderItem={({ item }) => <NotificationItem item={item} />}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    } // Pull to refresh ফিচার
  />
);

const OldNotifiRoute = () => (
  <FlatList
    data={oldNotifications} // lifetime এর পুরানো নোটিফিকেশন
    keyExtractor={(item, index) => index.toString()}
    showsVerticalScrollIndicator={false}
    renderItem={({ item }) => <NotificationItem item={item} />}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    } // Pull to refresh ফিচার
  />
);

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
  
  
  
  
  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.y;
    setHeaderElevated(scrollPosition > 5); // Set header elevation based on scroll position
  };

  // SecureStore থেকে ইমেইল লোড করা
  useEffect(() => {
    const fetchEmail = async () => {
      const email = await SecureStore.getItemAsync('user-email');
      if (email) {
        setUserEmail(email);
      }
    };
    fetchEmail();
  }, []);

// রিফ্রেশ হ্যান্ডলার
const onRefresh = async () => {
  setRefreshing(true);
  await fetchNotifications(); // নতুন নোটিফিকেশন লোড করবে
  setRefreshing(false);
};

// Firebase থেকে নোটিফিকেশন লোড করা এবং ফিল্টার করা
const fetchNotifications = async () => {
  try {
    const notificationsRef = database.ref('All_Post');
    const userAuthRef = database.ref('UserAuthList');

    notificationsRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const newNotifiArray = [];
        const oldNotifiArray = [];
        const userProfiles = {};
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 1 দিন আগের টাইমস্ট্যাম্প

        userAuthRef.once('value', (userSnapshot) => {
          if (userSnapshot.exists()) {
            const users = userSnapshot.val();
            Object.keys(users).forEach((userId) => {
              const user = users[userId];
              if (user.Email) {
                userProfiles[user.Email] = user.profilePicture || 'https://via.placeholder.com/150';
              }
            });
          }

          Object.keys(data).forEach((postId) => {
            if (data[postId].account === userEmail && data[postId].notifications) {
              Object.values(data[postId].notifications).forEach((notif) => {
                const senderProfilePicture = userProfiles[notif.senderEmail] || 'https://via.placeholder.com/150';

                let postText = data[postId].postText ? data[postId].postText.trim() : "";
                let postImage = data[postId].postImage || null;

                let likeCount = data[postId].likedUsers ? Object.keys(data[postId].likedUsers).length : 0;
                let commentCount = data[postId].comments ? Object.keys(data[postId].comments).length : 0;

                const shortenText = (text, wordLimit, charLimit) => {
                  if (!text) return "";
                  const words = text.split(" ");
                  const processedWords = words.map(word =>
                    word.length > charLimit ? word.substring(0, charLimit) + "..." : word
                  );
                  return processedWords.length > wordLimit 
                    ? processedWords.slice(0, wordLimit).join(" ") + "..." 
                    : processedWords.join(" ");
                };

                const shortPostText = shortenText(postText, 8, 15);

                let reactionText = '';
                const formatCountText = (count, singular, plural) => {
                  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
                };

                if (likeCount > 0 && commentCount > 0) {
                  reactionText = `${formatCountText(likeCount, 'Reaction', 'Reactions')} • ${formatCountText(commentCount, 'Comment', 'Comments')}`;
                } else if (likeCount > 0) {
                  reactionText = formatCountText(likeCount, 'Reaction', 'Reactions');
                } else if (commentCount > 0) {
                  reactionText = formatCountText(commentCount, 'Comment', 'Comments');
                } else {
                  reactionText = 'No Reactions';
                }

                // **নতুন নোটিফিকেশন অবজেক্ট তৈরি করা**
                const notificationItem = {
                  ...notif,
                  postId,
                  postText: shortPostText,
                  postImage: postImage,
                  profileImage: senderProfilePicture,
                  reactionText,
                  message: postText 
                    ? `recently liked your post: "${shortPostText}"` 
                    : `recently liked your post.`,
                };

                // **24 ঘণ্টার বেশি পুরানো নোটিফিকেশন `oldNotifiArray` তে রাখবো**
                if (notif.timestamp < oneDayAgo) {
                  oldNotifiArray.push(notificationItem);
                } else {
                  newNotifiArray.push(notificationItem);
                }
              });
            }
          });

          // নতুন নোটিফিকেশন প্রথমে রাখবো
          setNotifications(newNotifiArray.sort((a, b) => b.timestamp - a.timestamp));
          setOldNotifications(oldNotifiArray.sort((a, b) => b.timestamp - a.timestamp));
          setLoading(false);

          if (newNotifiArray.length > 0) {
            setNewNotification(true);
          } else {
            setNewNotification(false);
          }
        });
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    setLoading(false);
  }
};


const handleNotificationPress = async (item) => {
  try {
    const notificationRef = database.ref(`All_Post/${item.postId}/notifications/${item.timestamp}`);

    // `seenStatus: true` আপডেট করুন
    await notificationRef.update({ seenStatus: true });

    // লোকাল `notifications` স্টেট আপডেট করুন
    setNotifications((prevNotifications) =>
      prevNotifications.map((notif) =>
        notif.postId === item.postId && notif.timestamp === item.timestamp
          ? { ...notif, seenStatus: true }
          : notif
      )
    );

    // পোস্ট পেজে নেভিগেট করুন
    navigation.navigate('PostViewPage', {
      postId: item.postId,
      postText: item.postText,
      postImage: item.postImage,
      profileImage: item.profileImage,
      userName: item.commentedBy || item.likedBy, // কমেন্ট বা লাইক করা ইউজারের নাম
      timestamp: item.timestamp,
    });
  } catch (error) {
    console.error("Error updating seenStatus:", error);
  }
};


useEffect(() => {
  if (userEmail) {
    fetchNotifications();
  }
}, [userEmail]);



  // Back press হ্যান্ডলার
  useFocusEffect(
    React.useCallback(() => {
      const backAction = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          BackHandler.exitApp();
        }
        return true;
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => backHandler.remove();
    }, [navigation])
  );

  if (loading) {
    return <ActivityIndicator style={styles.lodingCircle} size="large" color="#000" />;
  }


const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };

const darkBgColor = {
    backgroundColor: currentTheme === 'dark' ? '#24303C' : '#E3F2FD',
  };

const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };
const mainContainerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#fff',
  };


  return (
  <View style={[styles.container, containerStyle]}>
    <View style={[styles.header, containerStyle, headerElevated ? styles.headerElevated : null]}>
      <Text style={[styles.headerText, dynamicTextColor]}>Notifications</Text>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}
      >
        <Ionicons style={[styles.searchIcon, dynamicTextColor]} name="search-outline" />
      </TouchableOpacity>
    </View>

    
    <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          newNotifi: NewNotifiRoute,
          oldNotifi: OldNotifiRoute,
        })}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={renderTabBar}
      />
  </View>
);
}





const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 1,
  },
  headerElevated:{
    elevation: 3, // elevated style
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  headerText: {
    fontSize: 23,
    fontFamily: 'Poppins_700Bold',
  },
  searchIcon: {
    fontSize: 32,
    color: '#000',
  },
  mainContainer: {
    flex: 1,
  },
  notifiBox: {
    width: '100%',
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifyUserProfile: {
    width: 60,
    height: 60,
    borderRadius: 50,
    marginRight: 10,
    borderColor: '#ccc',
    borderWidth: 0.8,
  },
  notifiContentBox: {
    flex: 1,
  },
  notifyTextContent: {
    color: '#333',
    fontSize: 16,
  },
  nameText: {
    fontWeight: 'bold',
  },
  notifyTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  dltBtn: {
    padding: 5,
  },
  dltIcon: {
    fontSize: 20,
    color: '#888',
  },
  likeIcon:{
    color: '#fff',
    position: 'absolute',
    backgroundColor: '#1876f2',
    borderRadius: 50,
    elevation: 2,
    bottom: -1,
    padding: 5,
    right: 8,
    fontSize: 18,
  },
  commentIcon:{
    color: '#fff',
    position: 'absolute',
    backgroundColor: '#40BB46',
    borderRadius: 50,
    elevation: 2,
    bottom: -1,
    padding: 5,
    right: 8,
    fontSize: 18,
  },
  profilebox:{
    position: 'relative',
  },
  lodingCircle:{
    marginTop: 'auto',
    marginBottom: 'auto',
    backgroundColor: '#fff',
    height: '100%',
    width: '100%',
  },
  notifyTimeAndReactionBox:{
    flexDirection: 'row',
    alignItems: 'center',
  },
  reactionText:{
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  dot:{
    fontSize: 12,
    color: '#888',
    marginTop: 5,
    marginLeft: 5,
    marginRight: 5,
  },
  notifiImg:{
    width: 45,
    height: 45,
    borderRadius: 5,
    backgroundColor: '#efefef',
  },
  noNotificationContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  emptyImg:{
    width: 100,
    height: 100,
  },
  unreadNotifi: {
    backgroundColor: '#E3F2FD',
  },
  tabbar:{
     marginTop: -10,
   },
   menuIcon:{
     marginLeft: 4,
     padding: 3,
   }
});