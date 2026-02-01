import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, StatusBar } from 'react-native';
import { GraduationCap, Calendar as CalendarIcon, User, Plus, Bookmark } from 'lucide-react-native';
import { Session } from '@supabase/supabase-js'; 
import { supabase } from './supabase'; 

// 화면들 import
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import MyPageScreen from './screens/MyPageScreen';
import AuthScreen from './screens/AuthScreen'; 
import ScrapScreen from './screens/ScrapScreen';
import AddScheduleModal from './modals/AddScheduleModal';
import Header from './components/Header';

type TabType = 'home' | 'calendar' | 'scrap' | 'mypage';

// 유저 정보 타입 정의
export interface UserInfo {
  name: string;
  major: string;
  grade: number;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null); // 로그인 상태
  const [activeTab, setActiveTab] = useState<TabType>('home'); 
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [userTags, setUserTags] = useState<string[]>(['장학금', '개발']);
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // 유저 정보를 담을 상태 추가
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', major: '', grade: 0 });

  useEffect(() => {
    // 1. 앱 켜자마자 로그인 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) extractUserInfo(session); // 세션이 있으면 정보 추출
    });

    // 2. 로그인/로그아웃 실시간 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        extractUserInfo(session); // 로그인 시 정보 추출
      } else {
        setUserInfo({ name: '', major: '', grade: 0 }); // 로그아웃 시 초기화
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 세션에서 유저 정보(이름, 학과) 추출하는 함수
  const extractUserInfo = (session: Session) => {
    if (session?.user?.user_metadata) {
      const { full_name, major } = session.user.user_metadata;
      setUserInfo({
        name: full_name || '학우', 
        major: major || '미설정',
        grade: 3 // 학년은 입력받지 않았으므로 기본값 설정
      });
    }
  };

  // 로그인이 안 되어 있으면 'AuthScreen'을 보여줌
  if (!session) {
    return <AuthScreen />;
  }

  // --- 로그인 성공 시 메인 앱 화면 ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더는 홈 탭에서만 보임 */}
      {activeTab === 'home' && (
        <Header keyword={searchKeyword} setKeyword={setSearchKeyword} />
      )}

      {/* 메인 콘텐츠 영역 */}
      <View style={styles.content}>
        {activeTab === 'home' && (
          <HomeScreen 
            userTags={userTags} 
            searchKeyword={searchKeyword} 
            userInfo={userInfo} //  홈 화면에 정보 전달
          />
        )}
        {activeTab === 'calendar' && <CalendarScreen />}
        {activeTab === 'scrap' && <ScrapScreen />}
        {activeTab === 'mypage' && (
          <MyPageScreen 
            userTags={userTags} 
            setUserTags={setUserTags} 
            userInfo={userInfo} //  마이페이지에 정보 전달
          />
        )}
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