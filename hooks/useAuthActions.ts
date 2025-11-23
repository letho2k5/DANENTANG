import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { auth } from "../services/firebase";

/**
 * Hook để xử lý các hành động liên quan đến Authentication (Đăng nhập/Đăng xuất).
 * @returns {handleLogout: () => Promise<void>}
 */
export function useAuthActions() {
    const router = useRouter();

    async function handleLogout() {
        try {
            // TODO: nếu bạn có dùng AsyncStorage lưu "UserPrefs" thì clear ở đây
            await auth.signOut();
            // Điều hướng đến màn hình đăng nhập sau khi đăng xuất thành công
            router.replace("/(auth)/login");
        } catch (e: any) {
            // Sử dụng Alert để thông báo lỗi đăng xuất
            Alert.alert("Error", e.message ?? "Logout failed");
        }
    }

    return { handleLogout };
}