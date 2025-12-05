import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function FloatingChatButton() {
  const router = useRouter();

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => router.push('/chatbot')} // Điều hướng sang trang chatbot
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name="robot-happy-outline" size={28} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 25,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    zIndex: 9999, // Luôn nổi lên trên cùng
  },
});