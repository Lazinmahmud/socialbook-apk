import React, { useState } from 'react';
import { Alert, TouchableOpacity, TextInput, Text, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { database } from './firebase'; // Adjust based on your Firebase setup

const ChatMessage = ({ item, receiverEmail, profilePicture, lastSeenMessage, unsendMessage, editMessage }) => {
  const [message, setMessage] = useState(item.message); // Store message for editing
  const [isEditing, setIsEditing] = useState(false); // Flag to toggle editing mode
  const [selectedImage, setSelectedImage] = useState(item.image); // Store selected image

  // Handle long press for unsend or edit options
  const handleLongPress = (messageId, senderEmail) => {
    SecureStore.getItemAsync('user-email').then((userEmail) => {
      if (userEmail === senderEmail) {
        Alert.alert(
          "Message Options",
          "What do you want to do with this message?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Unsend", onPress: () => unsendMessage(messageId) },
            { text: "Edit", onPress: () => handleEditMessage(messageId) }
          ]
        );
      }
    });
  };

  // Handle editing message
  const handleEditMessage = (messageId) => {
    setIsEditing(true); // Enable editing mode
  };

  // Send or update the message
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
          status: 'sending', // Default status
        };

        // If editing an existing message, update it
        if (isEditing) {
          // Update the existing message in the database
          database.ref(`Message_data/${conversationId}/${timestamp}`).update(newMessage, (error) => {
            if (!error) {
              // Message successfully updated
              setIsEditing(false); // Turn off editing mode
              setMessage(''); // Clear message input
              setSelectedImage(null); // Clear selected image

              // Scroll to the bottom
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            } else {
              alert('Failed to update message.');
            }
          });
        } else {
          // Send a new message
          setMessages((prevMessages) => [...prevMessages, newMessage]);

          // Save the new message to the server
          database.ref(`Message_data/${conversationId}/${timestamp}`).set(newMessage, (error) => {
            if (!error) {
              // Update the status to 'sent'
              database.ref(`Message_data/${conversationId}/${timestamp}`).update({ status: 'sent' });
              setMessage('');
              setSelectedImage(null);

              // Scroll to the bottom
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            } else {
              alert('Failed to send message.');
            }
          });
        }
      }
    } catch (error) {
      console.error('Error sending or updating message:', error);
    }
  };

  return (
    <View>
      <TouchableOpacity
        onLongPress={() => handleLongPress(item.id, item.senderEmail)}
        style={[styles.chatBubbleContainer, item.senderEmail === receiverEmail ? null : styles.userChat]}
      >
        {item.senderEmail === receiverEmail ? (
          <Image
            source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
            style={styles.userBubbleProfile}
          />
        ) : null}

        <View style={[styles.chatBubble, item.senderEmail !== receiverEmail ? styles.userChatBubble : null]}>
          {/* Display the message input if it's in edit mode */}
          <TextInput
            style={[styles.input, selectedImage ? styles.inputWithImage : null]}
            placeholder="Message..."
            value={isEditing ? message : item.message} // If editing, show the updated message, otherwise show the original
            onChangeText={setMessage} // Handle text input change
          />

          {/* If image is attached, display it */}
          {selectedImage && <Image source={{ uri: selectedImage.uri }} style={styles.messageImage} />}
        </View>
      </TouchableOpacity>

      {/* Status icons */}
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

      {/* Seen profile image */}
      {lastSeenMessage && item.id === lastSeenMessage.id && (
        <Image
          source={profilePicture ? { uri: profilePicture } : require('../assets/user.png')}
          style={styles.seenProfileImage}
        />
      )}
    </View>
  );
};

export default ChatMessage;