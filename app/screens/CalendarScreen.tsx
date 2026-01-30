import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { supabase } from '../supabase';
import NoticeCard from '../components/NoticeCard';

// 한국어 설정
LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
};
LocaleConfig.defaultLocale = 'kr';

// 🚨 [중요] 아직 로그인 기능이 없다면 임시로 고정된 ID를 씁니다.
// 나중에 로그인 기능 넣으면 supabase.auth.user().id 로 바꾸면 됩니다.
const TEST_USER_ID = "test-user-001"; 

interface Notice {
  id: number;
  title: string;
  deadline: string;
  category?: string;
  source?: string;
}

interface MarkedDates {
  [date: string]: {
    marked?: boolean;
    dotColor?: string;
    selected?: boolean;
    selectedColor?: string;
  };
}

export default function CalendarScreen() {
  const [markedDates, setMarkedDates] = useState<MarkedDates>({});
  const [bookmarkedNotices, setBookmarkedNotices] = useState<Notice[]>([]);
  const [selectedDateNotices, setSelectedDateNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<string>('');

  useEffect(() => {
    fetchBookmarkedNotices();
  }, []);

  // ✅ 정석 방법: DB의 'bookmarks' 테이블을 조회해서 찜한 공지 데이터만 가져옵니다.
  const fetchBookmarkedNotices = async () => {
    try {
      setLoading(true);

      // 1. bookmarks 테이블에서 내 ID로 된 것들을 찾고, 
      // 2. 그 안에 연결된 notices(공지 정보)를 같이 가져옵니다 (Join).
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          notice_id,
          notices (
            id, title, deadline, category, source
          )
        `)
        .eq('user_id', TEST_USER_ID); // 내 것만 가져오기

      if (error) throw error;

      // 3. 데이터 가공 (Supabase가 계층 구조로 주기 때문에 평탄화 작업 필요)
      // data = [{ notices: { title: "...", ... } }, ...] 형태임
      const myNotices = data
        .map((item: any) => item.notices) // 공지 알맹이만 꺼냄
        .filter((n: any) => n && n.deadline); // 삭제된 공지나 마감일 없는 건 제외

      // 4. 캘린더 점 찍기
      const marks: MarkedDates = {};
      myNotices.forEach((notice: Notice) => {
        const date = notice.deadline.split('T')[0];
        marks[date] = { 
          marked: true, 
          dotColor: '#FFD700', // 찜한 건 금색 점으로 표시!
        };
      });

      setMarkedDates(marks);
      setBookmarkedNotices(myNotices);

    } catch (e: any) {
      console.error(e);
      Alert.alert("일정 로드 실패", e.message);
    } finally {
      setLoading(false);
    }
  };

  const onDayPress = (day: DateData) => {
    setSelectedDay(day.dateString);
    // 이미 가져온 '찜한 목록' 중에서 해당 날짜인 것만 보여줌
    const filtered = bookmarkedNotices.filter(n => n.deadline.split('T')[0] === day.dateString);
    setSelectedDateNotices(filtered);
  };

  // 캘린더 화면에서 별표를 다시 누르면 -> 찜 해제(삭제) 기능
  const handleRemoveBookmark = async (noticeId: number) => {
    try {
      // DB에서 삭제
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', TEST_USER_ID)
        .eq('notice_id', noticeId);

      if (error) throw error;

      // 화면 즉시 반영 (새로고침 없이 리스트에서 제거)
      const updatedList = bookmarkedNotices.filter(n => n.id !== noticeId);
      setBookmarkedNotices(updatedList);
      
      // 선택된 날짜 리스트에서도 제거
      setSelectedDateNotices(selectedDateNotices.filter(n => n.id !== noticeId));
      
      // 마커(점) 다시 계산 (그 날짜에 남은 일정이 없으면 점 제거)
      // (간단하게 구현하기 위해 전체 새로고침도 방법이지만, 여기선 생략)
      Alert.alert("알림", "일정이 캘린더에서 제거되었습니다.");

    } catch (e: any) {
      Alert.alert("삭제 실패", e.message);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDay]: { 
            ...markedDates[selectedDay], 
            selected: true, 
            selectedColor: '#4F46E5' 
          }
        }}
        theme={{
          todayTextColor: '#4F46E5',
          arrowColor: '#4F46E5',
          dotColor: '#FFD700',
          selectedDayBackgroundColor: '#4F46E5',
        }}
      />

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          {selectedDay ? `${selectedDay} 나의 일정` : '날짜를 선택해주세요'}
        </Text>
        
        <ScrollView showsVerticalScrollIndicator={false}>
          {selectedDateNotices.length > 0 ? (
            selectedDateNotices.map(item => (
              <NoticeCard 
                key={item.id} 
                id={item.id}
                title={item.title}
                category={item.category}
                source={item.source}
                isBookmarked={true} // 캘린더에 뜨는 건 무조건 찜한 상태임
                onToggleBookmark={handleRemoveBookmark} // 누르면 삭제됨
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>저장된 일정이 없습니다.</Text>
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