import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Pressable, BackHandler, FlatList, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../components/firebaseConfig';
import { format, formatDistanceToNow } from 'date-fns';
import { ref, query, orderByChild, equalTo, onValue, set, remove } from "firebase/database";
import { Video } from 'expo-av'; 
import AntDesign from '@expo/vector-icons/AntDesign';
import * as SecureStore from 'expo-secure-store';

const getTimeAgo = (timestamp) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const diffInDays = (now - postDate) / (1000 * 60 * 60 * 24);

  if (diffInDays > 6) {
    return format(postDate, 'MMM dd, yyyy');
  }
  const diffInSeconds = (now - postDate) / 1000;
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  return formatDistanceToNow(postDate, { addSuffix: true }).replace('about ', '');
};

export default function UserProfilePage({ navigation, route }) {
  const { account, email } = route.params; // account এবং email দুইটি গ্রহণ করা
  const userEmail = email || account; // email না থাকলে account ব্যবহার করা
  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isFollowing, setIsFollowing] = useState(false); // ফলো স্ট্যাটাস
  const [followId, setFollowId] = useState(null); // ফলো রিলেশনশিপের আইডি
  
  
  // Secure Store থেকে বর্তমান ইউজারের ইমেইল নিন
  const currentUserEmail = SecureStore.getItemAsync("user-email");

  // Firebase থেকে ফলো স্ট্যাটাস চেক করুন
  useEffect(() => {
  const checkFollowStatus = async () => {
    try {
      const senderEmail = await currentUserEmail;
      const followListRef = ref(database, "followList");
      
      // যদি email এবং account উভয় ক্ষেত্রেই ফলো স্ট্যাটাস চেক করতে চান
      const q = query(
        followListRef,
        orderByChild("following_sender"),
        equalTo(senderEmail)
      );

      onValue(q, (snapshot) => {
        if (snapshot.exists()) {
          const followData = snapshot.val();
          for (const key in followData) {
            // দুইটি প্যারামিটার মিলিয়ে চেক করা
            if (
              (followData[key].follow_receiver === email || followData[key].follow_receiver === account) &&
              followData[key].following_sender === senderEmail
            ) {
              setIsFollowing(true); // ফলো করা আছে
              setFollowId(key); // ফলো রিলেশনশিপের আইডি সংরক্ষণ করুন
              break;
            }
          }
        }
      });
    } catch (error) {
      console.error("Error checking follow status:", error);
    }
  };

  checkFollowStatus();
}, [email, account]); // email এবং account দুইটিই dependency হিসেবে দিন

  // ফলো/আনফলো ফাংশন
const handleFollow = async () => {
  try {
    const senderEmail = await currentUserEmail;
    const followListRef = ref(database, "followList");

    if (isFollowing) {
      // যদি ইতিমধ্যে ফলো করা থাকে, তাহলে আনফলো করুন
      await remove(ref(database, `followList/${followId}`));
      setIsFollowing(false);
      setFollowId(null);
      console.log("Unfollowed successfully!");
    } else {
      // যদি ফলো না করা থাকে, তাহলে ফলো করুন
      const newFollowId = new Date().getTime().toString();

      // email বা account এর ভ্যালু চেক করা
      const followReceiver = email || account;
      if (!followReceiver) {
        console.error("Error: email or account is undefined.");
        return;
      }

      await set(ref(database, `followList/${newFollowId}`), {
        following_sender: senderEmail,
        follow_receiver: followReceiver, // নিশ্চিত করুন যে এখানে একটি ভ্যালু আছে
        timestamp: new Date().toISOString(),
      });
      setIsFollowing(true);
      setFollowId(newFollowId);
      console.log("Followed successfully!");
    }
  } catch (error) {
    console.error("Error in follow/unfollow:", error);
  }
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
  
  
  
  
  useEffect(() => {
    // Firebase থেকে ইউজারের তথ্য লোড করা
    const fetchUserData = async () => {
      try {
        const snapshot = await database
          .ref('UserAuthList')
          .orderByChild('Email')
          .equalTo(userEmail) // email বা account ব্যবহার করা
          .once('value');

        if (snapshot.exists()) {
          const user = Object.values(snapshot.val())[0];
          setUserData(user);
        } else {
          console.log('No user found!');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    // Firebase থেকে নির্দিষ্ট userEmail-এর পোস্ট লোড করা
    const fetchUserPosts = async () => {
      try {
        const snapshot = await database
          .ref('All_Post')
          .orderByChild('account')
          .equalTo(userEmail) // email বা account ব্যবহার করা
          .once('value');

        if (snapshot.exists()) {
          const posts = Object.values(snapshot.val());

          // টাইম অনুযায়ী সাজানো (সর্বশেষ পোস্ট আগে)
          const sortedPosts = posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

          setUserPosts(sortedPosts); // সাজানো পোস্ট সেভ করা
        } else {
          console.log('No posts found!');
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      }
    };

    fetchUserData();
    fetchUserPosts();

    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [userEmail]); // userEmail এখানে dependency হিসেবে যোগ করা



  const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#65686D' : '#ccc',
  };
  const containerBackground = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
    
  };
  
  const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };
  
  const dynamicBorderColor = {
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
  
  const dynamicMsgBtnText = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };
  
  const dynamicMsgBtnBg = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#E2E5EA',
  };
  
  const dynamicFollowBtnText = {
    color: currentTheme === 'dark' ? '#000' : '#fff',
  };
  
  const dynamicFollowBtnBg = {
    backgroundColor: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };
const spanTextColor = {
    color: currentTheme === 'dark' ? '#B2B3B8' : 'gray',
    
  };
const storyBorderColor = {
    borderColor: currentTheme === 'dark' ? '#000' : '#ccc',
  };
  const profileBorderColor = {
    borderColor: currentTheme === 'dark' ? '#333333' : '#fff',
  };
const postImgBgColor = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#D0D9DE',
  };



  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const renderItem = ({ item }) => (
    <View key={item.postId} style={[styles.postContainer, containerStyle, dynamicBorderColor]}>
      <View style={styles.postContainerHeader}>
        <Image source={{ uri: item.profileImage }} style={styles.PostProfileImage} />
        <View style={styles.postNameAndPostTimeBox}>
          <View style={styles.postNameAndVerify}>
            <Text style={[styles.postUserNameText, dynamicTextColor]}>{item.userName} 
            <Image source={require('../assets/verified.png')} style={styles.verifyIcon} />
            {item.postType === 'profilePic' && (
    <Text style={[styles.updateText, spanTextColor, { color: 'gray', fontWeight: 'normal', fontSize: 15,}]}> Updated his profile picture.</Text>
  )}
            </Text>
            
          </View>
          <Text style={styles.postUploadTime}>{getTimeAgo(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.postContent}>
        {item.postText ? <Text style={[styles.postText, dynamicTextColor]}>{item.postText}</Text> : null}
        {item.postImage && (
  <Pressable
    onPress={() =>
      navigation.navigate('ImageViewPage', {
        imageUri: item.postImage, // ইমেজ ইউআরএল পাঠানো হচ্ছে
      })
    }
    style={[
      styles.postImageBox,
      storyBorderColor,
      item.postType === 'profilePic' && styles.profilePicPostImageBox,
    ]}
  >
    <Image
      source={{ uri: item.postImage }}
      style={[
        styles.postImg,
        postImgBgColor,
        
        item.postType === 'profilePic' && styles.profilePicPostImage,profileBorderColor,
      ]}
    />
  </Pressable>
)}
        {item.postVideo && (
          <View style={styles.postVideoBox}>
            <Video
              source={{ uri: item.postVideo }} // ভিডিও URL
              style={[styles.postVideo, dynamicBorderColor]}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          </View>
        )}
        <View style={styles.postActivityContainer}>
          <TouchableOpacity style={styles.activityBtn}>
            <AntDesign style={styles.likeIcon} name="like2" size={25} color="gray" />
            <Text style={styles.activityText}>Like</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activityBtn}>
            <Ionicons name="chatbubble-outline" size={23} color="gray" />
            <Text style={styles.activityText}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activityBtn}>
            <Ionicons name="paper-plane-outline" size={23} color="gray" />
            <Text style={styles.activityText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, containerBackground]}>
      <View style={[styles.header, containerStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none, dynamicTextColor]} name="arrow-back-outline" size={24} color="black" />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>{userData.firstName} {userData.lastName}</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}>
          <Ionicons style={[styles.searchIcon, dynamicTextColor]} name="search-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={userPosts}
        renderItem={renderItem}
        keyExtractor={(item) => item.postId}
        ListHeaderComponent={
          <View style={[styles.topRow, containerStyle, dynamicBorderColor]}>
            <View style={styles.topRowFlex}>
              <View style={styles.profileBoxContainer}>
                <Image source={{ uri: userData.profilePicture }} style={styles.profileImage} />
              </View>
              <View style={styles.postCountContainer}>
                <View style={styles.Counter}>
                  <Text style={[styles.postNumberCount, dynamicTextColor]}>{userPosts.length}</Text>
                  <Text style={[styles.labelText, dynamicTextColor]}>posts</Text>
                </View>
                <View style={styles.Counter}>
                  <Text style={[styles.postNumberCount, dynamicTextColor]}>0</Text>
                  <Text style={[styles.labelText, dynamicTextColor]}>followers</Text>
                </View>
                <View style={styles.Counter}>
                  <Text style={[styles.postNumberCount, dynamicTextColor]}>0</Text>
                  <Text style={[styles.labelText, dynamicTextColor]}>following</Text>
                </View>
              </View>
            </View>

            <View style={styles.nameBox}>
              <Text style={[styles.name, dynamicTextColor]}>{userData.firstName} {userData.lastName}</Text>
              <Image source={require('../assets/verified.png')} style={styles.verifyIcon} />
            </View>

            <View style={styles.bioBox}>
              <Text style={[styles.bioText, dynamicTextColor]}>{userData.bio}</Text>
            </View>

            <View style={styles.buttonBox}>
              <TouchableOpacity
        style={[styles.followButton, dynamicFollowBtnBg]}
        onPress={handleFollow}
      >
        <Ionicons
          style={[styles.followIcon, dynamicFollowBtnText]}
          name={isFollowing ? "checkmark" : "medkit"} // আইকন পরিবর্তন
        />
        <Text style={[styles.buttonTextFollow, dynamicFollowBtnText]}>
          {isFollowing ? "Following" : "Follow"}
        </Text>
      </TouchableOpacity>
              <TouchableOpacity
              onPress={() =>
    navigation.navigate('MessageViewPage', {
      profilePicture: userData.profilePicture
        ? userData.profilePicture
        : '../assets/user.png',
      fullName: `${userData.firstName} ${userData.lastName}`, // পুরো নাম
      email: userData.Email, // Gmail পাঠানো
    })
  }
              style={[styles.button, dynamicMsgBtnBg]}>
                <Ionicons style={[styles.chatIcon, dynamicMsgBtnText]} name="chatbubble-ellipses-outline" size={18} color="#000" />
                <Text style={[styles.buttonText, dynamicMsgBtnText]}>Message</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container:{
    width: '100%',
    height: '100%',
    backgroundColor: '#C9CCD1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    zIndex: 1,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.5,
  },
  headerText:{
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchIcon:{
    fontSize: 25,
  },
  topRow: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 8,
  },
  topRowFlex: {
    width: '100%',
    flexDirection: 'row',
  },
  profileBoxContainer: {
    padding: 10,
  },
  postCountContainer: {
    width: '70%',
    padding: 10,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 50,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  Counter: {
    width: 65,
    height: 50,
  },
  postNumberCount: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  labelText: {
    marginTop: 4,
    textAlign: 'center',
  },
  nameBox: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  bioBox: {
    width: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  buttonBox: {
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    width: '50%',
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    gap: 5,
  },
  chatIcon:{
    fontSize: 22,
  },
  followButton: {
    width: '50%',
    height: 34,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    gap: 7,
  },
  followIcon:{
    color: '#fff',
    fontSize: 15,
  },
  buttonText: {
    textAlign: 'center',
  },
  buttonTextFollow: {
    textAlign: 'center',
    color: '#fff',
  },
  postContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 5,
  },
  postContainerHeader: {
    width: '100%',
    paddingLeft: 10,
    paddingVertical: 10,
    flexDirection: 'row',
  },
  postNameAndPostTimeBox:{
    marginLeft: 10,
  },
  postContent:{
    marginTop: 5,
    width: '100%',
    flex: 1,
  },
  PostProfileImage:{
    height: 40,
    width: 40,
    borderRadius: 50,
  },
  verifyIcon:{
    height: 16,
    width: 16,
    marginLeft: 2,
  },
  postUserNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 3,
  },
  postUploadTime: {
    fontSize: 12,
    marginTop: 4,
    color: '#707781',
  },
  postText: {
    fontSize: 15,
    paddingBottom: 10,
    paddingHorizontal: 10,
  },
  postImageBox: {
    width: '100%',
    height: 452,
    borderTopColor: '#ccc',
    borderBottomColor: '#ccc',
    borderTopWidth: 0.8,
    borderBottomWidth: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postImg: {
    width: '100%',
    height: '100%',
    aspectRatio: 0.8,
    backgroundColor: '#D0D9DE',
  },
  postActivityContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    gap: 5,
  },
  activityBtn: {
   gap: 3,
   padding: 10,
   flexDirection: 'row',
   alignItems: 'center',
   justifyContent: 'center',
   width: '33%',
  },
  activityText: {
    color: 'gray',
    fontSize: 15,
  },
  storyContentImg: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  postMenu: {
    marginLeft: 'auto',
    padding: 4,
  },
  postTimeAndVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  publicIcon: {
    marginTop: 3,
    color: '#808080',
  },
  dotIcon: {
    marginTop: -4,
  },
  postNameAndDetailsWithMenu:{
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
  },
  postNameAndVerify:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#fff',
},
postVideoBox: {
    marginTop: 10,
    height: 500,
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000'
  },
  postVideo: {
    width: '100%',
    aspectRatio: 0.5,
    backgroundColor: '#000',
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.8,
    borderTopColor: '#ccc',
    borderTopWidth: 0.8,
    zIndex: 1,
  },
  likeIcon:{
    marginTop: -3,
  },
  profilePicPostImageBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 330,
    marginBottom: 20,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  profilePicPostImage: {
    width: 320,
    height: 320,
    borderRadius: 160,
    aspectRatio: 1,
    borderColor: '#fff',
    borderWidth: 5,
    elevation: 4,
  },
});