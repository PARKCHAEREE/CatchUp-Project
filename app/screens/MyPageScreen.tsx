import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  SafeAreaView,
  TextInput,
  Platform, 
  StatusBar 
} from 'react-native';
import { Settings, Calendar, LogOut, ChevronRight, Plus } from 'lucide-react-native';
import { supabase } from '../supabase';

// userInfo를 부모(App.tsx)로부터 받아오도록 타입 정의
interface MyPageScreenProps {
  userTags: string[];
  setUserTags: React.Dispatch<React.SetStateAction<string[]>>;
  userInfo: {
    name: string;
    major: string;
    grade: number;
  };
}

export default function MyPageScreen({ userTags = [], setUserTags, userInfo }: MyPageScreenProps) {
  
  // 태그 입력 관련 상태
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [newTag, setNewTag] = useState("");

  // 로그아웃 함수
  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        style: 'destructive',
        onPress: async () => await supabase.auth.signOut()
      }
    ]); 
  };

  //  태그 추가 함수
  const handleAddTag = () => {
    if (newTag.trim()) {
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

  // 태그 삭제 함수 (수정 기능)
  const handleRemoveTag = (tagToRemove: string) => {
    Alert.alert("태그 삭제", `'${tagToRemove}' 태그를 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", onPress: () => setUserTags(userTags.filter(t => t !== tagToRemove)) }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 프로필 카드 */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🎓</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              {/* 받아온 userInfo 정보 사용 */}
              <Text style={styles.userName}>{userInfo.name}</Text>
              <Text style={styles.userSuffix}>님</Text>
            </View>
            {/* 학년 정보가 있으면 표시 */}
            <Text style={styles.userSub}>{userInfo.major} {userInfo.grade ? `${userInfo.grade}학년` : ''}</Text>
          </View>
        </View>

        {/* 맞춤 설정 (태그 추가/삭제) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Settings size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>관심 키워드 (클릭하여 삭제)</Text>
          </View>
          
          <View style={styles.tagContainer}>
            {/* 기존 태그 리스트 (클릭 시 삭제) */}
            {userTags.map((tag, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.tag} 
                onPress={() => handleRemoveTag(tag)}
              >
                <Text style={styles.tagText}>#{tag}</Text>
              </TouchableOpacity>
            ))}

            {/* 태그 추가 버튼 or 입력창 */}
            {isInputVisible ? (
              <View style={[styles.tag, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#4F46E5', paddingVertical: 2 }]}>
                <TextInput 
                  value={newTag}
                  onChangeText={setNewTag}
                  onSubmitEditing={handleAddTag}
                  onBlur={() => { if(!newTag) setIsInputVisible(false); }}
                  placeholder="태그 입력"
                  placeholderTextColor="#94a3b8"
                  style={{ fontSize: 12, width: 80, padding: 0, color: '#1e293b' }}
                  autoFocus
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

        {/* 메뉴 리스트 */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Calendar size={20} color="#4F46E5" />
            </View>
            <Text style={styles.menuText}>캘린더 연동</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* 로그아웃 버튼 */}
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