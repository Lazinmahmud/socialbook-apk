import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, FlatList, BackHandler, ActivityIndicator, Alert, Pressable, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as ImagePicker from 'expo-image-picker';
import { database } from '../components/firebaseConfig';

export default function MessageViewPage({ route, navigation }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);  // লোডিং স্টেট
  const [selectedImage, setSelectedImage] = useState(null);
  const { profilePicture, fullName, email: receiverEmail } = route.params;
  const flatListRef = useRef(null);
  
  
  // মেসেজ দেখার সময় স্ট্যাটাস আপডেট করা
  useEffect(() => {
    const fetchMessages = async () => {
      const senderEmail = await SecureStore.getItemAsync('user-email');
      if (senderEmail) {
        const conversationId = generateConversationId(senderEmail, receiverEmail);
        const messageRef = database.ref('Message_data/' + conversationId);

        messageRef.on('value', (snapshot) => {
          const fetchedMessages = [];
          snapshot.forEach((child) => {
            const messageData = { ...child.val(), id: child.key };
            fetchedMessages.push(messageData);
          });
          setMessages(fetchedMessages);
          setLoading(false);
        });
      }
    };
    fetchMessages();

    const backAction = () => {
      navigation.goBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => {
      database.ref('Message_data').off();
      backHandler.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = async () => {
  if (message.trim().length === 0 && !selectedImage) {
    alert('Please enter a message or select an image!');
    return;
  }

  try {
    const senderEmail = await SecureStore.getItemAsync('user-email');
    if (senderEmail) {
      const conversationId = generateConversationId(senderEmail, receiverEmail);
      const timestamp = Date.now().toString();

      const newMessage = {
        senderEmail,
        receiverEmail,
        message,
        image: selectedImage ? selectedImage.uri : null,
        timestamp: new Date().toISOString(),
        status: 'sending', // ডিফল্ট স্ট্যাটাস
      };

      // মেসেজ সেন্ড করার আগে স্ট্যাটাস 'sending' সেট করুন
      setMessages((prevMessages) => [...prevMessages, newMessage]);

      // মেসেজ সার্ভারে সংরক্ষণ করুন
      database.ref(`Message_data/${conversationId}/${timestamp}`).set(newMessage, (error) => {
        if (!error) {
          // মেসেজ সফলভাবে সংরক্ষিত হলে স্ট্যাটাস 'sent' সেট করুন
          database.ref(`Message_data/${conversationId}/${timestamp}`).update({ status: 'sent' });
          setMessage('');
          setSelectedImage(null);

          // মেসেজ সেন্ড হওয়ার পর স্ক্রল নিচে নামানো
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          alert('Failed to send message.');
        }
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

useEffect(() => {
  const markMessagesAsSeen = async () => {
    const senderEmail = await SecureStore.getItemAsync('user-email');
    if (senderEmail) {
      const conversationId = generateConversationId(senderEmail, receiverEmail);
      const messageRef = database.ref(`Message_data/${conversationId}`);

      // রিসিভার মেসেজ দেখলে স্ট্যাটাস আপডেট করুন
      messageRef.once('value', (snapshot) => {
        snapshot.forEach((child) => {
          const messageData = child.val();
          if (messageData.receiverEmail === senderEmail && messageData.status !== 'seen') {
            child.ref.update({ status: 'seen' });
          }
        });
      });
    }
  };

  // রিসিভার চ্যাট স্ক্রিনে প্রবেশ করলে মেসেজ স্ট্যাটাস আপডেট করুন
  markMessagesAsSeen();

  return () => {
    // Cleanup
    database.ref('Message_data').off();
  };
}, [receiverEmail]); 

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();

  // ✅ সময় বের করা (১২ ঘণ্টার ফরম্যাট)
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // ১২-ঘণ্টা ফরম্যাট কনভার্ট

  const formattedTime = `${hours}:${minutes < 10 ? "0" + minutes : minutes} ${ampm}`;

  // ✅ যদি আজকের দিন হয়
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return formattedTime;
  }

  // ✅ যদি গতকালের দিন হয়
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return `Yesterday at ${formattedTime}`;
  }

  // ✅ যদি আরও পুরোনো হয় (দিনের নাম সহ দেখাবে)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[date.getDay()];
  return `${dayName} at ${formattedTime}`;
};

useEffect(() => {
  const updateMessageStatus = async () => {
    const senderEmail = await SecureStore.getItemAsync('user-email');
    if (senderEmail) {
      const conversationId = generateConversationId(senderEmail, receiverEmail);
      const messageRef = database.ref(`Message_data/${conversationId}`);

      // রিসিভার মেসেজ দেখলে স্ট্যাটাস আপডেট করুন
      messages.forEach((msg) => {
        if (msg.receiverEmail === senderEmail && msg.status !== 'seen') {
          messageRef.child(msg.timestamp).update({ status: 'seen' });
        }
      });
    }
  };

  updateMessageStatus();
}, [messages]);

  const generateConversationId = (email1, email2) => {
    // স্পেস এবং অন্যান্য অবৈধ চিহ্ন প্রতিস্থাপন করা
    const sanitizedEmail1 = email1.replace(/[^a-zA-Z0-9_]/g, '');
    const sanitizedEmail2 = email2.replace(/[^a-zA-Z0-9_]/g, '');

    return [sanitizedEmail1, sanitizedEmail2].sort().join('_');
  };

  const handleLongPress = (messageId, senderEmail) => {
  SecureStore.getItemAsync('user-email').then((userEmail) => {
    if (userEmail === senderEmail) {
      Alert.alert(
        "Unsend Message",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Unsend", onPress: () => unsendMessage(messageId) }
        ]
      );
    }
  });
};

  const unsendMessage = async (messageId) => {
  try {
    const senderEmail = await SecureStore.getItemAsync('user-email');
    if (senderEmail) {
      const conversationId = generateConversationId(senderEmail, receiverEmail);
      const messageRef = database.ref(`Message_data/${conversationId}/${messageId}`);

      // মেসেজ ডিলিট করুন
      messageRef.remove()
        .then(() => {
          console.log('Message deleted successfully');
        })
        .catch((error) => {
          console.error('Error deleting message:', error);
        });
    }
  } catch (error) {
    console.error('Error unsending message:', error);
  }
};


  const renderItem = ({ item, index }) => {
  // ✅ Timestamp ফরম্যাট ঠিক করা
  const currentTimestamp = item.timestamp ? new Date(item.timestamp).getTime() : 0;
  const previousTimestamp = index > 0 && messages[index - 1].timestamp 
    ? new Date(messages[index - 1].timestamp).getTime() 
    : 0;

  // ✅ ২ মিনিট পর পর টাইমস্ট্যাম্প দেখাবে
  const shouldShowTimestamp = index === 0 || (currentTimestamp - previousTimestamp >= 2 * 60 * 1000);

  // ✅ সর্বশেষ "seen" হওয়া মেসেজ খুঁজে বের করা
  const lastSeenMessageIndex = messages
    .slice()
    .reverse()
    .findIndex((msg) => msg.status === "seen");

  const lastSeenMessage = lastSeenMessageIndex !== -1 
    ? messages[messages.length - 1 - lastSeenMessageIndex] 
    : null;

  return (
    <View style={styles.messageWrapper}>
      {/* ✅ ২ মিনিট পর পর টাইমস্ট্যাম্প দেখাবে */}
      {shouldShowTimestamp && (
        <View style={styles.timestampWrapper}>
          <Text style={styles.messageTime}>{formatTime(currentTimestamp)}</Text>
        </View>
      )}

      <Pressable
        onLongPress={() => handleLongPress(item.id, item.senderEmail)}
        style={[
          styles.chatBubbleContainer,
          item.senderEmail === receiverEmail ? null : styles.userChat
        ]}
      >
        {item.senderEmail === receiverEmail ? (
          <Image
            source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
            style={styles.userBubbleProfile}
          />
        ) : null}

        <View style={[styles.chatBubble, item.senderEmail !== receiverEmail ? styles.userChatBubble : null]}>
          {item.message ? (
            <Text style={[styles.messageText, item.senderEmail !== receiverEmail ? styles.userMessageText : null]}>
              {item.message}
            </Text>
          ) : null}
          {item.image && <Image source={{ uri: item.image }} style={styles.messageImage} />}
        </View> 

        {/* ✅ সব মেসেজের নিচে "sent" & "sending" আইকন দেখাবে */}
        {item.senderEmail !== receiverEmail && item.status !== "seen" && (
          <Ionicons
            name={
              item.status === "sending"
                ? "checkmark-outline"
                : item.status === "sent"
                ? "checkmark-done-outline"
                : "ellipse-outline"
            }
            size={16}
            color={item.status === "sending" ? "gray" : item.status === "sent" ? "#1876f2" : "#888"}
            style={styles.messageStatusIcon}
          />
        )}

        {/* ✅ সর্বশেষ "seen" হওয়া মেসেজের নিচে প্রোফাইল পিক দেখাবে */}
        {lastSeenMessage && item.id === lastSeenMessage.id && (
          <Image
            source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
            style={styles.seenProfileImage}
          />
        )}
      </Pressable>
    </View>
  );
};

  return (
    <View style={[styles.container]}>
      {/* Header Section */}
      <View style={[styles.header]}>
        <TouchableOpacity style={styles.backIcon} onPress={() => navigation.goBack()}>
          <Ionicons style={[styles.none]} name="arrow-back-outline" size={27} color="black" />
        </TouchableOpacity>
        <Image
          source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
          style={styles.headerProfile}
        />
        <View style={styles.headerContent}>
          <Text style={[styles.headerName]}>{fullName}</Text>
  <Text style={styles.typingIndicator}>Active now</Text>
        </View>
      </View>

      {/* FlatList for Messages */}
      {loading ? (
        <ActivityIndicator size="large" color="#000" style={styles.loadingIndicator} />
      ) : (
        <FlatList
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          style={styles.mainContainer}
          ref={flatListRef}
          ListHeaderComponent={() => (
            <View style={styles.dataHeaderContainer}>
              <Image
                source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
                style={styles.userInfoProfile}
              />
              <Text style={[styles.chatDataUseraname]}>{fullName}</Text>
              <Text style={styles.fdConnectText}>You're not friends on Socialbook</Text>
            </View>
          )}
        />
      )}

      {/* Bottom Bar Section */}
      <View style={[styles.bottomBar]}>
        <TouchableOpacity style={[styles.iconContainer]}>
          <Ionicons style={[styles.none]} name="add" size={24} color="black" />
        </TouchableOpacity>

        {/* Image Preview in Input Box */}
        <View style={styles.inputContainer}>
         <TextInput
  style={[styles.input, selectedImage ? styles.inputWithImage : null]}
  placeholder="Message..."
  value={message}
  onChangeText={setMessage} // এখানে handleTyping ফাংশন কল হচ্ছে
/>
          {selectedImage && (
            <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
          )}
        </View>

        <TouchableOpacity style={styles.iconContainer} onPress={sendMessage}>
          <Ionicons name="send" size={24}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EAEBED',
    
  },
  header: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backIcon: {
    padding: 3,
  },
  headerProfile: {
    width: 37,
    height: 37,
    borderRadius: 50,
    marginLeft: 10,
    backgroundColor: '#efefef',
    borderWidth: 0.9,
    borderColor: '#ccc',
  },
  headerContent: {
    marginLeft: 10,
  },
  headerName: {
    fontSize: 16,
    width: 125,
  },
  headerUserStatus: {
    color: 'gray',
  },
  headerIconContainer: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  chatBubbleContainer: {
    marginVertical: 5,
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  chatBubble: {
    maxWidth: '75%',
    padding: 10,
    borderRadius: 15,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 5,
    elevation: 1.1,
    borderColor: '#fff',
  },
  userBubbleProfile:{
    borderRadius: 50,
    width: 30,
    height: 30,
    backgroundColor: '#D4D4D4',
  },
  userChat: {
    alignItems: 'flex-end',
  },
  userChatBubble: {
    backgroundColor: '#D8FDD2',
    marginLeft: 'auto',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: '#EAEBED',
    marginTop: 'auto',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    width: '72%',
  },
  input: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 0,
  },
  inputWithImage: {
    paddingRight: 50, // Leave space for the image inside the input
  },
  sendButton: {
    backgroundColor: 'black',
  },
  messageStatusIcon: {
    marginTop: 5,
    alignSelf: 'flex-end',
    fontSize: 12,
  },
  loadingIndicator: {
    marginTop: 100,
  },
  messageImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginTop: 5,
  },
  previewImage: {
    position: 'absolute',
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 5,
  },
  messageText:{
    fontSize: 16,
  },
  messageStatusProfile: {
  width: 17,
  height: 17,
  borderRadius: 9,
  borderColor: '#ccc',
  borderWidth: 0.6,
},
messageTime: {
  fontSize: 11,
  color: '#888',
  marginTop: 4,
},
dataHeaderContainer:{
  width: '100%',
  paddingpadding: 10,
  marginTop: 10,
  marginBottom: 20,
},
userInfoProfile:{
  width: 80,
  height: 80,
  borderRadius: 50,
  marginLeft: 'auto',
  marginRight: 'auto',
  backgroundColor: '#ccc',
},
chatDataUseraname:{
  fontWeight: 'bold',
  marginLeft: 'auto',
  marginRight: 'auto',
  marginTop: 10,
  fontSize: 20,
  textAlign: 'center',
},
fdConnectText:{
  marginLeft: 'auto',
  marginRight: 'auto',
  textAlign: 'center',
  fontSize: 14,
  color: '#808080',
},
timestampWrapper: {
    alignSelf: 'center',
    marginBottom: 5,
  },
seenProfileImage: {
  width: 16,
  height: 16,
  borderRadius: 8,
  marginLeft: 'auto',
},
});