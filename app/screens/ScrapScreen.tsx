import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  TouchableOpacity, RefreshControl, Alert, Modal, Linking, Platform 
} from 'react-native';
import { supabase } from '../supabase';
import NoticeCard from '../components/NoticeCard';
import { Bookmark, X, Calendar as CalendarIcon, ExternalLink } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; 

export default function ScrapScreen() {
  const [scraps, setScraps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI 상태 (모달, 날짜선택기)
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    fetchScraps();
  }, []);

  // 보관함 데이터 불러오기
  const fetchScraps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          notice_id,
          custom_deadline, 
          notices ( * ) 
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 데이터 포맷팅 (null 값 필터링 포함)
      const formattedData = data.map((item: any) => ({
        ...item.notices,
        bookmark_id: item.notice_id,
        user_deadline: item.custom_deadline 
      })).filter(item => item !== null);

      setScraps(formattedData);
    } catch (e: any) {
      console.log("로드 실패:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 보관함 삭제
  const handleRemove = async (noticeId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('notice_id', noticeId);

      if (error) throw error;
      
      // UI 즉시 반영
      setScraps(prev => prev.filter(item => item.id !== noticeId));
      if (selectedNotice?.id === noticeId) setIsModalVisible(false);
      
    } catch (e) {
      Alert.alert("오류", "삭제에 실패했습니다.");
    }
  };

  // 마감일 수정
  const handleDateChange = async (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false); // 안드로이드는 선택 후 닫힘 처리 필요
    
    if (date && selectedNotice) {
        setTempDate(date);
        const newDeadline = date.toISOString().split('T')[0];

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return;

            await supabase
                .from('bookmarks')
                .update({ custom_deadline: newDeadline })
                .eq('user_id', user.id)
                .eq('notice_id', selectedNotice.id);

            // 리스트 및 모달 데이터 즉시 업데이트
            setScraps(prev => prev.map(item => 
                item.id === selectedNotice.id ? { ...item, user_deadline: newDeadline } : item
            ));
            setSelectedNotice({ ...selectedNotice, user_deadline: newDeadline });
            
            Alert.alert("완료", "마감일이 수정되었습니다! 📅");
        } catch (e) {
            Alert.alert("오류", "날짜 수정 실패");
        }
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📂 보관함</Text>
        <Text style={styles.headerSub}>내가 찜한 공지 {scraps.length}개</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchScraps(); }} />}
      >
        {scraps.length === 0 ? (
          <View style={styles.emptyBox}>
            <Bookmark size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>보관된 공지가 없습니다.</Text>
          </View>
        ) : (
          scraps.map((item) => (
            <TouchableOpacity key={item.id} activeOpacity={0.7} onPress={() => { setSelectedNotice(item); setIsModalVisible(true); }}>
              <NoticeCard 
                id={item.id}
                title={item.title}
                category={item.category}
                source={item.user_deadline ? `📅 마감: ${item.user_deadline}` : (item.source_type === 'IMAGE' ? '📷 내 사진' : '🏫 학교')}
                isBookmarked={true}
                onToggleBookmark={() => handleRemove(item.id)}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 상세 보기 모달 */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCategory}>{selectedNotice?.category}</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <X color="#999" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTitle}>{selectedNotice?.title}</Text>
            
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>📝 내용 요약</Text>
              <Text style={styles.summaryText}>
                  {selectedNotice?.summary || selectedNotice?.content || "요약 내용 없음"}
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              {/* 날짜 수정 버튼 */}
              <TouchableOpacity 
                  style={[styles.actionBtn, { backgroundColor: '#EEF2FF' }]} 
                  onPress={() => setShowDatePicker(true)}
              >
                  <CalendarIcon size={20} color="#4F46E5" />
                  <Text style={[styles.actionBtnText, { color: '#4F46E5' }]}>
                      {selectedNotice?.user_deadline ? `${selectedNotice.user_deadline} 수정` : "마감일 설정"}
                  </Text>
              </TouchableOpacity>

              {/* 원문 이동 버튼 (이미지/텍스트 일정 아닐 때만) */}
              {selectedNotice?.source_type !== 'IMAGE' && selectedNotice?.source_type !== 'TEXT' ? (
                   <TouchableOpacity 
                      style={[styles.actionBtn, { backgroundColor: '#4F46E5', flex: 1 }]} 
                      onPress={() => {
                          const url = selectedNotice?.link;
                          if(url) Linking.openURL(url.startsWith('http') ? url : `https://www.kyonggi.ac.kr${url}`);
                      }}
                  >
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>원문 보기</Text>
                      <ExternalLink size={16} color="#fff" />
                  </TouchableOpacity>
              ) : (
                  <View style={[styles.actionBtn, { backgroundColor: '#F1F5F9', flex: 1 }]}>
                        <Text style={{color:'#94a3b8'}}>
                          {selectedNotice?.source_type === 'IMAGE' ? '이미지 일정' : '텍스트 일정'}
                        </Text>
                  </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 날짜 선택기 */}
      {showDatePicker && (
          <DateTimePicker
              value={tempDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  list: { padding: 20, paddingBottom: 100 },
  emptyBox: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 16, color: '#94a3b8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
  modalCategory: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, lineHeight: 26, color: '#1e293b' },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8, flex: 1 },
  actionBtnText: { fontWeight: 'bold', fontSize: 15 },
});