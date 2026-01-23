import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, Star } from 'lucide-react-native';

// 정규식: 제목의 [대괄호] 제거 함수
const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

interface NoticeCardProps {
  id: number; // 북마크 식별을 위해 ID 필수
  title: string;
  category?: string;
  source?: string;
  isBookmarked?: boolean; // 북마크 여부 (채워진 별/빈 별)
  onToggleBookmark?: (id: number) => void; // 별표 눌렀을 때 실행할 함수
}

export default function NoticeCard({ 
  id, title, category, source, isBookmarked = false, onToggleBookmark 
}: NoticeCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <MessageCircle size={20} color="#4F46E5" />
      </View>
      
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>
          {cleanTitle(title)}
        </Text>
        <Text style={styles.subText}>
          {category || '공지'} • {source || '학교'}
        </Text>
      </View>

      {/* 별표 버튼 기능 구현 */}
      <TouchableOpacity onPress={() => onToggleBookmark && onToggleBookmark(id)}>
        <Star 
          size={24} 
          color={isBookmarked ? "#FFD700" : "#cbd5e1"} // 찜하면 금색, 아니면 회색
          fill={isBookmarked ? "#FFD700" : "transparent"} // 찜하면 채우기
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    marginBottom: 12 
  },
  iconBox: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    backgroundColor: '#eff6ff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  subText: { fontSize: 12, color: '#94a3b8', marginTop: 2 }
});