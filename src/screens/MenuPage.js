import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl , TouchableNativeFeedback, Platform, Animated, StatusBar, Pressable, FlatList, Linking, BackHandler } from 'react-native'; 
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import ParsedText from 'react-native-parsed-text';
import Toast from 'react-native-toast-message';
import { database } from '../components/firebaseConfig';
import { ref, query, orderByChild, equalTo, onValue } from "firebase/database";
import { Video } from 'expo-av'; 
import AntDesign from '@expo/vector-icons/AntDesign';

export default function ProfileScreen({ navigation, route }) {
  const [profilePicture, setProfilePicture] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [posts, setPosts] = useState([]);
  const [scales, setScales] = useState({});
const [currentUserEmail, setCurrentUserEmail] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const fadeAnim1 = useRef(new Animated.Value(1)).current; // প্রথম লোডিং পোস্টের opacity
  const fadeAnim2 = useRef(new Animated.Value(1)).current;
  const [currentTheme, setCurrentTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('All');
  const [followingCount, setFollowingCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  
  useEffect(() => {
    // Back press handle করার জন্য
    const backAction = () => {
      navigation.goBack(); // আগের স্ক্রীনে ফিরে যাব
      return true; // ইভেন্ট হ্যান্ডল করা হয়েছে
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Cleanup back handler on unmount
    return () => backHandler.remove();
  }, [navigation]);
  
  useEffect(() => {
    const fetchFollowCounts = async () => {
      try {
        const userEmail = await SecureStore.getItemAsync("user-email"); // ইউজারের ইমেইল নেওয়া

        if (userEmail) {
          // **Following Count Query (আমি কতজনকে ফলো করছি)**
          const followingRef = ref(database, "followList");
          const followingQuery = query(followingRef, orderByChild("following_sender"), equalTo(userEmail));

          onValue(followingQuery, (snapshot) => {
            if (snapshot.exists()) {
              setFollowingCount(Object.keys(snapshot.val()).length);
            } else {
              setFollowingCount(0);
            }
          });

          // **Followers Count Query (আমাকে কতজন ফলো করছে)**
          const followersRef = ref(database, "followList");
          const followersQuery = query(followersRef, orderByChild("follow_receiver"), equalTo(userEmail));

          onValue(followersQuery, (snapshot) => {
            if (snapshot.exists()) {
              setFollowersCount(Object.keys(snapshot.val()).length);
            } else {
              setFollowersCount(0);
            }
          });
        }
      } catch (error) {
        console.error("Error fetching follow counts:", error);
      }
    };

    fetchFollowCounts();
  }, []);
  
  
  
  
 const uniqueImages = posts
  .filter((post, index, self) => 
    post.postImage && self.findIndex(p => p.postImage === post.postImage) === index
  ); 
  
  
  const handleDeletePost = (postId) => {
  Alert.alert(
    'Delete Post',
    'Are you sure you want to delete this post?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'OK',
        onPress: async () => {
          try {
            await database.ref(`All_Post/${postId}`).remove(); // ✅ Firebase v8 এর সঠিক কোড
            console.log('Post deleted successfully');

            // ✅ Toast Message দেখাবে
            Toast.show({
              type: 'success',
              text1: 'Delete Successful',
              text2: 'Your post has been deleted successfully!',
              position: 'top',
            });

          } catch (error) {
            console.error('Error deleting post:', error);

            // ❌ যদি ডিলিট করতে সমস্যা হয়, তাহলে Toast দেখাবে
            Toast.show({
              type: 'error',
              text1: 'Delete Failed',
              text2: 'Something went wrong. Please try again.',
              position: 'top',
            });
          }
        },
      },
    ],
    { cancelable: true }
  );
};

  
  
  const handleUrlPress = (url) => {
  Linking.openURL(url).catch((err) => console.error('Error opening URL:', err));
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
  
  const renderPost = ({ item: post }) => (
    
    
    
    <View>
     

      {activeTab === 'All' && (
        <View style={[styles.postContainer, containerStyle]}>
      <View style={styles.postContainerHeader}>
        <Image source={{ uri: post.profileImage }} style={styles.profileImg} />
        <View style={styles.postNameAndPostTimeBox}>
          <Text style={[styles.postUserNameText, dynamicTextColor]}>
  {post.userName}
  <Image source={require('../assets/verified.png')} style={styles.verifyIcon} />
  {post.postType === 'profilePic' && (
    <Text style={[styles.updateText, spanTextColor, { color: 'gray', fontWeight: 'normal', fontSize: 15,}]}> Updated his profile picture.</Text>
  )}
</Text>
          <View style={styles.postTimeAndVisibility}>
            <Text style={[styles.postUploadTime, spanTextColor]}>
              {post.timestamp ? getRelativeTime(post.timestamp) : 'Unknown time'}
            </Text>
            <Text style={[styles.dotIcon, spanTextColor ]}>.</Text>
            <Ionicons style={[styles.publicIcon, spanTextColor ]} name="earth" size={13} />
          </View>
        </View>
        <View style={styles.postMenu}>
  <TouchableOpacity onPress={() => handleDeletePost(post.postId)}>
    <Ionicons style={[styles.menuIcon, spanTextColor]} name="ellipsis-vertical" size={23} color="#808080" />
  </TouchableOpacity>
</View>
      </View>
      <View style={styles.postContent}>
       {post.postText && (
    <ParsedText
      style={[styles.postText, dynamicTextColor]} // সাধারণ টেক্সট স্টাইল
      parse={[
        { pattern: /#(\w+)/, style: { color: '#1876f2' } }, // ✅ হ্যাশট্যাগ নীল হবে
        { type: 'url', style: { color: '#1876f2' }, onPress: handleUrlPress }, // ✅ লিংক নীল হবে এবং ক্লিক করলে ওপেন হবে
      ]}
      childrenProps={{ allowFontScaling: false }}
    >
      {post.postText}
    </ParsedText>
  )}
      {post.postImage && (
  <Pressable
    onPress={() =>
      navigation.navigate('ImageViewPage', {
        imageUri: post.postImage, // ইমেজ ইউআরএল পাঠানো হচ্ছে
      })
    }
    style={[
      styles.postImageBox,
      storyBorderColor,
      post.postType === 'profilePic' && styles.profilePicPostImageBox,
    ]}
  >
    <Image
      source={{ uri: post.postImage }}
      style={[
        styles.postImg,
        postImgBgColor,
        
        post.postType === 'profilePic' && styles.profilePicPostImage,profileBorderColor,
      ]}
    />
  </Pressable>
)}
        {post.postVideo && (
          <View style={styles.postVideoBox}>
            <Video
              source={{ uri: post.postVideo }}
              style={styles.postVideo}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          </View>
        )}
        <View style={styles.reactCountContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ShowReactPage', { postId: post.id })} style={styles.reactCountIcon}>
            <AntDesign name="like1" size={21} style={styles.likeRoundIcon} />
            <Text style={styles.activityText}>{getLikeCount(post.likedUsers)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.postActivityContainer}>
          <TouchableOpacity onPress={() => handleLike(post.postId)} style={styles.activityBtn}>
      <AntDesign
  style={[
    styles.likeIcon,
    post.likedUsers && currentUserEmail && post.likedUsers[currentUserEmail] 
      ? styles.reactRoundIcon // Apply reactRoundIcon style if liked
      : null // No additional style if not liked
  ]}
  name={
    post.likedUsers && currentUserEmail && post.likedUsers[currentUserEmail]
      ? 'like1' // If liked
      : 'like2' // If not liked
  }
  size={24}
  color={
    post.likedUsers && currentUserEmail && post.likedUsers[currentUserEmail]
      ? '#fff' // Liked color
      : 'gray' // Default color
  }
/>
      <Text
        style={[
          styles.activityText,
          spanTextColor,
          post.likedUsers && currentUserEmail && post.likedUsers[currentUserEmail]
            ? { color: '#1876f2' } // Liked: red color
            : { color: 'gray' } // Default: gray color
        ]}
      >
        Like
      </Text>
    </TouchableOpacity>
          <TouchableOpacity style={styles.activityBtn}>
            <Ionicons style={[styles.none, spanTextColor]} name="chatbubble-outline" size={25} color="gray" />
            <Text style={[styles.activityText, spanTextColor]}>Comment</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activityBtn}>
            <Ionicons style={[styles.none, spanTextColor]} name="paper-plane-outline" size={25} color="gray" />
            <Text style={[styles.activityText, spanTextColor]}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
      )}

      {activeTab === 'Photos' && (
  <View style={styles.galleryContainer}>
    <FlatList
  data={uniqueImages} // ডুপ্লিকেট ছাড়া লিস্ট
  keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
  numColumns={3}
  renderItem={({ item }) => (
    <Pressable
      onPress={() =>
        navigation.navigate('ImageViewPage', {
          imageUri: item.postImage,
        })
      }
      style={styles.gridImageContainer}
    >
      <Image source={{ uri: item.postImage }} style={styles.gridImage} />
    </Pressable>
  )}
/>
  </View>
)}
    </View>
  );
  
  
  
  

useEffect(() => {
    if (posts.length > 0) {
      setIsLoading(false); // পোস্ট লোড হলে লোডিং বন্ধ
    }
  }, [posts]);


useEffect(() => {
  // প্রথম পোস্টের অ্যানিমেশন
  const animatePost1 = Animated.loop(
    Animated.sequence([
      Animated.timing(fadeAnim1, {
        toValue: 0.4, // কম opacity
        duration: 400, // দ্রুত অ্যানিমেশন
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim1, {
        toValue: 1, // বেশি opacity
        duration: 400, // দ্রুত অ্যানিমেশন
        useNativeDriver: true,
      }),
    ])
  );

  // দ্বিতীয় পোস্টের অ্যানিমেশন (ডিলে সহ)
  const animatePost2 = Animated.loop(
    Animated.sequence([
      Animated.delay(200), // প্রথম পোস্টের পরে 200ms ডিলে
      Animated.timing(fadeAnim2, {
        toValue: 0.4, // কম opacity
        duration: 400, // দ্রুত অ্যানিমেশন
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim2, {
        toValue: 1, // বেশি opacity
        duration: 400, // দ্রুত অ্যানিমেশন
        useNativeDriver: true,
      }),
    ])
  );

  animatePost1.start();
  animatePost2.start();

  return () => {
    animatePost1.stop();
    animatePost2.stop();
  };
}, [fadeAnim1, fadeAnim2]);

const sanitizeEmailForFirebase = (email) => {
  return email.replace(/\./g, ',');
};

const getLikeCount = (likedUsers) => {
  return likedUsers ? Object.keys(likedUsers).length : 0;
};

useEffect(() => {
  const fetchUserEmail = async () => {
    const email = await SecureStore.getItemAsync('user-email');
    if (email) {
      setCurrentUserEmail(sanitizeEmailForFirebase(email));
    }
  };
  fetchUserEmail();
}, []);

const handleLike = async (postId) => {
    const email = await SecureStore.getItemAsync('user-email');
    if (!email) {
      alert('Please log in to like posts.');
      return;
    }

    const sanitizedEmail = sanitizeEmailForFirebase(email); // Sanitize the email

    try {
      const postRef = database.ref(`All_Post/${postId}/likedUsers/${sanitizedEmail}`);
      postRef.once('value', (snapshot) => {
        if (snapshot.exists()) {
          // Already liked: Unlike it
          postRef.remove();
        } else {
          // Not liked yet: Like it
          postRef.set(true);
        }
      });

      // Update local posts state to reflect the change in like status
      const updatedPosts = posts.map((post) => {
        if (post.postId === postId) {
          const updatedLikedUsers = post.likedUsers || {};
          if (updatedLikedUsers[sanitizedEmail]) {
            delete updatedLikedUsers[sanitizedEmail]; // Remove like if already liked
          } else {
            updatedLikedUsers[sanitizedEmail] = true; // Add like if not liked
          }
          return {
            ...post,
            likedUsers: updatedLikedUsers,
          };
        }
        return post;
      });
      setPosts(updatedPosts);

    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const email = await SecureStore.getItemAsync('user-email');
      if (!email) {
        Alert.alert('Error', 'No email found in local storage');
        return;
      }

      const snapshot = await database.ref('UserAuthList').once('value');
      const users = snapshot.val();
      let profilePicURL = null;

      for (let id in users) {
        if (users[id].Email === email) {
          profilePicURL = users[id].profilePicture;
          setFirstName(users[id].firstName || '');
          setLastName(users[id].lastName || '');
          setBio(users[id].bio || '');
          break;
        }
      }

      if (profilePicURL) {
        setProfilePicture(profilePicURL);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const onRefresh = async () => {
  setRefreshing(true);
  await fetchUserProfile();
  await fetchUserPosts();
  setRefreshing(false);
};
  
  

const fetchUserPosts = useCallback(async () => {
    try {
      const email = await SecureStore.getItemAsync('user-email');
      if (!email) {
        Alert.alert('Error', 'No email found in local storage');
        return;
      }

      const snapshot = await database.ref('All_Post').once('value');
      const allPosts = snapshot.val();
      const userPosts = [];

      for (let postId in allPosts) {
        if (allPosts[postId].account === email) {
          userPosts.push({
            ...allPosts[postId],
            postId,
            timestamp: allPosts[postId].timestamp || null, // Ensure timestamp exists
          });
        }
      }

      setPosts(userPosts.reverse()); // Latest posts first
    } catch (error) {
      console.error('Error fetching posts:', error);
      Alert.alert('Error', 'Failed to load posts');
    }
  }, []);



useEffect(() => {
  fetchUserPosts();
}, [fetchUserPosts]);

const getRelativeTime = (timestamp) => {
  const now = new Date();
  const postDate = new Date(timestamp);
  const difference = Math.floor((now - postDate) / 1000); // সময় পার্থক্য সেকেন্ডে

  if (difference < 60) {
    return 'Just now';
  } else if (difference < 3600) {
    const minutes = Math.floor(difference / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (difference < 86400) {
    const hours = Math.floor(difference / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (difference < 2592000) {
    const days = Math.floor(difference / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return postDate.toLocaleDateString(); // পুরনো তারিখ দেখানোর জন্য
  }
};

const getTimeAgo = (timestamp) => {
  if (!timestamp) {
    return "Unknown time";
  }
  const now = new Date();
  const postDate = new Date(timestamp);
  if (isNaN(postDate)) {
    return "Invalid time"; // টাইমস্ট্যাম্প ভ্যালিড না হলে
  }
  const seconds = Math.floor((now - postDate) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days < 30) {
    return `${days} days ago`;
  } else {
    const months = Math.floor(days / 30);
    return `${months} months ago`;
  }
};


const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };

const spanTextColor = {
    color: currentTheme === 'dark' ? '#B2B3B8' : 'gray',
};
const storyBorderColor = {
    borderColor: currentTheme === 'dark' ? '#000' : '#ccc',
  };

const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };
const mainContainerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
const postImgBgColor = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#D0D9DE',
  };
const profileBorderColor = {
    borderColor: currentTheme === 'dark' ? '#333333' : '#fff',
  };

  return (
    <View style={[styles.container, mainContainerStyle]}>
      <View style={[styles.headerContainer, containerStyle]}>
        
        <View style={styles.headerVerifyIcon}>
          <Text style={[styles.header, dynamicTextColor]}>{`${firstName} ${lastName}`}</Text>
          <Image source={require('../assets/verified.png')} style={styles.verifyIconHeader} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SettingsActivityPage')}>
          {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.navProfileImage} />
              ) : (
                
                  <Image source={require('../assets/user.png')} style={styles.navProfileImage} />
                
                
              )}
              <Ionicons style={[styles.menuIconHeader]} name="menu"/>
        </TouchableOpacity>
      </View>

      <FlatList
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      data={posts}
      keyExtractor={(item) => item.postId.toString()}
      renderItem={renderPost}
      ListHeaderComponent={() => (
        <>
          {/* Header Section */}
          <View style={[styles.topRow, containerStyle]}>
            <View style={styles.topRowFlex}>
              <View style={styles.profileBoxContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (profilePicture) {
                      navigation.navigate('ImageViewPage', {
                        imageUri: profilePicture,
                      });
                    } else {
                      Alert.alert('No Profile Picture', 'This user has not set a profile picture.');
                    }
                  }}
                >
                  {profilePicture ? (
                    <Image source={{ uri: profilePicture }} style={styles.profileImage} />
                  ) : (
                    <Image source={require('../assets/user.png')} style={styles.profileImage} />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.postCountContainer}>
                <View style={styles.Counter}>
                  <Text style={[styles.postNumberCount, dynamicTextColor]}>{posts.length}</Text>
                  <Text style={[styles.labelText, dynamicTextColor]}>posts</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('FriendsScreen')} style={styles.Counter}>
        <Text style={[styles.postNumberCount, dynamicTextColor]}>{followersCount}</Text>
        <Text style={[styles.labelText, dynamicTextColor]}>followers</Text>
      </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('FriendsScreen')} style={styles.Counter}>
        <Text style={[styles.postNumberCount, dynamicTextColor]}>{followingCount}</Text>
        <Text style={[styles.labelText, dynamicTextColor]}>following</Text>
      </TouchableOpacity>
              </View>
            </View>

            <View style={styles.nameBox}>
              <Text style={[styles.name, dynamicTextColor]}>{`${firstName} ${lastName}`}</Text>
              <Image source={require('../assets/verified.png')} style={styles.verifyIcon} />
            </View>

            <View style={styles.bioBox}>
              <Text style={[styles.bioText, dynamicTextColor]}>{bio}</Text>
            </View>

            <View style={styles.buttonBox}>
              <TouchableOpacity style={styles.AddStoryButton}>
                <Ionicons name="add-outline" color="#fff" size={20} />
                <Text style={styles.buttonTextStory}>Add to story</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('EditProfilePage')}
                style={styles.button}
              >
                <Ionicons name="pencil-outline" color="#000" size={20} style={styles.penIcon} />
                <Text style={styles.buttonText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
            
            
         
          </View>
          
          <View style={[styles.photoSwitchBox, containerStyle]}>
      <TouchableOpacity onPress={() => setActiveTab('All')}>
        <Text style={[styles.Switch, dynamicTextColor, activeTab === 'All' && styles.activeSwitch]}>All</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => setActiveTab('Photos')}>
        <Text style={[styles.Switch, dynamicTextColor, activeTab === 'Photos' && styles.activeSwitch]}>Photos</Text>
      </TouchableOpacity>
    </View>
        </>
      )}
      ListEmptyComponent={() => (
        <View style={styles.twoLoadingBox}>
          <View style={styles.loadingPostContainer}>
      {/* প্রথম লোডিং পোস্ট */}
      <View style={[styles.loadingPost, containerStyle]}>
        <View style={styles.loadingPostHeader}>
          <Animated.View style={[styles.loadingPostProfile, offWhiteColor, { opacity: fadeAnim1 }]} />
          <View style={styles.loadingBarContainer}>
            <Animated.View style={[styles.bar1, offWhiteColor, { opacity: fadeAnim1 }]} />
            <Animated.View style={[styles.bar2, offWhiteColor, { opacity: fadeAnim1 }]} />
            
            
          </View>
        </View>
        <Animated.View style={[styles.loadingImage, { opacity: fadeAnim1 }]} />
        <View style={styles.bottomBarContainer}>
              <Animated.View style={[styles.bBar, offWhiteColor, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, offWhiteColor, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, offWhiteColor, { opacity: fadeAnim1 }]} />
            </View>
      </View>

      
      
    </View>
        </View>
      )}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#C9CCD1',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    zIndex: 1,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.3,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  navProfileImage: {
    height: 30,
    width: 30,
    borderRadius: 50,
    backgroundColor: '#efefef',
    position: 'relative',
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
    gap: 3,
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
    backgroundColor: '#E2E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
  },
  AddStoryButton: {
    width: '50%',
    height: 34,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    gap: 5,
  },
  buttonText: {
    textAlign: 'center',
  },
  penIcon:{
    marginRight: 5,
  },
  buttonTextStory: {
    textAlign: 'center',
    color: '#fff',
    
  },
  postCreateContainer: {
    width: '100%',
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 8,
  },
  postHeaderText: {
    fontSize: 15,
    paddingTop: 10,
    paddingLeft: 10,
    
  },
  postCreateButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 50,
    borderColor: '#CCC',
    borderWidth: 1,
  },
  placeholderText: {
    fontSize: 16,
    marginLeft: 10,
  },
  galleryBtn: {
    marginLeft: 'auto',
    marginRight: 15,
  },
  galleryIcon: {
    fontSize: 25,
    color: '#00B056'
  },
  videoContainer: {
    marginTop: 5,
    padding: 10,
    borderBottomColor: '#ccc',
    borderTopColor: '#ccc',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    backgroundColor: '#F8F9FB',
  },
   videobtn: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     gap: 5,
     backgroundColor: '#fff',
     borderRadius: 25,
     width: 80,
     padding: 5,
     borderColor: '#ccc',
     borderWidth: 1,
   },
   videoIcon: {
     width: 22,
     height: 22,
   },
   
   postContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 5,
    
  },
  postContainerHeader: {
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    
    
  },
  postNameAndPostTimeBox:{
    marginLeft: 10,
  },
  postUserNameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  postProfileImage: {
    height: 40,
    width: 40,
    borderRadius: 50,
  },
  postUploadTime: {
    fontSize: 12,
    marginTop: 4,
    color: '#707781',
    
  },
  postText: {
    fontSize: 16,
    paddingBottom: 10,
    paddingHorizontal: 10,
    
  },
  postImageBox: {
    width: '100%',
    
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
  postContent:{
    marginTop: 5,
    width: '100%',
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
    fontSize: 14,
  },
  postMenu: {
    marginLeft: 'auto',
  },
  menuIcon: {
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
  
  reactCounterContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeReactCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 10,
  },
  likeCountNumberText: {
    color: '#808080',
    fontSize: 14,
  },
  availableText: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    color: '#626F75',
  },
  commentContainer: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  commentText: {
    textAlign: 'center',
    color: 'gray',
  },
  verifyIcon:{
    height: 16,
    width: 16,
  },
  verifyIconHeader:{
    height: 17,
    width: 17,
  },
  headerVerifyIcon:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  },
  loadingPost:{
    width: '100%',
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 7,
    paddingBottom: 15,
  },
  loadingPostHeader:{
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  loadingPostProfile:{
    backgroundColor: '#E5E5E5',
    height: 40,
    width: 40,
    borderRadius: 50,
  },
  bar1:{
    width: 120,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 5,
  },
  bar2:{
    width: 90,
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 5,
    marginTop: 10,
  },
  loadingBarContainer:{
    width: '80%',
  },
  loadingImage:{
    marginTop: 10,
    height: 180,
  },
  bottomBarContainer:{
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 10,
    gap: 15,
    paddingHorizontal: 30,
  },
  bBar:{
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    width: 60,
  },
  reactCountContainer:{
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactCountIcon:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  likeRoundIcon:{
    backgroundColor: '#1876f2',
    color: '#fff',
    fontSize: 10,
    padding: 3,
    borderRadius: 50,
    marginRight: 1,
  },
  reactIcon:{
    marginTop: -5,
    marginRight: 3,
  },
  photoSwitchBox:{
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 0.4,
    padding: 10,
    backgroundColor: '#fff',
  },
  Switch:{
    
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    fontSize: 15,
  },
  menuIconHeader:{
    position: 'absolute',
    backgroundColor: '#262729',
    bottom: -2,
    right: -2,
    padding: 2,
    color: '#fff',
    borderRadius: 50,
    borderColor: '#fff',
    borderWidth: 0.8,
  },
  activeSwitch: {
    backgroundColor: '#EBF5FF',
    color: '#1876f2',
  },
  galleryContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  gridImageContainer: {
    flex: 1,
    marginBottom: 1,
    marginRight: 1,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    aspectRatio: 0.9,
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
  reactRoundIcon:{
    backgroundColor: '#1876f2',
    padding: 4,
    borderRadius: 50,
    elevation: 1,
    fontSize: 15,
    marginTop: 0,
  },
});