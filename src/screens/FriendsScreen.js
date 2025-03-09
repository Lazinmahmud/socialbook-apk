import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { database } from '../components/firebaseConfig';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
export default function FriendScreen() {
  const [followRequests, setFollowRequests] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [loggedInUser, setLoggedInUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Refreshing state
  const navigation = useNavigation();
  const [followStatus, setFollowStatus] = useState({}); 
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'followers', title: 'Followers' },
    { key: 'following', title: 'Following' },
    { key: 'suggetion', title: 'Suggetion' },
  ]);
  const [followingList, setFollowingList] = useState([]);
  
  
  // Scroll Effect for Elevation
  const onScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    
  };

  // SecureStore থেকে লগইন করা ইউজারের ইমেইল বের করা
  useEffect(() => {
    const getUserEmail = async () => {
      const email = await SecureStore.getItemAsync('user-email'); // SecureStore থেকে ইমেইল রিড করা
      if (email) {
        setLoggedInUser(email);
        fetchFollowRequests(email);
      }
    };
    getUserEmail();
  }, []);

  // Firebase থেকে follow request রিয়েলটাইম লোড করা
  const fetchFollowRequests = async (email) => {
  setLoading(true);
  setFollowRequests([]); // ডাটা ক্লিয়ার করে নতুনভাবে লোড করা
  setUserProfiles({});  // ইউজার প্রোফাইল ইনফো ক্লিয়ার করা

  database.ref('followList').once('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const requests = Object.values(data).filter(
        (item) => item.follow_receiver === email
      );
      setFollowRequests(requests);
      fetchUserProfiles(requests);
    } else {
      setFollowRequests([]); // যদি কোনো ফলো রিকোয়েস্ট না থাকে
    }
    setLoading(false);
  });
};

  // Firebase থেকে `following_sender` এর তথ্য খুঁজে বের করা (একবার লোড করবে)
  const fetchUserProfiles = async (requests) => {
    database.ref('UserAuthList').once('value', (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        let profiles = {};
        
        requests.forEach((request) => {
          // `following_sender` এর ইমেইল দিয়ে `UserAuthList` থেকে তথ্য খুঁজে বের করা
          const user = Object.values(userData).find((u) => u.Email === request.following_sender);
          if (user) {
            profiles[request.following_sender] = {
              fullName: `${user.firstName} ${user.lastName}`,
              profilePicture: user.profilePicture || 'https://example.com/defaultProfile.png', // ডিফল্ট প্রোফাইল পিকচার
            };
          }
        });

        setUserProfiles(profiles);
      }
      setLoading(false);
    });
  };

  // **Pull to Refresh ফিচার**
  const onRefresh = useCallback(async () => {
  setRefreshing(true);
  if (loggedInUser) {
    await fetchFollowRequests(loggedInUser); // নতুন করে লোড করবে
  }
  setRefreshing(false);
}, [loggedInUser]);


const handleFollowBack = async (followingSender) => {
  if (!loggedInUser || !followingSender) return;

  const followBackRef = database.ref('follow_back_list');

  followBackRef
    .orderByChild('follow_receiver')
    .equalTo(followingSender)
    .once('value', (snapshot) => {
      let existingEntry = null;
      let entryKey = null;

      snapshot.forEach((childSnapshot) => {
        if (childSnapshot.val().following_sender === loggedInUser) {
          existingEntry = childSnapshot.val();
          entryKey = childSnapshot.key;
        }
      });

      if (existingEntry && entryKey) {
        // আনফলো করলে Firebase থেকে ডাটা মুছে ফেলবে
        followBackRef.child(entryKey).remove()
          .then(() => console.log('Unfollowed successfully'))
          .catch((error) => console.error('Error unfollowing:', error));
      } else {
        // নতুন Follow Back করলে Firebase-এ সংরক্ষণ হবে
        const newFollowRef = followBackRef.push();
        newFollowRef
          .set({
            follow_receiver: followingSender,
            following_sender: loggedInUser,
            timestamp: new Date().toISOString(),
          })
          .then(() => console.log('Followed back successfully'))
          .catch((error) => console.error('Error following back:', error));
      }
    });
};


useEffect(() => {
  if (!loggedInUser) return;

  const followBackRef = database.ref('follow_back_list');

  const listener = followBackRef.on('value', (snapshot) => {
    let statusMap = {};

    if (snapshot.exists()) {
      const followData = snapshot.val();

      followRequests.forEach((request) => {
        const found = Object.values(followData).some(
          (entry) =>
            entry.follow_receiver === request.following_sender &&
            entry.following_sender === loggedInUser
        );
        statusMap[request.following_sender] = found;
      });
    }

    setFollowStatus(statusMap);
  });

  return () => followBackRef.off('value', listener);
}, [loggedInUser, followRequests]);

useEffect(() => {
  if (!loggedInUser) return;

  const followBackRef = database.ref('follow_back_list');

  followBackRef.on('value', (snapshot) => {
    let following = [];

    if (snapshot.exists()) {
      const followData = snapshot.val();

      Object.values(followData).forEach((entry) => {
        if (entry.following_sender === loggedInUser) {
          following.push({
            email: entry.follow_receiver,
            fullName: userProfiles[entry.follow_receiver]?.fullName || 'Unknown User',
            profilePicture: userProfiles[entry.follow_receiver]?.profilePicture || 'https://example.com/defaultProfile.png',
          });
        }
      });
    }

    setFollowingList(following);
  });

  return () => followBackRef.off('value');
}, [loggedInUser, userProfiles, followRequests]);



const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: '#000' }}
      style={{ backgroundColor: 'white' }}
      activeColor="#000"
      inactiveColor="gray"
    />
  );
  
  const FollowersRoute = () => (
    <ScrollView
      style={styles.container}
      onScroll={onScroll}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
            <View style={styles.loadingUser}>
              <View style={styles.loadingUserProfile}></View>
              <View>
                <View style={styles.loadingNameBar}></View>
                <View style={styles.loadingSubBar}></View>
              </View>
              <View style={styles.loadingFolowBtn}></View>
            </View>
          </View>
        ) : (
          followRequests.map((request, index) => {
            const userProfile = userProfiles[request.following_sender] || {};
            return (
              <View key={index} style={styles.followBackBox}>
                <Image source={{ uri: userProfile.profilePicture }} style={styles.profileImg} />
                <View>
                  <Text style={styles.userName}>{userProfile.fullName || 'Unknown User'}</Text>
                <Text>0 followers</Text>
                </View>
                <TouchableOpacity
  style={[
    styles.followBackBtn,
    followStatus[request.following_sender] && styles.followingBtn, // Following হলে স্টাইল পরিবর্তন হবে
  ]}
  onPress={() => handleFollowBack(request.following_sender)}
>
  <Text
    style={[
      styles.followBackBtnText,
      followStatus[request.following_sender] && styles.followingBtnText, // Text color পরিবর্তন হবে
    ]}
  >
    {followStatus[request.following_sender] ? 'Following' : 'Follow back'}
  </Text>
</TouchableOpacity>
              </View>
            );
          })
        )}
    </ScrollView>
  );

  const FollowingRoute = () => (
  <ScrollView
    style={styles.container}
    onScroll={onScroll}
    scrollEventThrottle={16}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
  >
    {followingList.length === 0 ? (
      <Text style={{ textAlign: 'center', marginTop: 20 }}>You are not following anyone yet</Text>
    ) : (
      followingList.map((user, index) => (
        <View key={index} style={styles.followBackBox}>
          <Image source={{ uri: user.profilePicture }} style={styles.profileImg} />
          <View>
            <Text style={styles.userName}>{user.fullName}</Text>
            <Text>0 followers</Text>
          </View>

          {/* Follow/Unfollow Button */}
          <TouchableOpacity
            style={[
              styles.followBackBtn,
              followStatus[user.email] && styles.followingBtn, // স্টাইল পরিবর্তন হবে
            ]}
            onPress={() => handleFollowBack(user.email)}
          >
            <Text
              style={[
                styles.followBackBtnText,
                followStatus[user.email] && styles.followingBtnText, // টেক্সট কালার পরিবর্তন হবে
              ]}
            >
              {followStatus[user.email] ? 'Following' : 'Follow back'}
            </Text>
          </TouchableOpacity>
        </View>
      ))
    )}
  </ScrollView>
);
  
  const SuggetionRoute = () => (
    <ScrollView
      style={styles.container}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
     
    </ScrollView>
  );

  return (
    <View style={styles.mainContainer}>
      <View style={[styles.header]}>
        <Text style={styles.headerText}>Followers</Text>
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigation.navigate('SearchPage', { autoFocus: true })}>
          <Ionicons style={styles.searchIcon} name="search-outline" />
        </TouchableOpacity>
      </View>

      <TabView
        navigationState={{ index, routes }}
        renderScene={SceneMap({
          followers: FollowersRoute,
          following: FollowingRoute,
          suggetion: SuggetionRoute,
        })}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={renderTabBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
  },
  header: {
    width: '100%',
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    
    zIndex: 1,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  searchIcon: {
    fontSize: 32,
  },
  searchBox: {
    marginLeft: 'auto',
  },
  container: {
    width: '100%',
    height: '100%',
  },
  followBackBox: {
    width: '100%',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileImg: {
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: '#ddd',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  userName: {
    fontSize: 17,
  },
  followBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: '#000',
    borderRadius: 8,
    marginLeft: 'auto',
  },
  followBackBtnText: {
    color: '#fff',
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderColor: '#000',
    borderWidth: 1,
  },
  followingBtnText: {
    color: '#000',
  },
  loadingUser:{
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 15,
  },
  loadingUserProfile:{
    width: 50,
    height: 50,
    borderRadius: 50,
    backgroundColor: '#ddd',
    
  },
  loadingNameBar:{
    width: 100,
    height: 12,
    backgroundColor: '#ddd',
    borderRadius: 6,
  },
  loadingSubBar:{
    width: 80,
    height: 10,
    backgroundColor: '#ddd',
    borderRadius: 6,
    marginTop: 10,
  },
  loadingFolowBtn:{
    width: 100,
    height: 35,
    backgroundColor: '#ddd',
    borderRadius: 6,
    marginLeft: 'auto',
  }
});