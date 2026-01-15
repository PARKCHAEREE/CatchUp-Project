import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { supabase } from '../supabase';
import NoticeCard from '../components/NoticeCard';

// 한국어 설정
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
};
LocaleConfig.defaultLocale = 'kr';

export default function CalendarScreen() {
  const [markedDates, setMarkedDates] = useState({});
  const [allMyNotices, setAllMyNotices] = useState([]); // 내가 저장한 모든 공지
  const [selectedDateNotices, setSelectedDateNotices] = useState([]); // 선택한 날짜의 공지
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');

  useEffect(() => {
    fetchMyNotices();
  }, []);

  // 1. 내가 북마크한(또는 나에게 배정된) 일정 가져오기
  const fetchMyNotices = async () => {
    try {
      setLoading(true);
      // 실제로는 bookmarks 테이블과 join하거나, is_bookmarked 필터를 사용
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .not('deadline', 'is', null); // 마감일이 있는 것만

      if (error) throw error;

      // 2. 캘린더에 점(Dot) 찍기 위한 데이터 가공
      const marks = {};
      data.forEach(item => {
        const date = item.deadline.split('T')[0]; // yyyy-mm-dd 추출
        marks[date] = { 
          marked: true, 
          dotColor: '#4F46E5', 
          activeOpacity: 0 
        };
      });

      setMarkedDates(marks);
      setAllMyNotices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // 3. 특정 날짜 클릭 시 해당 날짜 공지 필터링
  const onDayPress = (day) => {
    setSelectedDay(day.dateString);
    const filtered = allMyNotices.filter(n => n.deadline.split('T')[0] === day.dateString);
    setSelectedDateNotices(filtered);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <View style={styles.container}>
      {/* 달력 영역 */}
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDay]: { ...markedDates[selectedDay], selected: true, selectedColor: '#4F46E5' }
        }}
        theme={{
          todayTextColor: '#4F46E5',
          arrowColor: '#4F46E5',
          dotColor: '#4F46E5',
          selectedDayBackgroundColor: '#4F46E5',
          textDayFontWeight: '600',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: 'bold',
        }}
      />

      {/* 일정 리스트 영역 */}
      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          {selectedDay ? `${selectedDay} 일정` : '날짜를 선택해주세요'}
        </Text>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedDateNotices.length > 0 ? (
            selectedDateNotices.map(item => (
              <NoticeCard 
                key={item.id} 
                item={item} 
                dday={item.deadline === selectedDay ? "오늘마감" : "일정"} 
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>해당 날짜에 일정이 없습니다.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center' },
  listSection: { flex: 1, backgroundColor: '#F9FAFB', padding: 20, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  listTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#111' },
  emptyBox: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14 }
});