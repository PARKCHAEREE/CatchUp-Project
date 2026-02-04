import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, Star } from 'lucide-react-native';

const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

interface NoticeCardProps {
  id: number; 
  title: string;
  category?: string;
  source?: string;
  isBookmarked?: boolean; 
  onToggleBookmark?: (id: number) => void; 
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

      <TouchableOpacity onPress={() => onToggleBookmark && onToggleBookmark(id)}>
        <Star 
          size={24} 
          color={isBookmarked ? "#FFD700" : "#cbd5e1"} 
          fill={isBookmarked ? "#FFD700" : "transparent"} 
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