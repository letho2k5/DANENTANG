// /components/ui/Sidebar.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuthActions } from '../../hooks/useAuthActions'; // IMPORT MỚI

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75; 

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
}

const menuItems = [
    { name: 'Home', route: 'index', icon: 'home-outline' },
    { name: 'Cart', route: 'cart', icon: 'cart-outline' },
    { name: 'Favorite', route: 'favourite', icon: 'heart-outline' },
    { name: 'Order', route: 'orders', icon: 'receipt-outline' },
    { name: 'Profile', route: 'profile', icon: 'person-outline' },
];


export function Sidebar({ isVisible, onClose }: SidebarProps) {
  const router = useRouter(); 
  const { handleLogout } = useAuthActions(); // Lấy hàm đăng xuất

  const handleNavigate = (route: string) => {
      // Đã sửa lỗi: Dùng đường dẫn tuyệt đối bắt đầu bằng /
      router.push(`../(tabs)/${route}`); 
      onClose(); 
  };

  const confirmLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive", 
          onPress: () => {
            onClose(); // Đóng sidebar ngay lập tức
            handleLogout(); // Thực hiện đăng xuất
          } 
        },
      ],
    );
  }

  return (
    <Modal
      animationType="fade" 
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={onClose} 
      >
        <View style={styles.sidebarContainer} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {/* Vòng lặp hiển thị các mục menu */}
          {menuItems.map((item) => (
            <TouchableOpacity 
                key={item.route}
                style={styles.menuItem} 
                onPress={() => handleNavigate(item.route)}
            >
                <Ionicons name={item.icon as any} size={20} style={styles.menuIcon} />
                <Text style={styles.menuText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
          
          {/* Mục: Logout */}
          <TouchableOpacity 
            style={[styles.menuItem, styles.logoutItem]}
            onPress={confirmLogout} // GỌI HÀM CONFIRM LOGOUT
          >
            <Ionicons name="log-out-outline" size={20} style={[styles.menuIcon, { color: 'red' }]} />
            <Text style={[styles.menuText, { color: 'red' }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: SIDEBAR_WIDTH, 
    backgroundColor: 'white',
    padding: 16,
    height: '100%', 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 30, 
    paddingHorizontal: 8,
  },
  menuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF7A00',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuIcon: {
    marginRight: 15,
    color: '#333',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
  logoutItem: {
    marginTop: 20,
    borderBottomWidth: 0,
  }
});