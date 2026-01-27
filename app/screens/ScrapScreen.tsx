import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase } from '../supabase';
import NoticeCard from '../components/NoticeCard';
import { Bookmark } from 'lucide-react-native';

export default function ScrapScreen() {
  const [scraps, setScraps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 화면 켤 때마다 데이터 가져오기
  useEffect(() => {
    fetchScraps();
  }, []);

  const fetchScraps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 내 북마크 + 공지 원본 데이터 같이 가져오기
      const { data, error } = await supabase
        .from('bookmarks')
        .select(`
          notice_id,
          notices ( * ) 
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 데이터 정리
      const formattedData = data.map((item: any) => ({
        ...item.notices,
        bookmark_id: item.notice_id
      })).filter(item => item !== null);

      setScraps(formattedData);
    } catch (e: any) {
      console.log("불러오기 실패:", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 삭제 기능
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
      
      // 리스트에서 즉시 제거
      setScraps(prev => prev.filter(item => item.id !== noticeId));
      
    } catch (e: any) {
      Alert.alert("오류", "삭제 실패했습니다.");
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
            <TouchableOpacity key={item.id} activeOpacity={0.8}>
              <NoticeCard 
                id={item.id}
                title={item.title}
                category={item.category}
                source={item.source}
                isBookmarked={true}
                onToggleBookmark={() => handleRemove(item.id)}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 40 },
  center: { flex: 1, justifyContent: 'center' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
  list: { padding: 20 },
  emptyBox: { alignItems: 'center', marginTop: 100, gap: 10 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
});