import React, { useEffect, useState, useRef, useCallback } from "react";
import { 
  View, StyleSheet, Text, StatusBar, TouchableOpacity, 
  FlatList, Dimensions, BackHandler, ActivityIndicator, Image
} from "react-native";
import { Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { database } from "../components/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign'; 
import { ref, onValue } from "firebase/database";
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake'; // import

const { height } = Dimensions.get("window");

export default function VideoPage({ navigation }) {
  const [videos, setVideos] = useState([]);
  const videoRefs = useRef([]);
  const loadingStates = useRef({});
  const videoLoadedRefs = useRef({}); // লোড হওয়া ভিডিও ট্র্যাক করবে

  useEffect(() => {
    const postsRef = ref(database, "All_Post");
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const videoPosts = Object.values(data).filter(post => post.postVideo);
        setVideos(videoPosts.reverse());
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [navigation]);

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (viewableItems.some(item => item.index === index)) {
          video.playAsync();
          activateKeepAwake(); // স্ক্রীন অন রাখবে
        } else {
          video.pauseAsync();
          deactivateKeepAwake(); // স্ক্রীন বন্ধ করবে
        }
      }
    });
  }, []);

  const handleVideoLoadStart = (index) => {
    if (!videoLoadedRefs.current[index]) {
      loadingStates.current[index] = true;
    }
  };

  const handleVideoLoad = (index) => {
    loadingStates.current[index] = false;
    videoLoadedRefs.current[index] = true; // একবার লোড হলে ট্র্যাক করবে
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#262729" barStyle="light-content" />

      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons style={styles.backIcon} name="close-outline" color="#fff" />
        </TouchableOpacity>
        <Text style={styles.titleText}>Clips</Text>
        <TouchableOpacity style={styles.searchBtn}>
          <Ionicons style={styles.searchIcon} name="camera-outline"/>
        </TouchableOpacity>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item, index) => index.toString()}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.videoContainer}>
            <View style={styles.videoActivitySidebar}>
              <View style={styles.activityBtn}>
                <AntDesign name="like2" style={styles.heartIcon} />
                <Text style={styles.activityBtnText}>
                  {item.likedUsers ? Object.keys(item.likedUsers).length : 0}
                </Text>
              </View>
              <View style={styles.activityBtn}>
                <Ionicons style={styles.sidebarIcon} name="chatbubble-outline" size={30} color="white" />
                <Text style={styles.activityBtnText}>0</Text>
              </View>
              <View style={styles.activityBtn}>
                <Ionicons style={styles.sidebarIcon} name="paper-plane-outline" size={30} color="white" />
                <Text style={styles.activityBtnText}>0</Text>
              </View>
            </View>
            
            <View style={styles.postDetailsCard}>
              <View style={styles.topDetails}>
                <Image source={{ uri: item.profileImage }} style={styles.UserProfile} />
                <Text style={styles.userNameText}>{item.userName}</Text>
                <Ionicons style={styles.publicIcon} name="earth" size={13} />
              </View>
              <View style={styles.bottomDetails}>
                {item.postText ? (
                  <Text style={styles.postText}>{item.postText}</Text>
                ) : null}
              </View>
            </View>

            {/* যদি ভিডিও আগেই লোড হয়ে থাকে তাহলে লোডিং দেখাবে না */}
            {!videoLoadedRefs.current[index] && loadingStates.current[index] && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}

            <Video
              ref={(ref) => (videoRefs.current[index] = ref)}
              source={{ uri: item.postVideo }}
              style={styles.video}
              resizeMode="contain"
              useNativeControls
              isLooping
              onLoadStart={() => handleVideoLoadStart(index)}
              onLoad={() => handleVideoLoad(index)}
            />
          </View>
        )}
        pagingEnabled
        snapToAlignment="center"
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#262729",
  },
  headerContainer: {
    width: "100%",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  titleText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},
  searchBtn:{
    marginLeft: 'auto',
  },
  searchIcon:{
    color: "#fff",
    fontSize: 26,
    textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
  },
  backIcon: {
    fontSize: 35,
    textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
  },
  videoContainer: {
    width: "100%",
    height: height,
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  video: {
    width: "100%",
    height: "100%",
    position: 'relative',
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  videoActivitySidebar: {
  width: 50,
  position: 'absolute',
  right: 10,
  top: '60%',
  
  zIndex: 10,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 10,
},
activityBtn:{
  marginBottom: 20,
},
heartIcon:{
  color: '#fff',
  fontSize: 30,
  textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},
activityBtnText:{
  color: '#fff',
  textAlign: 'center',
  marginTop: 5,
  textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},
sidebarIcon:{
  textShadowColor: "rgba(0, 0, 0, 0.70)",
  textShadowOffset: { width: 1, height: 1 },
  textShadowRadius: 1,
},
loadingOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    
  },
  postDetailsCard:{
    position: 'absolute',
    left: 10,
    bottom: '15%',
    zIndex: 1,
  },
  topDetails:{
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  UserProfile:{
    width: 40,
    height: 40,
    borderRadius: 50,
    borderColor: '#ccc',
    borderWidth: 0.8,
  },
  userNameText:{
    color: '#fff',
    fontSize: 15,
    textShadowColor: "rgba(0, 0, 0, 0.70)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  publicIcon:{
    color: '#fff',
    marginLeft: 2,
    textShadowColor: "rgba(0, 0, 0, 0.70)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  bottomDetails:{
    marginTop: 5,
    maxWidth: '90%',
  },
  postText:{
    textShadowColor: "rgba(0, 0, 0, 0.70)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    color: '#fff',
    fontSize: 16,
  }
});