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

const USER_MAJOR = "컴퓨터공학과"; 

// 🚨 수정됨: props에 searchKeyword가 추가되어야 App.js에서 보낸 검색어를 받을 수 있습니다.
export default function HomeScreen({ userTags = [], searchKeyword = "" }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      Alert.alert("데이터 로드 실패", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDdayNum = (deadlineStr) => {
    if (!deadlineStr) return null;
    const today = new Date();
    const deadline = new Date(deadlineStr);
    const diff = deadline - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const urgentNotices = notices.filter(n => {
    const dday = getDdayNum(n.deadline);
    return dday !== null && dday >= 0 && dday <= 3;
  });

  const majorPicks = notices.filter(n => {
    const isMajor = n.category === '학과' || n.title.includes(USER_MAJOR);
    // userTags가 배열인지 확인 후 some 실행 (안전장치)
    const hasTag = Array.isArray(userTags) && userTags.some(tag => n.title.includes(tag));
    return isMajor || hasTag;
  });

  // 🚨 검색 기능 로직 수정 (여기 주목!)
  // 1. 카테고리 필터링
  let filteredList = selectedCategory === '전체' 
    ? notices 
    : notices.filter(n => n.category === selectedCategory);

  // 2. 검색어 필터링 (검색어가 있을 때만 실행)
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
        
        {/* 검색 중이 아닐 때만 추천 섹션들을 보여줍니다 (깔끔한 UI를 위해) */}
        {searchKeyword === "" && (
          <>
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

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ {USER_MAJOR} 맞춤 추천</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                {majorPicks.map(item => (
                  <MajorPickCard 
                    key={item.id} 
                    title={item.title} 
                    category={item.category} 
                    isIndigo 
                    type="AI Pick" 
                  />
                ))}
              </ScrollView>
            </View>
          </>
        )}

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
                  title={item.title} 
                  category={item.category} 
                  source={item.source || "학교"} 
                />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* 모달 부분은 기존과 동일 */}
      <Modal visible={isDetailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategory}>{selectedNotice?.category}</Text>
              <TouchableOpacity onPress={() => setIsDetailVisible(false)}><X color="#999" /></TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>
            
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>✨ AI 핵심 요약</Text>
              <Text style={styles.summaryText}>
                {selectedNotice?.summary === "AI 요약 대기중" 
                  ? "AI가 내용을 분석하고 있습니다. 잠시만 기다려주세요!" 
                  : selectedNotice?.summary}
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
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalCategory: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, lineHeight: 24 },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  linkBtn: { backgroundColor: '#4F46E5', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  linkBtnText: { color: '#fff', fontWeight: 'bold' },
  emptyBox: { padding: 20, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 }
});