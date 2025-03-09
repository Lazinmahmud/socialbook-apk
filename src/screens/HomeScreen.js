import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Share, Image, BackHandler, StyleSheet, TouchableOpacity, Pressable, ScrollView, RefreshControl, Animated, FlatList, ActivityIndicator, Dimensions, TouchableNativeFeedback, Platform, Alert, Linking, StatusBar, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Video, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Toast from "react-native-toast-message";
import { database } from '../components/firebaseConfig'; 
import { getDatabase, ref, onValue, set, query, orderByChild, equalTo, get, remove } from "firebase/database";
import { format, formatDistanceToNow } from 'date-fns';
import AntDesign from '@expo/vector-icons/AntDesign';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';


export default function HomeScreen({ route }) {
  const fadeAnim1 = useRef(new Animated.Value(1)).current; // প্রথম লোডিং পোস্টের opacity
  const scrollViewRef = useRef(null);
  const [shuffledUsers, setShuffledUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const navigation = useNavigation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [posts, setPosts] = useState([]);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scales, setScales] = useState({});
  const [sound, setSound] = useState();
 const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const videoRef = useRef(null);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const videoRefs = useRef({});
  const [hasPlayed, setHasPlayed] = useState({});
  const [currentTheme, setCurrentTheme] = useState('light');
  
  const appStatusRef = ref(database, "adminControl/appStatus");
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [followedUsers, setFollowedUsers] = useState({});
  const flatListRef = useRef(null);
  const [postButtonVisible, setPostButtonVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
        const fetchUnreadMessages = async () => {
            try {
                const email = await SecureStore.getItemAsync("user-email"); // লগইন করা ইউজারের ইমেইল
                if (!email) return;

                const db = getDatabase();
                const messagesRef = ref(db, "Message_data"); // মেসেজ ডাটাবেজ রেফারেন্স
                
                onValue(messagesRef, (snapshot) => {
                    let count = 0;
                    if (snapshot.exists()) {
                        const allChats = snapshot.val();
                        Object.values(allChats).forEach((chat) => {
                            Object.values(chat).forEach((msg) => {
                                if (msg.receiverEmail === email && msg.status === "sent") {
                                    count++;
                                }
                            });
                        });
                    }
                    setUnreadCount(count);
                });
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchUnreadMessages();
    }, []);
  
  const shuffleArray = (array) => {
  return array.sort(() => Math.random() - 0.5);
};


useEffect(() => {
        const db = getDatabase();
        const postButtonRef = ref(db, 'adminControl/postButtonSwitch'); // path ঠিক রাখুন

        // Firebase থেকে মান রিড করা
        const unsubscribe = onValue(postButtonRef, (snapshot) => {
            const value = snapshot.val();
            setPostButtonVisible(value === "on"); // যদি "on" হয় তাহলে true, নাহলে false
        });

        return () => unsubscribe(); // Cleanup function
    }, []);



const fetchUserNameAndProfile = async () => {
    const email = await SecureStore.getItemAsync('user-email');
    if (email) {
      try {
        const userSnapshot = await database
          .ref('UserAuthList')
          .orderByChild('Email')
          .equalTo(email)
          .once('value');
        const userData = userSnapshot.val();

        if (userData) {
          const user = Object.values(userData)[0];
          setFirstName(user.firstName);
          setProfilePicture(user.profilePicture);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  };
  
 const handleShare = async () => {
  try {
    const result = await Share.share({
      message: 'See this post on socialbook 🔥\nhttps://socialbook.com/post/user4Zgk1_2rCtX', // শেয়ার করার কনটেন্ট
      url: 'https://yourapp.com/post/12345', // যদি শুধুমাত্র লিংক শেয়ার করতে চান
      title: 'শেয়ার করুন', 
    });

    if (result.action === Share.sharedAction) {
      if (result.activityType) {
        console.log('Shared with activity type:', result.activityType);
      } else {
        console.log('Shared successfully!');
      }
    } else if (result.action === Share.dismissedAction) {
      console.log('Share dismissed');
    }
  } catch (error) {
    console.error('Error sharing:', error.message);
  }
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


// follow user list fetching..
useEffect(() => {
    const fetchUsers = async () => {
      try {
        const userEmail = await SecureStore.getItemAsync("user-email");
        if (!userEmail) return;

        const userRef = ref(database, "UserAuthList");
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const allUsers = Object.keys(snapshot.val()).map((key) => ({
              id: key,
              ...snapshot.val()[key],
            }));

            setUsers(allUsers.filter((user) => user.Email !== userEmail)); // ✅ লগইন করা ইউজার বাদ দেওয়া
          } else {
            setUsers([]);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    setShuffledUsers(shuffleArray([...users])); // ইউজার ডাটা শাফল করা
  }, [users]);


  // ফলো করা ইউজারদের ডেটা fetch করুন
  useEffect(() => {
    const fetchFollowedUsers = async () => {
      const senderEmail = await SecureStore.getItemAsync("user-email");
      const followListRef = ref(database, "followList");
      const q = query(followListRef, orderByChild("following_sender"), equalTo(senderEmail));

      onValue(q, (snapshot) => {
        if (snapshot.exists()) {
          const followedData = snapshot.val();
          const followedIds = Object.keys(followedData).reduce((acc, key) => {
            acc[followedData[key].follow_receiver] = true;
            return acc;
          }, {});
          setFollowedUsers(followedIds);
        } else {
          setFollowedUsers({});
        }
      });
    };

    fetchFollowedUsers();
  }, []);

  // ফলো বা আনফলো ফাংশন
  const handleFollow = async (receiverEmail) => {
    try {
      const senderEmail = await SecureStore.getItemAsync("user-email");
      const followListRef = ref(database, "followList");

      const q = query(followListRef, orderByChild("following_sender"), equalTo(senderEmail));
      const snapshot = await get(q);

      let followId = null;
      if (snapshot.exists()) {
        const followData = snapshot.val();
        for (const key in followData) {
          if (followData[key].follow_receiver === receiverEmail) {
            followId = key;
            break;
          }
        }
      }

      // **Find Current Index**
      const currentIndex = users.findIndex((user) => user.Email === receiverEmail);

      if (followId) {
        // **Unfollow করলে পিছনের দিকে Smooth Scroll হবে**
        await remove(ref(database, `followList/${followId}`));
        setFollowedUsers((prev) => ({ ...prev, [receiverEmail]: false }));
        console.log("Unfollowed successfully!");

        // ✅ **Smooth Scroll: পিছনের দিকে কিছুটা স্ক্রল করা (আগের ইউজার মাঝামাঝি থাকবে)**
        const prevIndex = currentIndex - 1;
        if (flatListRef.current && prevIndex >= 0) {
          flatListRef.current.scrollToOffset({
            offset: prevIndex * 100 - 50, // ইউজার মাঝখানে থাকবে
            animated: true,
          });
        }
      } else {
        // **Follow করলে সামনের দিকে Smooth Scroll হবে**
        const newFollowId = new Date().getTime().toString();
        await set(ref(database, `followList/${newFollowId}`), {
          following_sender: senderEmail,
          follow_receiver: receiverEmail,
          timestamp: new Date().toISOString(),
        });
        setFollowedUsers((prev) => ({ ...prev, [receiverEmail]: true }));
        console.log("Followed successfully!");

        // ✅ **Smooth Scroll: সামনের দিকে কিছুটা স্ক্রল করা (পরের ইউজার মাঝামাঝি থাকবে)**
        const nextIndex = currentIndex + 1;
        if (flatListRef.current && nextIndex < users.length) {
          flatListRef.current.scrollToOffset({
            offset: nextIndex * 100 - 50, // ইউজার মাঝখানে থাকবে
            animated: true,
          });
        }
      }
    } catch (error) {
      console.error("Error in follow/unfollow:", error);
    }
  };


  
  
  useEffect(() => {
  const unsubscribe = onValue(appStatusRef, (snapshot) => {
    const status = snapshot.val();
    if (status === "inactive") {
      handleAppInactive();
    }
  });

  return () => unsubscribe();
}, []);

const handleAppInactive = async () => {
  Alert.alert(
    "Login Error",
    "An unexpected error occurred. Please try logging in again.",
    [
      {
        text: "OK",
        onPress: async () => {
          setIsLoading(true); // Start loading

          try {
            await SecureStore.deleteItemAsync('user-email');
            console.log("User logged out due to app inactivity");

            // Simulate 2 seconds of loading
            setTimeout(() => {
              // After 2 seconds, perform the navigation reset
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginPage' }],
              });
            }, 2000); // 2 seconds delay for loading

          } catch (error) {
            setIsLoading(false); // Stop loading in case of error
            Alert.alert("Error", "Logout failed.");
          }
        },
      },
    ],
    { cancelable: false } // Disable dismissing alert
  );
};
  
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const email = await SecureStore.getItemAsync("user-email");
        if (!email) return;

        const userAuthRef = database.ref("UserAuthList"); // `db` এর বদলে `database.ref()` ব্যবহার করুন
        const snapshot = await userAuthRef.once("value"); // `.once("value")` দিয়ে ফেচ করুন

        if (snapshot.exists()) {
          let userFound = false;

          snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();

            if (userData.Email === email) {
              userFound = true;
              if (userData.accountStatus === "disabled") {
                Alert.alert(
                  "Session Expired",
                  "Your session has expired due to inactivity. please log in again.",
                  [
                    {
                      text: "OK",
                      onPress: async () => {
                        setIsLoading(true);
                        try {
                          await SecureStore.deleteItemAsync("user-email");
                          console.log("User logged out due to disabled account");

                          navigation.reset({
                            index: 0,
                            routes: [{ name: "LoginPage" }],
                          });
                        } catch (error) {
                          Alert.alert("Error", "Logout failed.");
                        } finally {
                          setIsLoading(false);
                        }
                      },
                    },
                  ]
                );
              }
            }
          });

          if (!userFound) {
            console.log("User not found in database.");
          }
        }
      } catch (error) {
        console.error("Error checking account status:", error);
      }
    };

    checkStatus();
  }, []);
  
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

  useFocusEffect(
  useCallback(() => {
    StatusBar.setBackgroundColor(currentTheme === 'dark' ? '#262729' : '#fff');
    StatusBar.setBarStyle(currentTheme === 'dark' ? 'light-content' : 'dark-content');
  }, [currentTheme])
);
  
  
  
  
  const videoLayouts = useRef({});
  const SCREEN_HEIGHT = window.innerHeight;
  
  // ভিউ সংখ্যা তৈরি এবং আপডেটের ফাংশন
const incrementViewCount = async (postId) => {
  try {
    const postRef = ref(database, `All_Post/${postId}/views`);
    const snapshot = await get(postRef);

    if (snapshot.exists()) {
      // যদি ভিউ সংখ্যা আগে থেকে থাকে, একটিতে যোগ করুন
      const currentViews = snapshot.val();
      await update(ref(database, `All_Post/${postId}`), {
        views: currentViews + 1,
      });
    } else {
      // যদি ভিউ নোড না থাকে, তৈরি করুন এবং ভিউ সংখ্যা ১ সেট করুন
      await update(ref(database, `All_Post/${postId}`), {
        views: 1,
      });
    }
  } catch (error) {
    console.error('Error updating views:', error);
  }
};


// ভিডিওর প্লে স্ট্যাটাস আপডেটের ফাংশন
const onPlaybackStatusUpdate = (status, postId) => {
  if (status.isPlaying && !status.didJustFinish && !hasPlayed[postId]) {
    incrementViewCount(postId); // ভিউ সংখ্যা বাড়ানো
    setHasPlayed((prevState) => ({
      ...prevState,
      [postId]: true, // ভিডিওটি প্লে হলে track করতে true করা
    }));

    // ভিডিও প্লে হলে স্ক্রিন জাগিয়ে রাখুন
    activateKeepAwake();
  }

  // ভিডিও শেষ হলে কন্ট্রোল লুকানো এবং স্ক্রিন অফ করার অনুমতি দিন
  if (status.didJustFinish) {
    setShowControls((prev) => ({
      ...prev,
      [postId]: false,
    }));
    setCurrentPlayingId(null); // বর্তমান প্লেয়িং ভিডিও রিসেট করা
    deactivateKeepAwake(); // স্ক্রিন অফ করার অনুমতি দিন
  }
};
  
  const formatViews = (views) => {
  if (views >= 1000000) {
    // 1000000 এর বেশি হলে 'M' দেখানো হবে, এবং 1.0M না হয়ে শুধুমাত্র 1M দেখাবে
    return `${Math.floor(views / 1000000)}M`;
  } else if (views >= 1000) {
    // 1000 এর বেশি হলে 'K' দেখানো হবে, এবং দশমিক সহ দেখানো হবে
    return views % 1000 === 0 ? `${views / 1000}K` : `${(views / 1000).toFixed(1)}K`;
  }
  return views;
};
  
  const handlePress = (word) => {
    if (word.startsWith('http://') || word.startsWith('https://')) {
      Linking.openURL(word).catch((err) =>
        console.error("Couldn't open link: ", err)
      );
    }
  }; 
  
  useEffect(() => {
    // Firebase থেকে ডেটা রিড করা
    const db = getDatabase();
    const usersRef = ref(db, 'UserAuthList');

    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const usersArray = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      setUsers(usersArray);
    });
  }, []);
  
  const handlePlayPause = (id) => {
  if (currentPlayingId === id) {
    videoRefs.current[id]?.pauseAsync();
    setCurrentPlayingId(null);
    deactivateKeepAwake(); // স্ক্রিন অফ করার অনুমতি দিন
  } else {
    if (currentPlayingId && videoRefs.current[currentPlayingId]) {
      videoRefs.current[currentPlayingId]?.pauseAsync();
    }
    videoRefs.current[id]?.playAsync();
    setCurrentPlayingId(id);
    activateKeepAwake(); // স্ক্রিন জাগিয়ে রাখুন
  }
};

  const handleMuteUnmute = (id) => {
    setIsMuted((prevMuted) => !prevMuted);
    videoRefs.current[id]?.setIsMutedAsync(!isMuted);
  };

  // Skip forward by 5 seconds
  const handleSkipForward = async () => {
  try {
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPosition = status.positionMillis + 5000; // ৫ সেকেন্ড যোগ করুন
      await videoRef.current.setPositionAsync(newPosition);
    }
  } catch (error) {
    console.error("Error skipping forward:", error);
  }
};

const handleSkipBackward = async () => {
  try {
    const status = await videoRef.current.getStatusAsync();
    if (status.isLoaded) {
      const newPosition = Math.max(status.positionMillis - 5000, 0); // ৫ সেকেন্ড পিছনে যান
      await videoRef.current.setPositionAsync(newPosition);
    }
  } catch (error) {
    console.error("Error skipping backward:", error);
  }
};

  const [showControls, setShowControls] = useState(
  posts.reduce((acc, post) => ({ ...acc, [post.id]: true }), {})
);

const handleTap = (postId) => {
  // নির্বাচিত ভিডিওর কন্ট্রোল দৃশ্যমান করা
  setShowControls((prev) => ({
    ...prev,
    [postId]: true,
  }));

  // অন্যান্য ভিডিওগুলোর কন্ট্রোল লুকানো
  setShowControls((prev) =>
    Object.keys(prev).reduce((result, id) => {
      result[id] = id === postId;
      return result;
    }, {})
  );

  // ৩ সেকেন্ড পরে নির্বাচিত ভিডিওর কন্ট্রোল লুকানো
  setTimeout(() => {
    setShowControls((prev) => ({
      ...prev,
      [postId]: false,
    }));
  }, 3000);
};

// ভিডিও লোড হওয়ার সময় কন্ট্রোল দৃশ্যমান রাখার জন্য একটি useEffect ব্যবহার করা যেতে পারে।
useEffect(() => {
  // সব ভিডিওর জন্য কন্ট্রোল দৃশ্যমান
  setShowControls(
    posts.reduce((acc, post) => ({ ...acc, [post.id]: true }), {})
  );
}, [posts]);
  
  // সাউন্ড প্লে করার ফাংশন
  async function playSound() {
    const { sound } = await Audio.Sound.createAsync(
  //    require('../assets/refresh.mp3') // আপনার mp3 ফাইল
    );
    setSound(sound);
    await sound.playAsync();
  }

  // Cleanup করার জন্য useEffect
  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  // রিফ্রেশ ফাংশন
  const onRefresh = useCallback(() => {
    // সাউন্ড বাজান
    playSound();

    // রিফ্রেশ প্রসেস শুরু করুন
    setIsRefreshing(true);

    // পোস্ট ফেচ করুন
    fetchPosts().then(() => {
      // ইউজারের প্রোফাইল ডেটা রিফ্রেশ করুন
      fetchUserNameAndProfile().then(() => {
        setIsRefreshing(false);
      });
    });
  }, []);

  

  
  const fetchPosts = () => {
  setLoading(true); // ফাংশন শুরুতেই লোডিং সেট করুন
  return new Promise((resolve, reject) => {
    const postsRef = database.ref('All_Post');

    // ডেটা একবার ফেচ করা হবে
    postsRef.once('value')
      .then((snapshot) => {
        const data = snapshot.val();
        if (data) {
          const formattedPosts = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setPosts(
            formattedPosts.sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )
          );
        } else {
          setPosts([]); // যদি কোনো পোস্ট না থাকে
        }
        setLoading(false); // সফল হলে লোডিং বন্ধ করুন
        resolve();
      })
      .catch((error) => {
        console.error("Error fetching posts:", error);
        setLoading(false); // ত্রুটি হলেও লোডিং বন্ধ করতে হবে
        reject(error); // Promise রিজেক্ট করা উচিত
      });
  });
};

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

  const handleBackPress = () => {
    if (scrollPosition > 0) {
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true }); // স্ক্রল টপে নিয়ে যাওয়া
      onRefresh(); // রিফ্রেশ ফাংশন কল
      return true; // ডিফল্ট ব্যাক অ্যাকশন ব্লক করা
    }
    return false; // ডিফল্ট ব্যাক অ্যাকশন অনুমতি দেওয়া
  };

  const handleScroll = useCallback((event) => {
        const newScrollPosition = event.nativeEvent.contentOffset.y;
        setScrollPosition(newScrollPosition);

        posts.forEach((post) => {
            const layout = videoLayouts.current[post.id];
            if (!layout) return;

            const isVisible =
                layout.pageY < newScrollPosition + SCREEN_HEIGHT &&
                layout.pageY + layout.height > newScrollPosition;

            if (!isVisible && currentPlayingId === post.id) {
                videoRefs.current[post.id]?.pauseAsync();
                setCurrentPlayingId(null);
            }
        });
    }, [currentPlayingId, posts, SCREEN_HEIGHT]);

    useEffect(() => {
        // স্ক্রল লিসেনার অ্যাড এবং রিমুভ করুন
        return () => {
            // কম্পোনেন্ট আনমাউন্ট হলে ক্লিনআপ
        };
    }, []);

  const handleLayout = (id, event) => {
    const { y, height } = event.nativeEvent.layout;
    videoLayouts.current[id] = { pageY: y, height };
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    fetchUserNameAndProfile();
    fetchPosts();

    return () => backHandler.remove();
  }, [scrollPosition]);
  
  const handleLike = async (postId) => {
  const email = await SecureStore.getItemAsync('user-email');
  if (!email) {
    alert('Please log in to like posts.');
    return;
  }

  const sanitizedEmail = sanitizeEmailForFirebase(email); // Sanitize the email

  try {
    // Fetch user details from UserAuthList using email
    const dbRef = database.ref('UserAuthList');
    dbRef.orderByChild('Email').equalTo(email).once('value', async (snapshot) => {
      if (snapshot.exists()) {
        const userData = Object.values(snapshot.val())[0]; // Get the first matching user
        const fullName = `${userData.firstName} ${userData.lastName}`;

        // Optimistic UI Update: Update posts immediately
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  likedUsers: post.likedUsers
                    ? post.likedUsers[sanitizedEmail]
                      ? Object.keys(post.likedUsers).reduce((acc, key) => {
                          if (key !== sanitizedEmail) acc[key] = post.likedUsers[key];
                          return acc;
                        }, {})
                      : { ...post.likedUsers, [sanitizedEmail]: fullName }
                    : { [sanitizedEmail]: fullName },
                }
              : post
          )
        );

        // Immediately update the UI by adding/removing the like
        const postRef = database.ref(`All_Post/${postId}/likedUsers/${sanitizedEmail}`);
        postRef.once('value', async (snapshot) => {
          if (snapshot.exists()) {
            // Unlike: Remove the user from the 'likedUsers' node
            await postRef.remove();

            // Remove notification for the like
            const notificationRef = database.ref(`All_Post/${postId}/notifications`);
            notificationRef.once('value', (notificationSnapshot) => {
              if (notificationSnapshot.exists()) {
                const notifications = notificationSnapshot.val();

                // Find the notification matching the user's like and remove it
                for (const [key, notification] of Object.entries(notifications)) {
                  if (notification.senderEmail === email) {
                    notificationRef.child(key).remove();
                    break; // Stop after finding the first matching notification
                  }
                }
              }
            });
          } else {
            // Like: Add the user to the 'likedUsers' node
            await postRef.set(fullName);

            // Use timestamp as the key for notification
            const timestamp = Date.now();
            const notificationRef = database.ref(`All_Post/${postId}/notifications/${timestamp}`);
            const notificationData = {
              likedBy: fullName,
              senderEmail: email,
              timestamp: timestamp,
              message: `recently liked to your post.`,
              seenStatus: false, // Boolean type (true or false)
            };

            await notificationRef.set(notificationData);
          }
        });
      } else {
        alert('User not found in database.');
      }
    });
  } catch (error) {
    console.error('Error liking post:', error);
  }
};
  
  const getLikeCount = (likedUsers) => {
  return likedUsers ? Object.keys(likedUsers).length : 0;
};
  
  const sanitizeEmailForFirebase = (email) => {
  return email.replace(/\./g, ','); // Replace all "." with ","
};
const [currentUserEmail, setCurrentUserEmail] = useState(null);



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

  animatePost1.start();
  

  return () => {
    animatePost1.stop();
    
  };
}, [fadeAnim1]);


const handlePostMenuClick = async (postId) => {
  try {
    // SecureStore থেকে ইউজারের ইমেইল নেওয়া
    const userEmail = await SecureStore.getItemAsync("user-email");

    if (!userEmail) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "User email not found!",
      });
      return;
    }

    // Firebase থেকে নির্দিষ্ট পোস্টের `account` এবং `userName` ফিল্ড নেওয়া
    const db = getDatabase();
    const postRef = ref(db, `All_Post/${postId}`);
    const snapshot = await get(postRef);

    if (snapshot.exists()) {
      const postData = snapshot.val();
      const postOwnerName = postData.userName || "Unknown User"; // যদি নাম না থাকে, তাহলে "Unknown User" দেখাবে

      // ইউজারের ইমেইল ও পোস্টের ইমেইল মিলিয়ে দেখা
      if (postData.account === userEmail) {
        // যদি ইমেইল মিলে, তাহলে ডিলিট অপশন দেখানো হবে
        Alert.alert(
          "Delete Post",
          "Are you sure you want to delete this post?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              onPress: () => handleDeletePost(postId),
              style: "destructive",
            },
          ],
          { cancelable: true }
        );
      } else {
        // পোস্ট ক্রিয়েটরের নামসহ মেসেজ দেখানো
        Toast.show({
          type: "info",
          text1: "This is not your post!",
          text2: `This post was created by ${postOwnerName}. Only they can delete or modify it.`,
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Post not found!",
      });
    }
  } catch (error) {
    console.error("Error checking post owner:", error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Something went wrong. Please try again.",
    });
  }
};

const handleDeletePost = async (postId) => {
  try {
    const db = getDatabase();
    const postRef = ref(db, `All_Post/${postId}`);
    await remove(postRef);

    // Toast দেখানো
    Toast.show({
      type: "success", // সফল হলে
      text1: "Post Deleted", // টাইটেল
      text2: "The post has been successfully deleted!", // বর্ণনা
      position: "top",
    });

    // UI থেকে পোস্ট সরানো
    const updatedPosts = posts.filter((post) => post.id !== postId);
    setPosts(updatedPosts);
  } catch (error) {
    console.error("Error deleting post:", error);

    // Toast দেখানো (ত্রুটি হলে)
    Toast.show({
      type: "error", // ত্রুটি হলে
      text1: "Delete Failed",
      text2: "Something went wrong. Please try again.",
    });
  }
};



const containerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#262729' : '#fff',
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
  const headerContainerBorder = {
    borderColor: currentTheme === 'dark' ? '#65686D' : '#C9CCD1',
  };
  
  const mainContainerStyle = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
  };
  const followButtonBg = {
    backgroundColor: currentTheme === 'dark' ? '#EFEFEF' : '#000',
  };
  const followButtonTextColor = {
    color: currentTheme === 'dark' ? '#000' : '#fff',
  };
  
const dynamicTextColor = {
    color: currentTheme === 'dark' ? '#F3F4F8' : '#000',
  };
const userProfileBg = {
    backgroundColor: currentTheme === 'dark' ? '#373737' : '#efefef',
  };
  
const offWhiteColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#efefef',
  };
  
const storyBgColor = {
    backgroundColor: currentTheme === 'dark' ? '#333333' : '#fff',
    borderColor: currentTheme === 'dark' ? '#000' : '#ccc',
  };
  const postImgBgColor = {
    backgroundColor: currentTheme === 'dark' ? '#000' : '#D0D9DE',
  };
const storyBorderColor = {
    borderColor: currentTheme === 'dark' ? '#000' : '#ccc',
  };
  const profileBorderColor = {
    borderColor: currentTheme === 'dark' ? '#333333' : '#fff',
  };
const plusIconBorderColor = {
    borderColor: currentTheme === 'dark' ? '#262729' : '#fff',
  };
const storyLoading = {
    backgroundColor: currentTheme === 'dark' ? '#505153' : '#efefef',
    
  };
const StContainerBorderColor = {
    borderColor: currentTheme === 'dark' ? '#000' : '#C9CCD1',
    
  };
  
  
 const spanTextColor = {
    color: currentTheme === 'dark' ? '#B2B3B8' : 'gray',
    
  };






  return (
  <View style={[styles.container, containerStyle ]}>
    
    {isLoading && (
      <View style={[styles.overlay, containerStyle]}>
        <ActivityIndicator size="large" color={dynamicTextColor.color} />
        <Text style={[styles.lgText, dynamicTextColor]}>Loging out...</Text>
      </View>
    )}
    
<View style={[styles.headerContainer, containerStyle, headerContainerBorder ]}>
      <Text style={[styles.logoText, dynamicTextColor ]}>Socialbook</Text>
      <View style={styles.iconsContainer}>
        {postButtonVisible && (
                <TouchableOpacity onPress={() => navigation.navigate('PostCreatePage')}>
                    <Ionicons style={[styles.createIcon, dynamicTextColor]} name="add-circle" />
                </TouchableOpacity>
            )}
        <TouchableOpacity
  onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}
>
  <Ionicons style={[styles.searchIcon, dynamicTextColor ]} name="search-outline"/>
</TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChatPage')}>
          <Ionicons style={[styles.chatIcon, dynamicTextColor ]} name="chatbubble-ellipses"/>
            {unreadCount > 0 && (
                <Text style={styles.msgNotifyDot}>{unreadCount}</Text>
            )}
        </TouchableOpacity>
      </View>
    </View>
    
    
    <FlatList
  data={loading ? [] : posts} // পোস্টের ডেটা এখানে যুক্ত করা হয়েছে
  keyExtractor={(item) => item.id.toString()}
  style={[styles.mainContainer, mainContainerStyle ]}
  showsVerticalScrollIndicator={false}
  scrollEventThrottle={16}
  ref={scrollViewRef}
  onScroll={handleScroll}
  bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
  refreshControl={
    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
  }
  ListHeaderComponent={
    <>

      {/* Story Section */}
      <FlatList
      ref={flatListRef} // **FlatList-এর রেফারেন্স সেট করা**
      data={loading ? [] : users}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      bounces={false}
      alwaysBounceHorizontal={false}
      overScrollMode="never"
      style={[styles.storyContainer, containerStyle, StContainerBorderColor]}
      // **Header Component**
      ListHeaderComponent={
        <View style={[styles.createStory]}>
          <Image
            source={profilePicture ? { uri: profilePicture } : null}
            style={[styles.createStImg, offWhiteColor]}
          />
          <Image
            source={require("../assets/appIcon.png")}
            style={[styles.plusIcon, plusIconBorderColor]}
          />
          <Text style={[styles.createStText, dynamicTextColor]}>Create Story</Text>
        </View>
      }

      // **Loading Component**
      ListEmptyComponent={
        <View style={styles.followSuggLoadingBox}>
          <View style={[styles.followSuggLoading, storyLoading]}></View>
          <View style={[styles.followSuggLoading, storyLoading]}></View>
          <View style={[styles.followSuggLoading, storyLoading]}></View>
        </View>
      }

      // **User List Render**
      renderItem={({ item }) => (
        <Pressable style={[styles.userStory]}>
          <Image source={{ uri: item.profilePicture }} style={[styles.followSuggImg, userProfileBg]} />
          <TouchableOpacity
            style={styles.personIcon}
            onPress={() => handleFollow(item.Email)}
          >
            <Ionicons
              style={styles.personAddIcon}
              name={followedUsers[item.Email] ? "checkmark" : "person-add-outline"}
              size={13}
            />
          </TouchableOpacity>
          <Text style={[styles.SuggNameText, dynamicTextColor]}>
            {item.firstName} {item.lastName}
          </Text>
        </Pressable>
      )}

      // **Footer Component: Bottom Space**
      ListFooterComponent={<View style={styles.Space} />}
    />
    </>
  }
  ListEmptyComponent={
    loading ? (
      <View style={styles.twoLoadingBox}>
          <View style={styles.loadingPostContainer}>
      {/* প্রথম লোডিং পোস্ট */}
      <View style={[styles.loadingPost, containerStyle ]}>
        <View style={styles.loadingPostHeader}>
          <Animated.View style={[styles.loadingPostProfile, storyLoading, { opacity: fadeAnim1 }]} />
          <View style={styles.loadingBarContainer}>
            <Animated.View style={[styles.bar1, storyLoading, { opacity: fadeAnim1 }]} />
            <Animated.View style={[styles.bar2, storyLoading, { opacity: fadeAnim1 }]} />
            
            
          </View>
        </View>
        <Animated.View style={[styles.loadingImage, { opacity: fadeAnim1 }]} />
        <View style={styles.bottomBarContainer}>
              <Animated.View style={[styles.bBar, storyLoading, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, storyLoading, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, storyLoading, { opacity: fadeAnim1 }]} />
            </View>
      </View>

      
      
    </View>
        </View>
    ) : (
      <View style={styles.twoLoadingBox}>
          <View style={styles.loadingPostContainer}>
      {/* প্রথম লোডিং পোস্ট */}
      <View style={[styles.loadingPost, containerStyle]}>
        <View style={styles.loadingPostHeader}>
          <Animated.View style={[styles.loadingPostProfile, storyLoading, { opacity: fadeAnim1 }]} />
          <View style={styles.loadingBarContainer}>
            <Animated.View style={[styles.bar1, storyLoading, { opacity: fadeAnim1 }]} />
            <Animated.View style={[styles.bar2, storyLoading, { opacity: fadeAnim1 }]} />
            
            
          </View>
        </View>
        <Animated.View style={[styles.loadingImage, { opacity: fadeAnim1 }]} />
        <View style={styles.bottomBarContainer}>
              <Animated.View style={[styles.bBar, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, { opacity: fadeAnim1 }]} />
              <Animated.View style={[styles.bBar, { opacity: fadeAnim1 }]} />
            </View>
      </View>

      
      
    </View>
        </View>
    )
  }
  renderItem={({ item: post }) => (
    
    <View key={post.id} style={[styles.postContainer, containerStyle ]}>
    <View style={styles.postContainerHeader}>
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('UserProfilePage', {
            account: post.account, // এখানে account ইমেইল পাঠানো হচ্ছে
          })
        }
      >
        <Image source={{ uri: post.profileImage }} style={styles.profileImage} />
      </TouchableOpacity>
      <View style={styles.postNameAndPostTimeBox}>
        <View>
          <View style={styles.postNameAndVerify}>
            <TouchableOpacity 
            onPress={() =>
          navigation.navigate('UserProfilePage', {
            account: post.account, // এখানে account ইমেইল পাঠানো হচ্ছে
          })
        }
            >
              
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
  <Text style={[styles.postUserNameText, dynamicTextColor]}>
    {post.userName}
  </Text>

  <Image 
    source={require('../assets/verified.png')} 
    style={[styles.verifyIcon, { marginLeft: 3 }]} 
  />

  {post.postType === 'profilePic' && (
    <Text style={[styles.updateText, spanTextColor, { marginLeft: 5, color: 'gray', fontWeight: 'normal', fontSize: 15 }]}> 
      Updated his profile picture.
    </Text>
  )}
</View>
            </TouchableOpacity>
            
          </View>
          <View style={styles.postTimeAndVisibility}>
            <Text style={[styles.postUploadTime, spanTextColor ]}>{getTimeAgo(post.timestamp)}</Text>
            <Text style={[styles.dotIcon, spanTextColor ]}>.</Text>
            <Ionicons style={[styles.publicIcon, spanTextColor ]} name="earth" size={13} />
          </View>
        </View>
      </View>
      <TouchableOpacity 
  style={styles.postMenu} 
  onPress={() => handlePostMenuClick(post.id)}
>
  <Ionicons style={[styles.none, dynamicTextColor ]} name="ellipsis-vertical" size={20} color="#4E4E4E" />
</TouchableOpacity>
      
    </View>
    
    <View key={post.id} style={styles.postContent}>
      {post.postText && (
      <Text
        style={[
          styles.postText,
          dynamicTextColor,
          !post.postImage && !post.postVideo
            ? post.postText.split(' ').length <= 30
              ? { fontSize: 16, }
              : { fontSize: 16 }
            : { fontSize: 16 },
        ]}
      >
        {post.postText.split(' ').map((word, index) => (
          <Text
            key={index}
            style={{
              color: word.startsWith('#') || word.startsWith('http')
                ? '#1876f2'
                : {dynamicTextColor}, // লিঙ্ক এবং # ট্যাগ আলাদা রঙে দেখাবে
              fontWeight: word.startsWith('#') || word.startsWith('http')
                ? 'bold'
                : 'normal', // লিঙ্ক এবং # ট্যাগ bold করবে
            }}
            onPress={() => handlePress(word)} // লিঙ্কে ক্লিক করলে ওপেন করবে
          >
            {word + ' '}
          </Text>
        ))}
      </Text>
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

      {/* ভিডিও শো করার অংশ */}
      {post.postVideo && (
  <Pressable
    onTouchEnd={() => handleTap(post.id)} // postId পাস করা হয়েছে
    style={styles.postVideoBox}
    onPress={() => navigation.navigate('VideoPage', { postId: post.id, videoUri: post.postVideo })}
    onLayout={(event) => handleLayout(post.id, event)}
  >
    <Video
      source={{ uri: post.postVideo }}
      style={styles.postVideo}
      resizeMode="contain"
      isLooping
      isMuted={isMuted}
      ref={(ref) => (videoRefs.current[post.id] = ref)} // ভিডিও রেফারেন্স সংরক্ষণ
      onPlaybackStatusUpdate={(status) => onPlaybackStatusUpdate(status, post.id)}
    />
    {showControls[post.id] && (  // শুধুমাত্র সংশ্লিষ্ট postId এর জন্য কন্ট্রোলস দেখানো হবে
      <>
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={() => handlePlayPause(post.id)}
        >
          <Ionicons
            name={currentPlayingId === post.id ? 'pause' : 'play'}
            size={30}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipBackwardButton}
          onPress={handleSkipBackward}
        >
          <Ionicons
            name="play-back"
            size={20}
            color="white"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipForwardButton}
          onPress={handleSkipForward}
        >
          <Ionicons
            name="play-forward"
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </>
    )}
    {/* Mute button সবসময় দৃশ্যমান */}
    <TouchableOpacity
      style={styles.muteButton}
      onPress={handleMuteUnmute}
    >
      <Ionicons
        name={isMuted ? 'volume-mute' : 'volume-high'}
        size={18}
        color="white"
      />
    </TouchableOpacity>
  </Pressable>
)}
      
      {(post.likedUsers && Object.keys(post.likedUsers).length > 0) || 
 (post.comments && Object.keys(post.comments).length > 0) ? (
  <View style={styles.reactCountContainer}>
    {post.likedUsers && Object.values(post.likedUsers).length > 0 ? (
      <TouchableOpacity 
        onPress={() => navigation.navigate('ShowReactPage', { postId: post.id })}
        style={styles.reactNameContainer}>
        <AntDesign name="like1" style={styles.heartIcon} />

        {/* শুধু নতুন লাইক করা ইউজারের নাম এবং +1 বা বেশি দেখানো হবে */}
        {Object.keys(post.likedUsers).length > 1 ? (
          <>
            <Text style={[styles.activityText, spanTextColor ]}>
              {Object.values(post.likedUsers)[Object.keys(post.likedUsers).length - 1]}{/* নতুন লাইক ইউজার */}
            </Text>
            <Text style={[styles.activityText, spanTextColor ]}>+ {Object.keys(post.likedUsers).length - 1}
            </Text>
          </>
        ) : (
          <Text style={styles.activityText}>
            {Object.values(post.likedUsers)[0]} 
          </Text>
        )}
      </TouchableOpacity>
    ) : null}
    
    <View style={styles.viewAndCommentBox}>
      
      {post.comments && Object.keys(post.comments).length > 0 && (
        <TouchableOpacity
          style={styles.commentsCountBtn}
          onPress={() => {
            navigation.navigate('PostViewPage', {
              postId: post.id,
              postText: post.postText,
              postImage: post.postImage,
              postVideo: post.postVideo, // ভিডিও পাঠানো হচ্ছে
              profileImage: post.profileImage,
              userName: post.userName,
              timestamp: post.timestamp,
            });
          }}
        >
          <Text style={[styles.activityTextComment, spanTextColor ]}>
            {Object.keys(post.comments).length} comments
          </Text>
        </TouchableOpacity>
      )}

      {/* শুধুমাত্র ভিডিও পোস্টের জন্য ভিউ সংখ্যা দেখানো */}
      {post.postVideo && (
  <View style={styles.viewCountContainer}>
    <Text style={[styles.viewText, spanTextColor ]}>
      {post.views ? `${formatViews(post.views)} views` : '0 views'}
    </Text>
  </View>
)}

    </View>
  </View>
) : null}

<View style={styles.postActivityContainer}>
  <TouchableNativeFeedback
    background={
      Platform.OS === 'android'
        ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false)
        : undefined
    }
    onPress={() => handleLike(post.id)}
  >
    <View style={styles.activityBtnLike}>
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
    </View>
  </TouchableNativeFeedback>

  <TouchableNativeFeedback
    background={
      Platform.OS === 'android'
        ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false)
        : undefined
    }
    onPress={() => {
      navigation.navigate('PostViewPage', {
        postId: post.id,
        postText: post.postText,
        postImage: post.postImage,
        postVideo: post.postVideo, // ভিডিও পাঠানো হচ্ছে
        profileImage: post.profileImage,
        userName: post.userName,
        timestamp: post.timestamp,
      });
    }}
  >
    <View style={styles.activityBtn}>
      <Ionicons style={[styles.none, spanTextColor ]} name="chatbubble-outline" size={23} color="gray" />
      <Text style={[styles.activityText, spanTextColor ]}>Comment</Text>
    </View>
  </TouchableNativeFeedback>

  <TouchableNativeFeedback 
  onPress={handleShare}
    background={
      Platform.OS === 'android'
        ? TouchableNativeFeedback.Ripple('rgba(0, 0, 0, .10)', false)
        : undefined
    }
  >
    <View style={styles.activityBtn}>
      <Ionicons style={[styles.none, spanTextColor ]} name="paper-plane-outline" size={23} color="gray" />
      <Text style={[styles.activityText, spanTextColor ]}>Share</Text>
    </View>
  </TouchableNativeFeedback>
</View>


<View style={styles.postCommentDisplayContainer}>
  <View style={styles.postCommentContainer}>
    <Image source={require('../assets/appIcon.png')} style={styles.postLatestCommentProfile} />
   <View style={styles.postCommentContentBox}>
      <Text style={styles.postCommentUserName}>Lazim Mahmud</Text>
    <Text style={styles.postCommentText}>💖💖</Text>
   </View>
  </View>
</View>


      
    </View>
  </View>
  )}
  ListFooterComponent={<View style={styles.footerSpace} />}
/>
  </View>
);
}









const styles = StyleSheet.create({
  mainContainer: {
    width: '100%',
    height: '93.5%',
    backgroundColor: '#C9CCD1',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
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
  postUserNameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  space:{
    marginLeft: 20,
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
    marginTop: 5,
    gap: 5,
  },
  activityBtnLike:{
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '33%',
  },
  activityBtn: {
    gap: 4,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    width: '33%',
    justifyContent: 'center',
  },
  activityText: {
    color: 'gray',
    fontSize: 13,
  },
  activityTextComment:{
    color: 'gray',
    fontSize: 13,
    padding: 2,
  },
  commentsCountBtn:{
    marginLeft: 'auto',
  },
  reactCountContainer:{
    width: '100%',
    paddingHorizontal: 12,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reactNameContainer:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    
  },
  showUserReact:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  postMenu: {
    marginLeft: 'auto',
    marginRight: 10,
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
  twoLoadingBox: {
    width: '100%',
  },
  likeReactCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 100,
    marginLeft: 10,
  },
  likeCountNumberText: {
    color: '#808080',
    fontSize: 14,
  },
  loadingPost:{
    width: '100%',
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 5,
    paddingBottom: 15,
  },
  loadingPostHeader:{
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
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
  postNameAndVerify:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifyIcon:{
    height: 17,
    width: 17,
  },
  officialText:{
    color: 'gray',
    fontSize: 15,
  },
  postVideoBox: {
    marginTop: 10,
    height: 550,
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
  storyContainer:{
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomColor: '#C9CCD1',
    borderBottomWidth: 5,
  },
  createStory:{
    marginRight: 10,
  },
  createStImg:{
    width: 85,
    height: 85,
    borderRadius: 50,
    marginTop: 10,
  },
  plusIcon:{
    width: 30,
    height: 30,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
    marginLeft: 'auto',
    marginTop: -25,
  },
  createStText:{
    textAlign: 'center',
    fontSize: 15,
    marginTop: 4,
  },
  userStory:{
    width: 110,
    position: 'relative',
  },
  stotyProfile:{
    position: 'absolute',
    borderRadius: 50,
    height: 40,
    width: 40,
    zIndex: 1,
    borderColor: '#1876f2',
    borderWidth: 3,
    margin: 7,
    display: 'none',
  },
  stImg:{
    width: '100%',
    height: '100%',
    borderRadius: 15,
    display: 'none',
  },
  userStName:{
    position: 'absolute',
    bottom: 0,
    color: '#fff',
    fontWeight: 'bold',
    margin: 5,
    display: 'none',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    borderColor: '#fff',
    borderWidth: 3,
    padding: 10,
    borderRadius: 50,
  },
  muteButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 6,
    borderRadius: 50,
  },
  skipBackwardButton: {
    position: 'absolute',
    top: '52%',
    left: 70,
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 50,
    display: 'none',
  },
  skipForwardButton: {
    position: 'absolute',
    top: '52%',
    right: 70,
    transform: [{ translateY: -25 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 50,
    display: 'none',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: '#fff',
    borderBottomColor: '#ccc',
    paddingBottom: 5,
    zIndex: 1,
    borderBottomColor: '#D4D8D9',
  },
  logoText:{
    fontFamily: 'Pacifico_400Regular',
    fontSize: 30,
    width: '60%',
    marginTop: -2,
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  searchIcon: {
    fontSize: 30,
  },
  chatIcon:{
    fontSize: 28,
    marginRight: 2,
    position: 'relative',
  },
  createIcon:{
    fontSize: 29,
  },
  postComentInpBox:{
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    display: 'none',
  },
  postCommentProfile:{
    width: 40,
    height: 40,
    borderRadius: 50,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  postCommentinputBox:{
    width: '85%',
  },
  postCommentinputText:{
    backgroundColor: '#F1F2F6',
    borderRadius: 20,
    padding: 12,
    width: '100%',
    color: '#5F5F5F',
    fontSize: 15,
  },
  likeIcon:{
    marginTop: -5,
    marginRight: 3,
    
  },
  reactRoundIcon:{
    backgroundColor: '#1876f2',
    padding: 4,
    borderRadius: 50,
    elevation: 1,
    fontSize: 15,
    marginTop: 0,
  },
  heartIcon:{
    backgroundColor: '#1876f2',
    color: '#fff',
    fontSize: 10,
    padding: 3,
    borderRadius: 50,
    marginRight: 1,
  },
  followSuggImg:{
    width: 85,
    height: 85,
    borderRadius: 50,
    marginLeft: 'auto',
    marginRight: 'auto',
    backgroundColor: '#efefef',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginTop: 10,
    position: 'relative',
  },
  SuggNameText:{
    marginLeft: 'auto',
    marginTop: 10,
    marginRight: 'auto',
    fontSize: 13,
    textAlign: 'center',
  },
  suggFollowBtn:{
    backgroundColor: '#000',
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    padding: 6,
    marginTop: 5,
    marginLeft: 'auto',
    marginRight: 'auto',
    gap: 8,
  },
  SuggFollowBtnText:{
    color: '#fff',
  },
  followIcon:{
    color: '#fff',
    fontSize: 15,
  },
  Space:{
    marginRight: 15,
  },
  viewText:{
    color: 'gray',
    fontSize: 13,
  },
  viewAndCommentBox:{
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 'auto',
  },
  noPostText:{
    textAlign: 'center',
    color: '#808080',
  },
  followSuggLoading:{
    width: 85,
    height: 85,
    backgroundColor: '#efefef',
    borderRadius: 50,
    marginRight: 10,
  },
  followSuggLoadingBox:{
    flexDirection: 'row',
    alignItems: 'center',
  },
  postCommentDisplayContainer:{
    width: '100%',
    padding: 10,
    display: 'none',
  },
  postCommentContainer:{
    flexDirection: 'row',
    gap: 8,
  },
  postLatestCommentProfile:{
    width: 40,
    height: 40,
    borderRadius: 50,
  },
  postCommentText:{
    marginTop: 6,
  },
  postCommentUserName:{
    fontWeight: 'bold',
  },
  postCommentContentBox:{
    backgroundColor: '#efefef',
    padding: 10,
    maxWidth: '62%',
    borderRadius: 20,
  },
  personAddIcon:{
    
    backgroundColor: '#fff',
    padding: 10,
    elevation: 3,
    borderRadius: 15,
    fontSize: 15,
  },
  personIcon:{
    bottom: 20,
    position: 'absolute',
    marginLeft: 40,
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  lgText:{
    marginTop: 7,
  },
  msgNotifyDot:{
    backgroundColor: '#DE2334',
    paddingHorizontal: 5,
    paddingVertical: 1,
    textAlign: 'center',
    borderRadius: 50,
    position: 'absolute',
    right: -2,
    top: -5,
    color: '#fff',
    borderColor: '#fff',
    borderWidth: 1.5,
    
  }
});