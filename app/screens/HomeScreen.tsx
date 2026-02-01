import React, { useState, useEffect } from 'react';
import { 
  ScrollView, View, Text, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Alert, Modal, Linking, SafeAreaView 
} from 'react-native';
import { X, ExternalLink, Star } from 'lucide-react-native'; 
import { supabase } from '../supabase'; 

import MajorPickCard from '../components/MajorPickCard';
import NoticeCard from '../components/NoticeCard';
import CategoryFilter from '../components/CategoryFilter';

const GENERAL_CATEGORIES = ['전체', '학사', '장학', '등록', '취업', '생활', '행사', '비교과', '일반'];

const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

interface HomeScreenProps {
  userTags: string[];
  searchKeyword: string;
  userInfo: {
    name: string;
    major: string;
    grade: number;
  };
}

export default function HomeScreen({ userTags = [], searchKeyword = "", userInfo }: HomeScreenProps) {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');

  // 내가 북마크한 공지 ID들을 저장하는 리스트
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  useEffect(() => {
    fetchNotices();
    fetchBookmarks(); // 앱 켜지면 내 북마크 목록 가져오기
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        // ✅ [A. 수정] 정렬 기준을 created_at -> posted_at (공지 작성일)으로 변경
        .order('posted_at', { ascending: false }); 

      if (error) throw error;
      setNotices(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 내 북마크 목록 불러오기 함수
  const fetchBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookmarks')
        .select('notice_id')
        .eq('user_id', user.id);

      if (error) throw error;

      if (data) {
        setBookmarkedIds(data.map(item => item.notice_id));
      }
    } catch (e) {
      console.error("북마크 로드 실패:", e);
    }
  };

  // 북마크 토글 함수
  const handleToggleBookmark = async (id: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("알림", "로그인이 필요합니다.");
        return;
      }

      if (bookmarkedIds.includes(id)) {
        // 삭제 로직
        setBookmarkedIds(prev => prev.filter(bid => bid !== id));
        
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('notice_id', id);
          
        if (error) throw error;

      } else {
        // 추가 로직
        setBookmarkedIds(prev => [...prev, id]);

        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: user.id, notice_id: id });

        if (error) {
           if (error.code !== '23505') throw error;
        }
        Alert.alert("성공", "보관함(캘린더)에 저장되었습니다! ⭐");
      }
    } catch (e: any) {
      fetchBookmarks(); 
      Alert.alert("저장 실패", e.message);
    }
  };

  // 최신 글 확인 로직 (7일 이내)
  const isRecent = (dateStr: string) => {
    if (!dateStr) return false;
    const today = new Date();
    const targetDate = new Date(dateStr);
    const diffTime = Math.abs(today.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  };

  // ✅ [B. 수정] 최신글 판별 시 posted_at 사용 (없으면 created_at 백업)
  const recentNotices = notices.filter(n => isRecent(n.posted_at || n.created_at));

  const majorPicks = notices.filter(n => {
    const isMyMajor = (n.category && n.category.includes(userInfo.major)) || 
                      (n.title && n.title.includes(userInfo.major));
    const hasTag = Array.isArray(userTags) && userTags.some(tag => n.title.includes(tag));
    return isMyMajor || hasTag;
  });

  let filteredList = notices;
  if (selectedCategory === '전체') {
    filteredList = notices;
  } else if (selectedCategory === '학과') {
    filteredList = notices.filter(n => 
      n.category && !GENERAL_CATEGORIES.includes(n.category)
    );
  } else {
    filteredList = notices.filter(n => n.category === selectedCategory);
  }

  if (searchKeyword && searchKeyword.trim() !== "") {
    filteredList = filteredList.filter(n => 
      n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
      (n.summary && n.summary.includes(searchKeyword))
    );
  }

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {searchKeyword === "" && (
          <>
            {/* 1. 최신 공지 섹션 */}
            {recentNotices.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔥 따끈따끈 최신 공지</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                  {recentNotices.map(item => (
                    <TouchableOpacity key={item.id} onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}>
                      <MajorPickCard 
                        title={item.title} 
                        dday="NEW" 
                        category={item.category}
                        urgent={true} 
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 2. 맞춤 추천 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ {userInfo.name}님({userInfo.major}) 추천</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                {majorPicks.length > 0 ? (
                  majorPicks.map(item => (
                    <TouchableOpacity key={item.id} onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}>
                      <MajorPickCard 
                        title={item.title} 
                        category={item.category} 
                        isIndigo 
                        type="AI Pick" 
                      />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{color: '#94a3b8', fontSize: 13}}>추천할 공지가 아직 없어요.</Text>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* 3. 메인 공지 리스트 */}
        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>
            {searchKeyword ? `'${searchKeyword}' 검색 결과` : '전체 소식'}
          </Text>
          
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onSelectCategory={setSelectedCategory} 
          />
          
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
                <NoticeCard 
                  id={item.id}
                  title={item.title} 
                  category={item.category} 
                  source={item.source || "학교"}
                  isBookmarked={bookmarkedIds.includes(item.id)} 
                  onToggleBookmark={handleToggleBookmark} 
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

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[
                  styles.actionBtn, 
                  { backgroundColor: bookmarkedIds.includes(selectedNotice?.id) ? '#FFD700' : '#f1f5f9' }
                ]} 
                onPress={() => handleToggleBookmark(selectedNotice?.id)}
              >
                <Star 
                  size={20} 
                  color={bookmarkedIds.includes(selectedNotice?.id) ? "#fff" : "#64748b"} 
                  fill={bookmarkedIds.includes(selectedNotice?.id) ? "#fff" : "transparent"} 
                />
                <Text style={[styles.actionBtnText, { color: bookmarkedIds.includes(selectedNotice?.id) ? '#fff' : '#64748b' }]}>
                  {bookmarkedIds.includes(selectedNotice?.id) ? "저장됨" : "일정 저장"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#4F46E5', flex: 1 }]} 
                onPress={() => {
                   const url = selectedNotice?.link;
                   if(url) Linking.openURL(url.startsWith('http') ? url : `https://www.kyonggi.ac.kr${url}`).catch(() => Alert.alert("오류", "링크를 열 수 없습니다."));
                }}
              >
                <Text style={[styles.actionBtnText, { color: '#fff' }]}>원문 보러가기</Text>
                <ExternalLink size={16} color="#fff" />
              </TouchableOpacity>
            </View>

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
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  actionBtnText: { fontWeight: 'bold', fontSize: 16 },
});