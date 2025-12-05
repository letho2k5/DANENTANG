import React, { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sendMessageToGemini } from '../services/chatService';
import { auth } from '../services/firebase';

export default function ChatbotScreen() {
  const [messages, setMessages] = useState([{ id: '0', text: 'Xin chào! Mình có thể giúp gì cho bạn?', sender: 'bot' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const user = auth.currentUser; // Lấy user hiện tại

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { id: Date.now().toString(), text: userMsg, sender: 'user' }]);
    setInput('');
    setLoading(true);

    const reply = await sendMessageToGemini(userMsg, user?.uid || 'guest', user?.displayName || 'Bạn');
    
    setMessages(prev => [...prev, { id: (Date.now()+1).toString(), text: reply, sender: 'bot' }]);
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Trợ lý AI 🤖</Text></View>
      
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.msg, item.sender === 'user' ? styles.userMsg : styles.botMsg]}>
            <Text style={{ color: item.sender === 'user' ? '#fff' : '#000' }}>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 10 }}
      />
      
      {loading && <Text style={{marginLeft: 20, fontStyle:'italic'}}>Đang soạn tin...</Text>}
      
      <View style={styles.inputArea}>
        <TextInput style={styles.input} value={input} onChangeText={setInput} placeholder="Nhập tin nhắn..." />
        <TouchableOpacity onPress={handleSend} style={styles.btn}><Text style={{color:'#fff'}}>Gửi</Text></TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f2' },
  header: { padding: 16, paddingTop: 50, backgroundColor: '#fff', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ddd' },
  title: { fontSize: 18, fontWeight: 'bold' },
  msg: { padding: 10, borderRadius: 10, maxWidth: '80%', marginBottom: 10 },
  userMsg: { alignSelf: 'flex-end', backgroundColor: '#ff6b6b' },
  botMsg: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  inputArea: { flexDirection: 'row', padding: 10, backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 15, height: 60 },
  btn: { marginLeft: 10, backgroundColor: '#ff6b6b', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 20 }
});