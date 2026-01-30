import React, { useState, useEffect } from 'react';
import { 
  ScrollView, View, Text, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Alert, Modal, Linking, SafeAreaView 
} from 'react-native';
import { X, ExternalLink } from 'lucide-react-native';
import { supabase } from '../supabase'; 

import MajorPickCard from '../components/MajorPickCard';
import NoticeCard from '../components/NoticeCard';
import CategoryFilter from '../components/CategoryFilter';

// 🚨 로그인 정보 가상 데이터 (나중에 실제 로그인 데이터로 교체하세요)
const MY_DEPT_CATEGORY = "AI컴공"; // 크롤러가 저장하는 내 학과 카테고리명
const MY_MAJOR_KEYWORD = "컴퓨터"; // 제목에서 찾을 내 전공 키워드

// ✅ 일반 공지 카테고리 목록 (이 리스트에 없는 건 다 '학과' 공지로 취급합니다)
const GENERAL_CATEGORIES = ['전체', '학사', '장학', '취업', '행사', '비교과', '일반'];

// 제목 정리는 컴포넌트 내부에서 하지만, 모달용으로 여기도 하나 둡니다.
const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

interface HomeScreenProps {
  userTags: string[];
  searchKeyword: string;
}

export default function HomeScreen({ userTags = [], searchKeyword = "" }: HomeScreenProps) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // 상세 모달 관련 상태
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(false);
  
  // 카테고리 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      // 최신순으로 정렬해서 가져오기
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('deadline', { ascending: true }); // 마감 임박순 정렬

      if (error) throw error;
      setNotices(data || []);
    } catch (error: any) {
      Alert.alert("데이터 로드 실패", error.message);
    } finally {
      setLoading(false);
    }
  };

  // D-Day 계산 함수
  const getDdayNum = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 시간 초기화
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    
    const diff = deadline.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // 🔥 마감 임박 (0~3일 남은 것)
  const urgentNotices = notices.filter(n => {
    const dday = getDdayNum(n.deadline);
    return dday !== null && dday >= 0 && dday <= 3;
  });

  // ✨ 맞춤 추천 로직
  const majorPicks = notices.filter(n => {
    // 1. 내 전공 관련인가?
    const isMyMajor = n.category === MY_DEPT_CATEGORY || n.title.includes(MY_MAJOR_KEYWORD);
    
    // 2. 내가 설정한 태그(해시태그)가 있는가?
    const hasTag = Array.isArray(userTags) && userTags.some(tag => n.title.includes(tag));
    
    return isMyMajor || hasTag;
  });

  // 📂 필터링 로직
  let filteredList = notices;

  // 1단계: 카테고리로 거르기
  if (selectedCategory === '전체') {
    filteredList = notices;
  } else if (selectedCategory === '학과') {
    // ✅ '학과' 탭을 누르면 -> 일반 공지 카테고리가 *아닌* 모든 것(AI컴공, 시각디자인 등)을 보여줌
    filteredList = notices.filter(n => 
      n.category && !GENERAL_CATEGORIES.includes(n.category)
    );
  } else {
    // 나머지(학사, 장학 등)는 이름 그대로 매칭
    filteredList = notices.filter(n => n.category === selectedCategory);
  }

  // 2단계: 검색어로 거르기
  if (searchKeyword && searchKeyword.trim() !== "") {
    filteredList = filteredList.filter(n => 
      n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
      (n.summary && n.summary.includes(searchKeyword))
    );
  }

  // 북마크 토글 함수 (홈 화면에서는 기능만 연결해둠 - 필요시 구현)
const handleToggleBookmark = async (id: number) => {
    try {
      // 1. 현재 로그인한 유저 확인
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("알림", "로그인이 필요합니다.");
        return;
      }

      // 2. 일단 저장 시도 (INSERT)
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, notice_id: id });

      if (error) {
        // 3. 에러 났는데 '이미 있다(23505)'는 에러면 -> 삭제(취소)
        if (error.code === '23505') { 
           await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('notice_id', id);
           Alert.alert("해제됨", "보관함에서 삭제되었습니다.");
        } else {
           throw error; // 다른 에러면 진짜 오류
        }
      } else {
        // 4. 성공
        Alert.alert("성공", "보관함(캘린더)에 저장되었습니다! ⭐");
      }
    } catch (e: any) {
      Alert.alert("저장 실패", e.message);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 검색어가 없을 때만 추천 섹션 보여주기 */}
        {searchKeyword === "" && (
          <>
            {/* 1. 마감 임박 섹션 */}
            {urgentNotices.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 마감이 코앞이에요</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                  {urgentNotices.map(item => (
                    <MajorPickCard 
                      key={item.id} 
                      title={item.title} 
                      dday={getDdayNum(item.deadline) === 0 ? "오늘마감" : `D-${getDdayNum(item.deadline)}`} 
                      category={item.category}
                      urgent={true} 
                    />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 2. 맞춤 추천 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ {MY_DEPT_CATEGORY} 맞춤 추천</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                {majorPicks.length > 0 ? (
                  majorPicks.map(item => (
                    <MajorPickCard 
                      key={item.id} 
                      title={item.title} 
                      category={item.category} 
                      isIndigo 
                      type="AI Pick" 
                    />
                  ))
                ) : (
                  <Text style={{color: '#94a3b8', fontSize: 13}}>추천할 공지가 아직 없어요.</Text>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* 3. 메인 공지 리스트 섹션 */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>
            {searchKeyword ? `'${searchKeyword}' 검색 결과` : '전체 소식'}
          </Text>
          
          {/* 카테고리 필터 버튼들 */}
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
          
          {/* 리스트 출력 */}
          {filteredList.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>해당하는 공지가 없습니다.</Text>
            </View>
          ) : (
            filteredList.map(item => (
              <TouchableOpacity 
                key={item.id} 
                onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}
              >
                {/* 🚨 [수정 완료] id 속성을 주석 해제하여 필수값을 전달합니다! */}
                <NoticeCard 
                  id={item.id}
                  title={item.title} 
                  category={item.category} 
                  source={item.source || "학교"}
                  onToggleBookmark={handleToggleBookmark} // 버튼 동작 연결
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- 상세 보기 모달 --- */}
      <Modal visible={isDetailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategory}>{selectedNotice?.category}</Text>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}>
                <X color="#999" size={24} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalTitle}>{cleanTitle(selectedNotice?.title)}</Text>
            
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>✨ AI 핵심 요약</Text>
              <Text style={styles.summaryText}>
                {selectedNotice?.summary === "AI 요약 대기중" 
                  ? "AI가 내용을 분석하고 있습니다. 잠시만 기다려주세요!" 
                  : selectedNotice?.summary || "요약 내용이 없습니다."}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.linkBtn} 
              onPress={() => selectedNotice?.link && Linking.openURL(selectedNotice.link)}
            >
              <Text style={styles.linkBtnText}>원문 보러가기</Text>
              <ExternalLink size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  cardGap: { gap: 12, paddingRight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  modalCategory: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, lineHeight: 26, color: '#1e293b' },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  linkBtn: { backgroundColor: '#4F46E5', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  linkBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 }
});