import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView } from 'react-native';
import { Settings, Calendar, LogOut, ChevronRight, Plus } from 'lucide-react-native';

const USER_MAJOR = "컴퓨터공학과";

export default function MyPageScreen({ userTags = ['장학금', '개발'], setUserTags }) {
  
  const handleLogout = () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?"); 
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 1. 프로필 카드 [cite: 69, 70] */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍🎓</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>김대학</Text>
              <Text style={styles.userSuffix}>님</Text>
            </View>
            <Text style={styles.userSub}>{USER_MAJOR} 3학년</Text>
          </View>
        </View>

        {/* 2. 맞춤 설정 [cite: 71, 72] */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Settings size={18} color="#1e293b" />
            <Text style={styles.sectionTitle}>맞춤 설정</Text>
          </View>
          <View style={styles.tagContainer}>
            {userTags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.addTagBtn}>
              <Plus size={14} color="#94a3b8" />
              <Text style={styles.addTagText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. 메뉴 리스트  */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Calendar size={20} color="#4F46E5" />
            </View>
            <Text style={styles.menuText}>캘린더 연동</Text>
          </View>
          <ChevronRight size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* 4. 로그아웃 버튼 [cite: 74] */}
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
  container: { flex: 1, padding: 20 },
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
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
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