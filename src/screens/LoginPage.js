import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';

export default function LoginPage({ navigation }) {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [showPassword, setShowPassword] = useState(false);

const passwordInputRef = useRef(null); // পাসওয়ার্ড ইনপুটের জন্য রেফারেন্স

const auth = getAuth();

useEffect(() => {
const checkLoginStatus = async () => {
const storedEmail = await SecureStore.getItemAsync('user-email');
if (storedEmail) {
navigation.navigate('MainApp');
}
};
checkLoginStatus();
}, []);

const handleLogin = () => {
setLoading(true);

signInWithEmailAndPassword(auth, email, password)  
  .then((userCredential) => {  
    const user = userCredential.user;  
    SecureStore.setItemAsync('user-email', email)  
      .then(() => {  
        setLoading(false);  
        navigation.navigate('MainApp');  
      })  
      .catch(() => {  
        setLoading(false);  
        Alert.alert('Error', 'There was an error storing your email.');  
      });  
  })  
  .catch((error) => {  
    setLoading(false);  
    const errorCode = error.code;  

    let errorMessage = 'An error occurred. Please try again.';  
    switch (errorCode) {  
      case 'auth/user-disabled':  
        errorMessage = 'Socialbook has disabled your account.';  
        break;  
      case 'auth/invalid-credential':  
        errorMessage = 'Invalid email or password.';  
        break;  
      case 'auth/invalid-email':  
        errorMessage = 'Invalid email address.';  
        break;  
      case 'auth/user-not-found':  
        errorMessage = 'No account found with this email.';  
        break;  
      case 'auth/wrong-password':  
        errorMessage = 'Incorrect password.';  
        break;  
      case 'auth/too-many-requests':  
        errorMessage = 'Too many login attempts. Please try again later.';  
        break;  
      default:  
        errorMessage = 'An unexpected error occurred.';  
    }  

    Alert.alert('Login Failed', errorMessage);  
  });

};

return (
<ScrollView style={styles.container}>
<Image source={require('../assets/appIcon.png')} style={styles.logoImg} />

<TextInput  
    style={styles.input}  
    placeholder="Email"  
    placeholderTextColor="#888"  
    value={email}  
    onChangeText={setEmail}  
    keyboardType="email-address"  
    autoCapitalize="none"  
    returnKeyType="next"  
    onSubmitEditing={() => passwordInputRef.current.focus()} // Enter প্রেস করলে পাসওয়ার্ড ইনপুটে ফোকাস হবে  
  />  

  <View style={styles.passwordContainer}>  
    <TextInput  
      ref={passwordInputRef} // পাসওয়ার্ড ইনপুটের রেফারেন্স  
      style={styles.passwordInput}  
      placeholder="Password"  
      placeholderTextColor="#888"  
      value={password}  
      onChangeText={setPassword}  
      secureTextEntry={!showPassword}  
      returnKeyType="done"  
    />  
    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>  
      <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={24} color="#888" />  
    </TouchableOpacity>  
  </View>  

  {loading ? (  
    <ActivityIndicator size="large" color="#000" />  
  ) : (  
    <TouchableOpacity style={styles.button} onPress={handleLogin}>  
      <Text style={styles.buttonText}>Log in</Text>  
    </TouchableOpacity>  
  )}  

  <TouchableOpacity onPress={() => navigation.navigate('SignUpPage')}>  
    <View style={styles.createAcButon}>  
      <Text style={styles.linkText}>Create new account</Text>  
    </View>  
  </TouchableOpacity>  
</ScrollView>

);
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    
    backgroundColor: '#EEF7FE',
    padding: 20,
  },
  logoImg: {
    marginLeft: 'auto',
    marginRight: 'auto',
    width: 80,
    height: 80,
    borderRadius: 50,
    marginBottom: 50,
    marginTop: 100,
    elevation: 5,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
    borderColor: '#CBD2DA',
    borderWidth: 1,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderColor: '#CBD2DA',
    borderWidth: 1,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  button: {
    width: '100%',
    height: 45,
    backgroundColor: '#000',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createAcButon: {
    width: '100%',
    height: 45,
    borderColor: '#007bff',
    borderWidth: 1,
    borderRadius: 40,
    marginTop: 50,
    
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    color: '#007bff',
    fontSize: 16,
    textAlign: 'center',
  },
});