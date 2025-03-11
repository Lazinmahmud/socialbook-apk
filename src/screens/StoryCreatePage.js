import React, { useState } from 'react';
import { View, TextInput, FlatList, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API_KEY = 'AIzaSyAo8Y1n5w-0qNyBWs_NpTZd9YL0y1rRDoU';
const BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

const YouTubeSearchPage = () => {
  const [query, setQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // লোডিং স্টেট
  const navigation = useNavigation();

  const fetchVideos = async (searchQuery) => {
    if (!searchQuery) {
      setVideos([]);
      return;
    }

    setIsLoading(true); // সার্চ শুরু হলে লোডিং শুরু
    try {
      const response = await fetch(
        `${BASE_URL}?part=snippet&maxResults=10&q=${searchQuery}&key=${API_KEY}&type=video`
      );
      const data = await response.json();
      setVideos(data.items);
    } catch (error) {
      console.error('ভিডিও লোড করতে সমস্যা:', error);
    } finally {
      setIsLoading(false); // ভিডিও লোড হয়ে গেলে লোডিং বন্ধ
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="YouTube ভিডিও খুঁজুন..."
        placeholderTextColor="#aaa"
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          fetchVideos(text);
        }}
      />

      {/* লোডিং স্পিনার */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id.videoId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.videoItem}
              onPress={() => navigation.navigate('YoutubePlayer', { videoId: item.id.videoId })}
            >
              <Image source={{ uri: item.snippet.thumbnails.medium.url }} style={styles.thumbnail} />
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.snippet.title}</Text>
                <Text style={styles.channel}>{item.snippet.channelTitle}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default YouTubeSearchPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    fontSize: 16,
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  videoItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  thumbnail: {
    width: 120,
    height: 80,
    borderRadius: 5,
  },
  textContainer: {
    flex: 1,
    marginLeft: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  channel: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
});