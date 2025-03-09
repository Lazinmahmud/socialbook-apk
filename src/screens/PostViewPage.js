import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, BackHandler, Pressable, StyleSheet, TextInput, RefreshControl, ActivityIndicator, Linking, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../components/firebaseConfig'; // Your Firebase configuration
import * as SecureStore from 'expo-secure-store';
import { ref, get, set, push, child, onValue, remove } from "firebase/database"; // Firebase methods
import AntDesign from '@expo/vector-icons/AntDesign';

const PostViewPage = ({ navigation, route }) => {
  const { postId, postText, postImage, profileImage, userName, timestamp } = route.params || {};
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);
  const [userData, setUserData] = useState({});
  const scrollViewRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const totalComments = comments.length;
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const inputRef = useRef(null); 
  const [likedUserNames, setLikedUserNames] = useState([]);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  
  
  const handleLinkPress = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url); // লিঙ্ক ওপেন
      } else {
        Alert.alert('Error', `Cannot open the link: ${url}`);
      }
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  const renderPostText = (text) => {
    const linkRegex = /(https?:\/\/[^\s]+)/g;
    const tagRegex = /#(\w+)/g;

    const tokens = text.split(/(https?:\/\/[^\s]+|#\w+)/g);

    return tokens.map((token, index) => {
      if (linkRegex.test(token)) {
        return (
          <TouchableOpacity key={index} onPress={() => handleLinkPress(token)}>
            <Text style={styles.linkText}>{token}</Text>
          </TouchableOpacity>
        );
      } else if (tagRegex.test(token)) {
        return (
          <Text key={index} style={styles.hashTagText}>
            {token}
          </Text>
        );
      } else {
        return <Text key={index}>{token}</Text>;
      }
    });
  };
  
  useEffect(() => {
    // TextInput-এ স্বয়ংক্রিয়ভাবে ফোকাস করার জন্য
    inputRef.current?.focus();
  }, []);
        
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Retrieve email from SecureStore
        const storedEmail = await SecureStore.getItemAsync('user-email');
        if (!storedEmail) {
          console.log('No email found in SecureStore');
          return;
        }

        // Fetch user data from Firebase
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, 'UserAuthList'));
        if (snapshot.exists()) {
          const users = snapshot.val();
          for (let userId in users) {
            if (users[userId].Email === storedEmail) {
              setUserData({
                firstName: users[userId].firstName,
                lastName: users[userId].lastName,
                profilePicture: users[userId].profilePicture,
              });
              break;
            }
          }
        } else {
          console.log('No user data found in Firebase');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);
  
 const fetchLikedUserNames = async () => {
  try {
    const postRef = ref(database, `All_Post/${postId}/likedUsers`);
    const snapshot = await get(postRef);

    if (snapshot.exists()) {
      const likedUsers = snapshot.val();
      const userNames = Object.values(likedUsers); // likedUsers এর সকল নাম সংগ্রহ
      setLikedUserNames(userNames); // State আপডেট

      // লাইক স্ট্যাটাস চেক করা
      const storedEmail = await SecureStore.getItemAsync('user-email');
      const encodedEmail = encodeEmail(storedEmail);
      setIsLiked(!!likedUsers[encodedEmail]); // যদি ইমেইল থাকে, তাহলে true
    } else {
      setLikedUserNames([]); // লাইক করা কেউ না থাকলে খালি অ্যারে
      setIsLiked(false); // কোনো লাইক না থাকলে false
    }
  } catch (error) {
    console.error('Error fetching liked user names:', error);
  }
};

  useEffect(() => {
  fetchLikedUserNames(); // পেজ লোড হওয়ার সাথে লাইক করা নামগুলো লোড করা
}, [totalLikes]); // যখন লাইক সংখ্যা পরিবর্তন হবে তখন রিফ্রেশ হবে

const toggleLike = async () => {
  try {
    const storedEmail = await SecureStore.getItemAsync('user-email');
    if (!storedEmail) return;

    const encodedEmail = encodeEmail(storedEmail);
    const postRef = ref(database, `All_Post/${postId}/likedUsers`);
    const snapshot = await get(postRef);

    let likedUsers = snapshot.exists() ? snapshot.val() : {};

    if (likedUsers[encodedEmail]) {
      // আনলাইক
      await remove(ref(database, `All_Post/${postId}/likedUsers/${encodedEmail}`));
      setIsLiked(false); // আনলাইক হলে false
    } else {
      // লাইক
      const userAuthRef = ref(database, `UserAuthList`);
      const userSnapshot = await get(userAuthRef);

      if (userSnapshot.exists()) {
        const users = userSnapshot.val();
        let userInfo = null;

        Object.values(users).forEach(user => {
          if (user.Email === storedEmail) {
            userInfo = {
              firstName: user.firstName,
              lastName: user.lastName,
            };
          }
        });

        if (userInfo) {
          likedUsers[encodedEmail] = `${userInfo.firstName} ${userInfo.lastName}`;
          await set(postRef, likedUsers);
          setIsLiked(true); // লাইক হলে true
        }
      }
    }

    // লাইক সংখ্যা আপডেট এবং নাম লোড করুন
    fetchLikedUserNames();
  } catch (error) {
    console.error('Error toggling like:', error);
  }
};

useEffect(() => {
  fetchLikedUserNames(); // পেজ লোড হওয়ার সাথে লাইক করা নামগুলো লোড করা
}, []);
const renderLikedUsers = () => {
  if (likedUserNames.length === 0) {
    return "No likes yet";
  } else if (likedUserNames.length === 1) {
    return likedUserNames[0];
  } else {
    // প্রথম নাম + বাকিদের সংখ্যা
    return `${likedUserNames[0]} + ${likedUserNames.length - 1}`;
  }
};

// ফাংশন: ইমেইল এনকোড (Firebase-friendly format)
const encodeEmail = (email) => {
  return email.replace(/\./g, ',');
};

// ফাংশন: ইমেইল ডিকোড (আসল ফর্ম্যাটে)
const decodeEmail = (encodedEmail) => {
  return encodedEmail.replace(/,/g, '.');
};

  const handleInputChange = (text) => {
    setComment(text);
  };
  
  const handleInputFocus = () => {
    if (inputRef.current) {
      inputRef.current.focus(); // ইনপুট ফিল্ডে ফোকাস করুন
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };
  

const handleCommentSubmit = async () => {
  if (comment.trim().length === 0) return;

  setIsLoading(true); // লোডিং শুরু

  try {
    const storedEmail = await SecureStore.getItemAsync('user-email');

    if (!storedEmail) {
      console.error("Error: storedEmail is undefined or null");
      setIsLoading(false);
      return;
    }

    const postCommentsRef = ref(database, `All_Post/${postId}/comments`);
    const newCommentRef = push(postCommentsRef);
    const timestamp = Date.now();

    await set(newCommentRef, {
      userName: `${userData.firstName} ${userData.lastName}`,
      commentText: comment,
      profileImg: userData.profilePicture,
      timestamp: timestamp,
    });

    const notificationsRef = ref(database, `All_Post/${postId}/notifications/${timestamp}`);

    await set(notificationsRef, {
      commentedBy: `${userData.firstName} ${userData.lastName}`,
      message: "commented on your post.",
      senderEmail: storedEmail,
      commentText: comment,
      timestamp: timestamp,
      userName: `${userData.firstName} ${userData.lastName}`
    });

    setComments([...comments, {
      userName: `${userData.firstName} ${userData.lastName}`,
      commentText: comment,
      profileImg: userData.profilePicture,
      timestamp: timestamp
    }]);

    setComment(''); // ইনপুট ফাঁকা করুন
    scrollViewRef.current.scrollToEnd({ animated: true }); // স্ক্রল টু এন্ড

  } catch (error) {
    console.error('Error submitting comment:', error);
  } finally {
    setIsLoading(false); // লোডিং শেষ হলে বন্ধ করুন
  }
};

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );
  
  const getTimeAgo = (timestamp) => {
  const now = new Date();
  const postDate = new Date(timestamp); // Assuming timestamp is in valid format
  const diffInSeconds = Math.floor((now - postDate) / 1000);

  if (diffInSeconds < 60) {
    return `Just now`; // Within 1 minute
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`; // Minutes
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`; // Hours
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`; // Days
  }
};

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const commentsRef = ref(database, `All_Post/${postId}/comments`);
        const snapshot = await get(commentsRef);

        if (snapshot.exists()) {
          const commentsData = snapshot.val();
          const loadedComments = Object.keys(commentsData).map(key => ({
            ...commentsData[key],
          }));
          setComments(loadedComments); // Update the state with the comments
        } else {
          console.log('No comments found for this post');
        }
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, [postId]);



const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#fff' : '#000',
  };

const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.header, containerStyle]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.backIcon, dynamicTextColor]} name="arrow-back-outline" size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerText, dynamicTextColor]}>{userName.split(' ')[0]}'s Post</Text>
        
        <TouchableOpacity onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}>
          <Ionicons style={[styles.searchIcon, dynamicTextColor]} name="search-outline"/>
        </TouchableOpacity>
        
        
      </View>
      <ScrollView ref={scrollViewRef} bounces={false} alwaysBounceVertical={false} overScrollMode="never"
       showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.postContainer, containerStyle]}>
          <View style={styles.postContainerHeader}>
            <View style={styles.headerContent}>
              <Image source={{ uri: profileImage }} style={styles.postProfileImg} />
              <View style={styles.postUserNameAndTime}>
                <Text style={[styles.nameText, dynamicTextColor]}>{userName}</Text>
                <View style={styles.publicBox}>
                  <Text style={styles.postTimeText}>{getTimeAgo(timestamp)}</Text>
                  <Text style={styles.dot}>.</Text>
                <Ionicons style={styles.publicIcon} name="earth" size={13} color="gray" />
                </View>
              </View>
            </View>
          </View>
          <View style={styles.postContent}>
                  {postText && <Text style={[styles.postText, dynamicTextColor]}>{renderPostText(postText)}</Text>}
                  {postImage && (
                    <Pressable 
                    style={styles.postImgBox}>
                      <Image source={{ uri: postImage }} style={styles.postImg} />
                    </Pressable>
                  )}
                  <View style={styles.reactCountContainer}>
  <TouchableOpacity 
  onPress={() => navigation.navigate('ShowReactPage', { postId })} 
  style={styles.reactUserNameBox}
>
  <AntDesign name="like1" style={styles.likeRoundIcon}/>
  <Text style={styles.activityText}>
    {renderLikedUsers()}
  </Text>
</TouchableOpacity>
   <Text style={styles.activityText}>
            {totalComments} Comments
             </Text>
</View>
                  <View style={styles.postActivityContainer}>
     <TouchableOpacity style={styles.activityBtnLike} onPress={toggleLike}>
  <AntDesign 
    style={styles.likeIcon}
    name={isLiked ? 'like1' : 'like2'}
    size={26}
    color={isLiked ? '#1876f2' : 'gray'}
  />
  <Text style={styles.activityText}>Like</Text>
</TouchableOpacity>
                    <TouchableOpacity
                    onPress={handleInputFocus}
            style={styles.activityBtn}>
              <Ionicons name="chatbubble-outline" size={25} color="gray" />
              <Text style={styles.activityText}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.activityBtn}>
              <Ionicons name="paper-plane-outline" size={25} color="gray" />
              <Text style={styles.activityText}>Send</Text>
            </TouchableOpacity>
                  </View>
                </View>
        </View>

        {/* Comments Section */}
        <View style={[styles.commentContainer, containerStyle]}>
  <Text style={[styles.commentHeaderText, dynamicTextColor]}>All Comments</Text>
  {comments.map((commentItem, index) => (
    <View key={index} style={styles.userCommentContainer}>
      <Image
        source={commentItem.profileImg ? { uri: commentItem.profileImg } : require('../assets/user.png')} // Fallback image
        style={styles.commentProfile}
      />
      <View style={styles.commentActivityBox}>
        <View style={styles.commentReactBox}>
          <View style={[styles.commentContent, offWhiteColor]}>
        <View style={styles.nameAndTime}>
          <Text style={[styles.commentUserName, dynamicTextColor]}>{commentItem.userName}</Text>
          
        </View>
        <Text style={[styles.commentText, dynamicTextColor]}>{commentItem.commentText}</Text>
      </View>
      <TouchableOpacity style={styles.reactIcon}>
        <Ionicons name="heart-outline" size={20} color="gray" />
        <Text style={styles.reactCountText}>0</Text>
      </TouchableOpacity>
        </View>
      <View style={styles.likeComentTimeReplayBox}>
        <Text style={styles.spanText}>{getTimeAgo(commentItem.timestamp)}</Text>
        
        <Text style={styles.spanText}>Replay</Text>
      </View>
      </View>
    </View>
  ))}
</View>
      </ScrollView>
      <View style={[styles.commentInputBox, containerStyle]}>
        <TextInput
        ref={inputRef}
  style={[styles.commentInput, offWhiteColor, dynamicTextColor]}
  onChangeText={setComment}
  value={comment}
  placeholderTextColor="#888"
  placeholder="Type your comment..."
  onFocus={() => {
          scrollViewRef?.current?.scrollToEnd({ animated: true });
        }}
/>
        <TouchableOpacity
  disabled={comment.length === 0 || isLoading}
  onPress={handleCommentSubmit}
>
  {isLoading ? (
    <ActivityIndicator style={styles.loadingSpinner} size="small" color="black" />
  ) : (
    <Ionicons
      style={styles.sendIcon}
      name={comment.length > 0 ? "paper-plane" : "paper-plane-outline"}
      color={comment.length > 0 ? 'black' : 'gray'}
    />
  )}
</TouchableOpacity>
      </View>
    </View>
  );
};




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
    justifyContent: 'center',
    zIndex: 1,
    
  },
  backIcon:{
    fontSize: 30,
    padding: 3,
  },
  headerText:{
    fontSize: 17,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  postContainer:{
    width: '100%',
    backgroundColor: '#fff',
  },
  postContainerHeader:{
    width: '100%',
    padding: 10,
  },
  postProfileImg:{
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  headerContent:{
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  nameText:{
    fontSize: 16,
    fontWeight: 'bold',
  },
  postTimeText:{
    fontSize: 12,
    marginTop: 4,
    color: '#707781',
    
  },
  postContent:{
    width: '100%',
  },
  postText:{
    fontSize: 16,
    paddingHorizontal: 10,
    
  },
  postImgBox:{
    width: '100%',
    height: 400,
    marginTop: 10,
  },
  postImg:{
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
    gap: 4,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '33%',
  },
  activityBtnLike:{
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '33%',
  },
  activityText: {
    color: 'gray',
    fontSize: 14,
    
  },
  commentContainer:{
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
  },
  commentHeaderText:{
    fontSize: 16,
    marginBottom: 20,
    
  },
  userCommentContainer:{
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  commentProfile:{
    width: 40,
    height: 40,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  commentContent:{
    
    padding: 10,
    borderRadius: 18,
    
  },
  commentUserName:{
    fontWeight: 'bold',
    fontSize: 15,
  },
  commentText:{
    marginTop: 4,
    fontSize: 15,
    
  },
  commentInputBox:{
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 10,
    borderTopColor: '#ccc',
    borderTopWidth: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInput:{
    backgroundColor: '#F1F2F6',
    borderRadius: 20,
    padding: 10,
    width: '90%',
  },
  sendIcon:{
    fontSize: 30,
    padding: 5,
  },
  commentActivityBox:{
    maxWidth: '77%',
  },
  likeComentTimeReplayBox:{
    gap: 25,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    marginTop: 5,
  },
  spanText:{
    color: 'gray',
    fontSize: 12,
  },
  nameAndTime:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentReactBox:{
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  reactIcon:{
    marginLeft: 'auto',
    display: 'none',
  },
  reactCountText:{
    textAlign: 'center',
    fontSize: 14,
    color: 'gray',
  },
  searchIcon:{
    fontSize: 27,
  },
  reactCountContainer:{
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactUserNameBox:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  publicBox:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot:{
    color: 'gray',
    marginTop: -2,
  },
  publicIcon:{
    marginTop: 3.5,
  },
  likeRoundIcon:{
    backgroundColor: '#1876f2',
    color: '#fff',
    fontSize: 10,
    padding: 3,
    borderRadius: 50,
    marginRight: 2,
  },
  likeIcon:{
    marginTop: -5,
    marginRight: 3,
  },
  linkText: {
    color: '#1876f2',
    fontWeight: 'bold',
  },
  hashTagText: {
    color: '#1876f2',
    fontWeight: 'bold',
  },
  loadingSpinner:{
    marginLeft: 10,
  }
});


export default PostViewPage;