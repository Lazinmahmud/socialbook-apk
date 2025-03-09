const renderUserItem = ({ item }) => {
  if (item.Email === userData?.Email || item.activeStatus !== true) {
    return null; // Skip rendering this user if the email matches or activeStatus is not true
  }

  return (
    <TouchableOpacity
      style={styles.userBox}
      onPress={() =>
        navigation.navigate('MessageViewPage', {
          profilePicture: item.profilePicture
            ? item.profilePicture
            : '../assets/user.png',
          fullName: `${item.firstName} ${item.lastName}`, // পুরো নাম
          email: item.Email, // Gmail পাঠানো
        })
      }
    >
      <View style={styles.imageWrapper}>
        <Image
          source={item.profilePicture ? { uri: item.profilePicture } : require('../assets/user.png')}
          style={[styles.userImg, offWhiteColor]}
        />
        <View style={[styles.onlineStatus, dynamicBorderColor]} />
      </View>
      <Text style={[styles.usernameText, dynamicTextColor]}>{item.firstName}</Text>
    </TouchableOpacity>
  );
};