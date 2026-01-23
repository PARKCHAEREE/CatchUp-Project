import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, StatusBar, Alert } from 'react-native';
import { GraduationCap, Calendar as CalendarIcon, User, Plus, Bookmark } from 'lucide-react-native';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './supabase'; 

// 화면들 import
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import MyPageScreen from './screens/MyPageScreen';
import AuthScreen from './screens/AuthScreen'; // ✅ 방금 만든 파일 연결!
import ScrapScreen from './screens/ScrapScreen';
import AddScheduleModal from './modals/AddScheduleModal';
import Header from './components/Header';

type TabType = 'home' | 'calendar' | 'scrap' | 'mypage';

export default function App() {
  const [session, setSession] = useState<Session | null>(null); // 로그인 상태
  const [activeTab, setActiveTab] = useState<TabType>('home'); 
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [userTags, setUserTags] = useState<string[]>(['장학금', '개발']);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  useEffect(() => {
    // 1. 앱 켜자마자 로그인 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2. 로그인/로그아웃 실시간 감지
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  // 🚨 [핵심] 로그인이 안 되어 있으면 'AuthScreen'을 보여줘라!
  if (!session) {
    return <AuthScreen />;
  }

  // --- 로그인 성공 시 아래 화면(메인 앱)이 보입니다 ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더는 홈 탭에서만 보임 */}
      {activeTab === 'home' && (
        <Header keyword={searchKeyword} setKeyword={setSearchKeyword} />
      )}

      {/* 메인 콘텐츠 영역 */}
      <View style={styles.content}>
        {activeTab === 'home' && <HomeScreen userTags={userTags} searchKeyword={searchKeyword} />}
        {activeTab === 'calendar' && <CalendarScreen />}
        {activeTab === 'scrap' && <ScrapScreen />} {/* ✅ 보관함 화면 연결 */}
        {activeTab === 'mypage' && <MyPageScreen userTags={userTags} setUserTags={setUserTags} />}
      </View>

      {/* 하단 탭바 (5분할) */}
      <View style={styles.navbar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <GraduationCap size={24} color={activeTab === 'home' ? '#4F46E5' : '#cbd5e1'} />
          <Text style={[styles.navText, { color: activeTab === 'home' ? '#4F46E5' : '#cbd5e1' }]}>홈</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('calendar')}>
          <CalendarIcon size={24} color={activeTab === 'calendar' ? '#4F46E5' : '#cbd5e1'} />
          <Text style={[styles.navText, { color: activeTab === 'calendar' ? '#4F46E5' : '#cbd5e1' }]}>캘린더</Text>
        </TouchableOpacity>

        {/* 중앙 버튼 */}
        <View style={styles.centerBtnWrapper}>
          <TouchableOpacity style={styles.centerBtn} onPress={() => setIsAddModalVisible(true)}>
            <Plus size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('scrap')}>
          <Bookmark size={24} color={activeTab === 'scrap' ? '#4F46E5' : '#cbd5e1'} />
          <Text style={[styles.navText, { color: activeTab === 'scrap' ? '#4F46E5' : '#cbd5e1' }]}>보관함</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('mypage')}>
          <User size={24} color={activeTab === 'mypage' ? '#4F46E5' : '#cbd5e1'} />
          <Text style={[styles.navText, { color: activeTab === 'mypage' ? '#4F46E5' : '#cbd5e1' }]}>마이</Text>
        </TouchableOpacity>
      </View>

      <AddScheduleModal visible={isAddModalVisible} onClose={() => setIsAddModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1 },
  navbar: { 
    flexDirection: 'row', 
    height: 90, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderColor: '#f1f5f9', 
    alignItems: 'center',
    paddingBottom: 20,
  },
  navItem: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    height: '100%',
  },
  navText: { fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  centerBtnWrapper: {
    flex: 1, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25, 
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
  }
});