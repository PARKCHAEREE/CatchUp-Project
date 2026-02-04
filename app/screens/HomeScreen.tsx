import React, { useState, useEffect, useCallback } from 'react';
import { 
  ScrollView, View, Text, StyleSheet, ActivityIndicator, 
  TouchableOpacity, Alert, Modal, Linking, Platform, RefreshControl 
} from 'react-native';
import { X, ExternalLink, Star, Calendar as CalendarIcon, Bell, Clock, CheckCircle } from 'lucide-react-native'; 
import { supabase } from '../supabase'; 
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

import Header from '../components/Header'; 
import MajorPickCard from '../components/MajorPickCard';
import NoticeCard from '../components/NoticeCard';
import CategoryFilter from '../components/CategoryFilter';

const GENERAL_CATEGORIES = ['전체', '학사', '장학', '등록', '취업', '생활', '행사', '비교과', '일반'];

const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true, 
    shouldShowList: true,   
  }),
});

interface HomeScreenProps {
  userTags: string[];
  userInfo: {
    name: string;
    major: string;
    grade: number;
  };
}

export default function HomeScreen({ userTags = [], userInfo }: HomeScreenProps) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  const [selectedNotice, setSelectedNotice] = useState<any>(null);
  const [isDetailVisible, setIsDetailVisible] = useState<boolean>(false);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState<boolean>(false);
  const [isActivityVisible, setIsActivityVisible] = useState<boolean>(false);
  
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [targetNoticeId, setTargetNoticeId] = useState<number | null>(null);

  const [notificationHistory, setNotificationHistory] = useState<{title: string, date: string, body: string}[]>([]);

  useEffect(() => {
    fetchNotices();
    fetchBookmarks(); 
    registerForPushNotificationsAsync();
    loadNotificationHistory(); 
  }, []);

  const loadNotificationHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('notificationHistory');
      if (saved) {
        setNotificationHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const registerForPushNotificationsAsync = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: '기본 알림',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchNotices(), fetchBookmarks()]);
    setRefreshing(false);
  }, []);

  const fetchNotices = async () => {
    try {
      if (!refreshing) setLoading(true);
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('posted_at', { ascending: false }); 
      if (error) throw error;
      setNotices(data || []);
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; 
      const { data, error } = await supabase.from('bookmarks').select('notice_id').eq('user_id', user.id);
      if (error) throw error;
      if (data) setBookmarkedIds(data.map(item => item.notice_id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleBookmark = async (id: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; 
    
    if (bookmarkedIds.includes(id)) {
      try {
        setBookmarkedIds(prev => prev.filter(bid => bid !== id));
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('notice_id', id);
        Alert.alert("알림", "보관함에서 삭제되었습니다.");
      } catch (e) { fetchBookmarks(); }
    } else {
      const targetNotice = notices.find(n => n.id === id);
      if (targetNotice && targetNotice.deadline) {
          saveBookmarkToDB(id, new Date(targetNotice.deadline));
      } else {
          setTargetNoticeId(id);
          setIsSaveModalVisible(true);
      }
    }
  };

  const saveWithoutDate = () => {
    if (targetNoticeId) saveBookmarkToDB(targetNoticeId, null);
    setIsSaveModalVisible(false);
  };

  const openDatePicker = () => {
    setIsSaveModalVisible(false); 
    setTempDate(new Date());
    setTimeout(() => setShowDatePicker(true), 200); 
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate && targetNoticeId) {
        saveBookmarkToDB(targetNoticeId, selectedDate);
    } else {
        setTargetNoticeId(null);
    }
  };

 const scheduleDDayNotification = async (noticeTitle: string, deadline: Date) => {
    try {
      const now = new Date();
      let scheduledCount = 0;
      const newLogs: {title: string, date: string, body: string}[] = [];

      for (let i = 3; i >= 0; i--) {
        const triggerDate = new Date(deadline);
        triggerDate.setDate(triggerDate.getDate() - i); 
        triggerDate.setHours(9, 0, 0, 0); 

        if (triggerDate.getTime() > now.getTime()) {
          const diffInSeconds = Math.floor((triggerDate.getTime() - now.getTime()) / 1000);
          const dDayLabel = i === 0 ? "오늘 마감!" : `D-${i}`;
          
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏳ 마감 임박 알림 (${dDayLabel})`,
              body: `'${noticeTitle}' 마감이 ${i}일 남았습니다.`,
              sound: true,
            },
            trigger: { 
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, 
              seconds: diffInSeconds, 
              repeats: false 
            }, 
          });
          
          const month = String(triggerDate.getMonth() + 1).padStart(2, '0');
          const day = String(triggerDate.getDate()).padStart(2, '0');
          const formattedDate = `${month}월 ${day}일 09:00`;

          newLogs.push({
            title: `예약됨: ${dDayLabel} 알림`,
            date: formattedDate,
            body: noticeTitle
          });

          scheduledCount++;
        }
      }

      if (newLogs.length > 0) {
        setNotificationHistory(prev => {
          const updated = [...newLogs, ...prev];
          AsyncStorage.setItem('notificationHistory', JSON.stringify(updated));
          return updated;
        });
      }

      return scheduledCount > 0;
    } catch (e) {
      console.log("알림 예약 중 오류:", e);
      return false;
    }
  };

  const saveBookmarkToDB = async (id: number, deadline: Date | null) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return; 
        setBookmarkedIds(prev => [...prev, id]);
        const { error } = await supabase.from('bookmarks').insert({ 
            user_id: user.id, notice_id: id, custom_deadline: deadline ? deadline.toISOString().split('T')[0] : null
        });
        if (error && error.code !== '23505') throw error;
        
        let msg = "캘린더에 일정이 등록되었습니다!";
        if (deadline) {
           const targetNotice = notices.find(n => n.id === id);
           if (targetNotice) {
              const scheduled = await scheduleDDayNotification(targetNotice.title, deadline);
              if (scheduled) msg += "\n(마감 3일 전부터 아침 9시에 알림이 옵니다 🔔)";
           }
        }
        Alert.alert("저장 완료 ✨", msg);
    } catch (e: any) {
        setBookmarkedIds(prev => prev.filter(bid => bid !== id));
        Alert.alert("저장 실패", e.message);
    } finally {
        setShowDatePicker(false);
        setTargetNoticeId(null);
    }
  };

  const majorPicks = notices.filter(n => {
    const isMyMajor = (n.category && n.category.includes(userInfo.major)) || 
                      (n.title && n.title.includes(userInfo.major));
    const hasTag = Array.isArray(userTags) && userTags.length > 0 && userTags.some(tag => n.title.includes(tag));
    
    return isMyMajor || hasTag;
  });

  const isRecent = (dateStr: string) => {
    if (!dateStr) return false;
    const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)); 
    return diffDays <= 3;
  };
  const recentNotices = notices.filter(n => isRecent(n.posted_at || n.created_at)).slice(0, 5);

  let filteredList = notices;
  if (selectedCategory !== '전체') {
      filteredList = selectedCategory === '학과' 
      ? notices.filter(n => n.category && !GENERAL_CATEGORIES.includes(n.category))
      : notices.filter(n => n.category === selectedCategory);
  }
  if (searchKeyword.trim() !== "") {
    filteredList = filteredList.filter(n => n.title.toLowerCase().includes(searchKeyword.toLowerCase()));
  }

  if (loading && !refreshing) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Header 
        keyword={searchKeyword} 
        setKeyword={setSearchKeyword} 
        onOpenActivity={() => setIsActivityVisible(true)}
      />

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {searchKeyword === "" && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔥 따끈따끈 최신 공지 </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                {recentNotices.map(item => (
                  <TouchableOpacity key={item.id} onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}>
                    <MajorPickCard title={item.title} dday="NEW" category={item.category} urgent={true} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ {userInfo.name}님({userInfo.major}) 추천</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardGap}>
                
                {majorPicks.length > 0 ? (
                  majorPicks.map(item => (
                    <TouchableOpacity key={item.id} onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}>
                      <MajorPickCard title={item.title} category={item.category} isIndigo type="AI Pick" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{color: '#94a3b8', fontSize: 13, paddingLeft: 5}}>
                    아직 추천할 공지가 없어요. 관심 태그를 설정해보세요!
                  </Text>
                )}
              </ScrollView>
            </View>
          </>
        )}

        <View style={[styles.section, { marginBottom: 100 }]}>
          <Text style={styles.sectionTitle}>{searchKeyword ? `'${searchKeyword}' 검색 결과` : '전체 소식'}</Text>
          <CategoryFilter selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
          {filteredList.map(item => (
            <TouchableOpacity key={item.id} onPress={() => { setSelectedNotice(item); setIsDetailVisible(true); }}>
              <NoticeCard 
                id={item.id}
                title={item.title} 
                category={item.category} 
                source={item.source}
                isBookmarked={bookmarkedIds.includes(item.id)} 
                onToggleBookmark={handleToggleBookmark} 
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal visible={isActivityVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { height: '55%' }]}> 
              <View style={styles.modalHeader}>
                 <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1e293b'}}>🔔 알림 </Text>
                 <TouchableOpacity onPress={() => setIsActivityVisible(false)}>
                    <X color="#999" size={24} />
                 </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                 <View style={styles.settingSection}>
                    <Text style={styles.settingHeader}>예약된 알림 (마감 3일 전)</Text>
                    {bookmarkedIds.length > 0 ? (
                        <View style={styles.activityItem}>
                           <Clock size={20} color="#4F46E5" />
                           <Text style={styles.activityText}>현재 {bookmarkedIds.length}개의 공지가 알림 예약되어 있습니다.</Text>
                        </View>
                    ) : (
                        <View style={[styles.activityItem, { justifyContent: 'center' }]}>
                           <Text style={{ color: '#94a3b8' }}>예약된 알림이 없습니다.</Text>
                        </View>
                    )}
                 </View>
                 
                 <View style={styles.settingSection}>
                    <Text style={styles.settingHeader}>최근 알림 예약 기록</Text>
                      {notificationHistory.length > 0 ? (
                        notificationHistory.map((log, index) => (
                           <View key={index} style={[styles.activityItem, { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 12 }]}>
                              <CheckCircle size={18} color="#10B981" style={{marginTop: 2}} />
                              <View style={{flex: 1}}>
                                 <Text style={{fontSize: 14, color: '#334155', fontWeight: '500'}}>{log.title}</Text>
                                 <Text style={{fontSize: 12, color: '#64748b', marginTop: 2}}>{log.body}</Text>
                                 <Text style={{fontSize: 11, color: '#94a3b8', marginTop: 4}}>발송 예정: {log.date}</Text>
                              </View>
                           </View>
                        ))
                      ) : (
                        <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 10 }}>
                           최근 예약된 알림 내역이 없습니다.
                        </Text>
                      )}
                 </View>
              </ScrollView>
           </View>
        </View>
      </Modal>

      {/* 상세 보기 모달 */}
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
                {selectedNotice?.summary || selectedNotice?.content || "내용 없음"}
              </Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: bookmarkedIds.includes(selectedNotice?.id) ? '#FFD700' : '#f1f5f9' }]} 
                onPress={() => handleToggleBookmark(selectedNotice?.id)}
              >
                <Star size={20} color={bookmarkedIds.includes(selectedNotice?.id) ? "#fff" : "#64748b"} fill={bookmarkedIds.includes(selectedNotice?.id) ? "#fff" : "transparent"} />
                <Text style={[styles.actionBtnText, { color: bookmarkedIds.includes(selectedNotice?.id) ? '#fff' : '#64748b' }]}>
                  {bookmarkedIds.includes(selectedNotice?.id) ? "저장됨" : "일정 저장"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                disabled={!selectedNotice?.link}
                style={[
                  styles.actionBtn, 
                  { 
                    backgroundColor: selectedNotice?.link ? '#4F46E5' : '#E2E8F0',
                    flex: 1 
                  }
                ]} 
                onPress={() => {
                  const url = selectedNotice?.link;
                  if(url) Linking.openURL(url.startsWith('http') ? url : `https://www.kyonggi.ac.kr${url}`);
                }}
              >
                <Text style={[styles.actionBtnText, { color: selectedNotice?.link ? '#fff' : '#94A3B8' }]}>
                  {selectedNotice?.link ? "원문 보러가기" : "원문 없음"}
                </Text>
                <ExternalLink size={16} color={selectedNotice?.link ? "#fff" : "#94A3B8"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 날짜 선택 모달 */}
      <Modal visible={isSaveModalVisible} transparent animationType="fade">
        <View style={styles.centerOverlay}>
            <View style={styles.savePopup}>
                <Text style={styles.savePopupTitle}>일정 보관함 저장</Text>
                <Text style={styles.savePopupDesc}>마감일(D-Day)을 함께 설정하여{'\n'}캘린더에 등록하시겠습니까?</Text>
                <View style={styles.savePopupBtnRow}>
                    <TouchableOpacity style={styles.grayBtn} onPress={saveWithoutDate}><Text style={styles.grayBtnText}>날짜 없이 저장</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.blueBtn} onPress={openDatePicker}>
                        <CalendarIcon size={16} color="#fff" style={{marginRight:4}}/><Text style={styles.blueBtnText}>날짜 설정</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {showDatePicker && <DateTimePicker value={tempDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  cardGap: { gap: 12, paddingRight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' },
  modalCategory: { color: '#4F46E5', fontWeight: 'bold', fontSize: 12, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, lineHeight: 26, color: '#1e293b' },
  summaryBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5', marginBottom: 8 },
  summaryText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  modalBtnRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, gap: 8 },
  actionBtnText: { fontWeight: 'bold', fontSize: 16 },
  centerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  savePopup: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 5 },
  savePopupTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  savePopupDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  savePopupBtnRow: { flexDirection: 'row', gap: 10, width: '100%', marginBottom: 15 },
  grayBtn: { flex: 1, backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, alignItems: 'center' },
  grayBtnText: { color: '#64748b', fontWeight: 'bold' },
  blueBtn: { flex: 1, backgroundColor: '#4F46E5', padding: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  blueBtnText: { color: '#fff', fontWeight: 'bold' },
  settingSection: { marginBottom: 30 },
  settingHeader: { fontSize: 14, fontWeight: 'bold', color: '#94a3b8', marginBottom: 10 },
  activityItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 10 },
  activityText: { flex: 1, fontSize: 14, color: '#334155' },
});