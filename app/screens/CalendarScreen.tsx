import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { supabase } from '../supabase';
import NoticeCard from '../components/NoticeCard';

LocaleConfig.locales['kr'] = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
};
LocaleConfig.defaultLocale = 'kr';

interface Notice {
  id: number;
  title: string;
  deadline: string;
  category?: string;
  source_type?: string; 
  user_deadline?: string;
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

  const generateMarkedDates = (notices: Notice[], currentSelectedDay: string) => {
    const marks: MarkedDates = {};
    notices.forEach((notice) => {
      const date = notice.deadline; 
      marks[date] = { 
        marked: true, 
        dotColor: notice.user_deadline ? '#FF4500' : '#FFD700', 
      };
    });
    if (currentSelectedDay) {
      marks[currentSelectedDay] = {
        ...marks[currentSelectedDay],
        selected: true,
        selectedColor: '#4F46E5'
      };
    }
    return marks;
  };

  const fetchBookmarkedNotices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`notice_id, custom_deadline, notices (id, title, deadline, category, source_type)`)
        .eq('user_id', user.id); 

      if (error) throw error;
      const myNotices = data
        .map((item: any) => {
            const notice = item.notices;
            if (!notice) return null;
            const finalDeadline = item.custom_deadline || notice.deadline;
            if (!finalDeadline) return null;
            return { ...notice, deadline: finalDeadline.split('T')[0], user_deadline: item.custom_deadline };
        })
        .filter((n: any) => n !== null) as Notice[];

      setBookmarkedNotices(myNotices);
      setMarkedDates(generateMarkedDates(myNotices, selectedDay));
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onDayPress = (day: DateData) => {
    const dateString = day.dateString;
    setSelectedDay(dateString);
    const filtered = bookmarkedNotices.filter(n => n.deadline === dateString);
    setSelectedDateNotices(filtered);
    setMarkedDates(generateMarkedDates(bookmarkedNotices, dateString));
  };

  const handleRemoveBookmark = async (noticeId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('notice_id', noticeId);
      
      const updatedList = bookmarkedNotices.filter(n => n.id !== noticeId);
      setBookmarkedNotices(updatedList);
      setSelectedDateNotices(selectedDateNotices.filter(n => n.id !== noticeId));
      setMarkedDates(generateMarkedDates(updatedList, selectedDay));
      Alert.alert("알림", "일정이 삭제되었습니다.");
    } catch (e: any) {
      Alert.alert("삭제 실패", e.message);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#4F46E5" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.headerTitle}>캘린더</Text>
      </View>
      
      <View style={styles.calendarWrapper}>
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          theme={{
            todayTextColor: '#4F46E5',
            arrowColor: '#4F46E5',
            dotColor: '#FFD700',
            selectedDayBackgroundColor: '#4F46E5',
            textDayHeaderFontSize: 14,
            textDayFontSize: 14,
            ...({
                'stylesheet.calendar.header': {
                  week: { marginTop: 0, flexDirection: 'row', justifyContent: 'space-between' }
                }
            } as any)
          }}
          enableSwipeMonths={true}
        />
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>
          {selectedDay ? `${selectedDay} 일정` : '날짜를 선택해주세요'}
        </Text>
        
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {selectedDateNotices.length > 0 ? (
            selectedDateNotices.map(item => (
              <NoticeCard 
                key={item.id} 
                id={item.id}
                title={item.title}
                category={item.category}
                source={item.user_deadline ? '📅 마감 설정됨' : (item.source_type === 'IMAGE' ? '등록 공지' : '통합 공지')}
                isBookmarked={true} 
                onToggleBookmark={handleRemoveBookmark}
              />
            ))
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                 {selectedDay ? "등록된 일정이 없습니다." : "달력에서 날짜를 선택하세요."}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: { 
    paddingHorizontal: 20, 
    paddingBottom: 10, 
    paddingTop: 20,
  },
  headerTitle: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  calendarWrapper: {
    backgroundColor: '#fff',
    paddingBottom: 20, 
  },
  center: { flex: 1, justifyContent: 'center' },
  listSection: { 
    flex: 1, 
    backgroundColor: '#F9FAFB', 
    padding: 20, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30,
    marginTop: -20, 
    paddingTop: 30,
    elevation: 5, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' },
  emptyBox: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 }
});