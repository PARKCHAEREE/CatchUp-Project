import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  SafeAreaView,
  TextInput,
  Platform, // 안드로이드 체크용
  StatusBar // 상단 상태바 높이 확인용
} from 'react-native';
import { Settings, Calendar, LogOut, ChevronRight, Plus } from 'lucide-react-native';
import { supabase } from '../supabase'; // 로그아웃 및 정보 조회를 위해 필요

// Props 타입 정의
interface MyPageScreenProps {
  userTags: string[];
  setUserTags: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function MyPageScreen({ userTags = ['장학금', '개발'], setUserTags }: MyPageScreenProps) {
  
  // 태그 입력 관련 상태
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [newTag, setNewTag] = useState("");

  // 유저 정보 상태 (로그인 정보 받아오기)
  const [userInfo, setUserInfo] = useState({ name: '김경기', major: '학부생' });

  // ✅ 화면 켜질 때 내 정보 가져오기
  useEffect(() => {
    const fetchUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata) {
        setUserInfo({
          name: user.user_metadata.full_name || '김경기',
          major: user.user_metadata.major || '전공 미선택'
        });
      }
    };
    fetchUserInfo();
  }, []);

  // ✅ 실제 로그아웃 기능 구현
  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          // App.tsx에서 상태 변화를 감지하여 자동으로 로그인 화면으로 이동합니다.
        }
      }
    ]); 
  };

  // ✅ 태그 추가 로직
  const handleAddTag = () => {
    if (newTag.trim()) {
      // 중복 방지
      if (!userTags.includes(newTag.trim())) {
        setUserTags([...userTags, newTag.trim()]);
      } else {
        Alert.alert("알림", "이미 등록된 태그입니다.");
      }
      setNewTag("");
      setIsInputVisible(false);
    } else {
      setIsInputVisible(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 1. 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🎓</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userSuffix}>님</Text>
            </View>
            <Text style={styles.userSub}>{userInfo.major}</Text>
          </View>
        </View>

        {/* 2. 맞춤 설정 (태그 추가 기능) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Settings size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>맞춤 설정</Text>
          </View>
          
          <View style={styles.tagContainer}>
            {/* 기존 태그 리스트 */}
            {userTags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}

            {/* 태그 추가 버튼 or 입력창 */}
            {isInputVisible ? (
              <View style={[styles.tag, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#4F46E5', paddingVertical: 2 }]}>
                <TextInput 
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={handleAddTag} // 엔터 누르면 추가
                  onBlur={() => { if(!newTag) setIsInputVisible(false); }} // 포커스 잃으면 닫기
                  placeholder="태그 입력"
                  placeholderTextColor="#94a3b8"
                  style={{ fontSize: 12, width: 80, padding: 0, color: '#1e293b' }}
                  autoFocus // 켜지자마자 키보드 올라옴
                  returnKeyType="done"
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.addTagBtn} onPress={() => setIsInputVisible(true)}>
                <Plus size={14} color="#94a3b8" />
                <Text style={styles.addTagText}>추가</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 3. 메뉴 리스트 */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Calendar size={20} color="#4F46E5" />
            </View>
            <Text style={styles.menuText}>캘린더 연동</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* 4. 로그아웃 버튼 */}
        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <LogOut size={20} color="#ef4444" />
            <Text style={[styles.menuText, { color: '#ef4444' }]}>로그아웃</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.versionText}>버전 정보 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ✅ Android 상태바 겹침 해결을 위한 paddingTop 설정
  container: { 
    flex: 1, 
    padding: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20 
  },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 30 },
  profileInfo: { marginLeft: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 4 },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  userSuffix: { fontSize: 14, color: '#64748b', marginLeft: 2, marginBottom: 2 },
  userSub: { fontSize: 14, color: '#4F46E5', fontWeight: 'bold' },
  sectionCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, 
  tag: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, justifyContent: 'center' },
  tagText: { color: '#4F46E5', fontSize: 12, fontWeight: 'bold' },
  addTagBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  addTagText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuText: { fontSize: 15, fontWeight: 'bold', color: '#475569' },
  logoutItem: { marginTop: 8 },
  versionText: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, marginTop: 20, marginBottom: 40 }
});