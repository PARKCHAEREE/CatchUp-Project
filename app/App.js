import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, TouchableOpacity, Text, StatusBar } from 'react-native';
import { GraduationCap, Calendar as CalendarIcon, User, Plus } from 'lucide-react-native';

// 1. 나누신 폴더 경로에 맞춰 임포트 (파일 이름 오타 주의!)
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import MyPageScreen from './screens/MyPageScreen';
import AddScheduleModal from './modals/AddScheduleModal';
import Header from './components/Header'; // 헤더 추가

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 현재 활성화된 탭
  const [isAddModalVisible, setIsAddModalVisible] = useState(false); // 일정 추가 모달 상태
  const [userTags, setUserTags] = useState(['장학금', '개발']); // 전역 맞춤 태그 상태
  const [searchKeyword, setSearchKeyword] = useState(''); // 검색어 상태

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* --- 상단 헤더 (홈 화면일 때만 표시하거나 공통 사용) --- */}
      {activeTab === 'home' && (
        <Header keyword={searchKeyword} setKeyword={setSearchKeyword} />
      )}

      {/* --- 메인 컨텐츠 영역 --- */}
      <View style={styles.content}>
        {activeTab === 'home' && (
          <HomeScreen userTags={userTags} searchKeyword={searchKeyword} />
        )}
        {activeTab === 'calendar' && (
          <CalendarScreen />
        )}
        {activeTab === 'mypage' && (
          <MyPageScreen userTags={userTags} setUserTags={setUserTags} />
        )}
      </View>

      {/* --- 하단 네비게이션 탭바 (기획서 디자인 반영) --- */}
      <View style={styles.navbar}>
        {/* 홈 탭 */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('home')}
        >
          <GraduationCap 
            size={24} 
            color={activeTab === 'home' ? '#4F46E5' : '#cbd5e1'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'home' ? '#4F46E5' : '#cbd5e1' }]}>홈</Text>
        </TouchableOpacity>

        {/* 캘린더 탭 */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('calendar')}
        >
          <CalendarIcon 
            size={24} 
            color={activeTab === 'calendar' ? '#4F46E5' : '#cbd5e1'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'calendar' ? '#4F46E5' : '#cbd5e1' }]}>캘린더</Text>
        </TouchableOpacity>

        {/* 중앙 FAB: 일정 추가 버튼 */}
        <View style={styles.fabWrapper}>
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => setIsAddModalVisible(true)}
          >
            <Plus size={32} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.navText, { marginTop: 4, color: '#cbd5e1' }]}>일정추가</Text>
        </View>

        {/* 공백용 (디자인 밸런스) */}
        <View style={{ width: 20 }} />

        {/* 마이페이지 탭 */}
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => setActiveTab('mypage')}
        >
          <User 
            size={24} 
            color={activeTab === 'mypage' ? '#4F46E5' : '#cbd5e1'} 
          />
          <Text style={[styles.navText, { color: activeTab === 'mypage' ? '#4F46E5' : '#cbd5e1' }]}>마이</Text>
        </TouchableOpacity>
      </View>

      {/* --- 일정 추가 모달 --- */}
      <AddScheduleModal 
        visible={isAddModalVisible} 
        onClose={() => setIsAddModalVisible(false)} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  content: { 
    flex: 1 
  },
  navbar: { 
    flexDirection: 'row', 
    height: 80, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderColor: '#f1f5f9', 
    justifyContent: 'space-around', 
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 10
  },
  navItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 60
  },
  navText: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    marginTop: 4 
  },
  fabWrapper: {
    alignItems: 'center',
    zIndex: 10,
  },
  fab: { 
    width: 60, 
    height: 60, 
    backgroundColor: '#4F46E5', 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: -40, // 탭바 위로 툭 튀어나오게
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10
  }
});