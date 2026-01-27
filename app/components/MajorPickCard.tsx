import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ✅ 1. cleanTitle 함수 정의 (잘 넣어주셨습니다!)
const cleanTitle = (text: string) => {
  if (!text) return "";
  return text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
};

interface MajorPickCardProps {
  title: string;
  dday?: string;
  category?: string;
  urgent?: boolean;
  isIndigo?: boolean;
  type?: string;
}

export default function MajorPickCard({ title, dday, category, urgent, isIndigo, type }: MajorPickCardProps) {
  return (
    <View style={[styles.card, isIndigo && styles.indigoCard]}>
      {type && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{type}</Text>
        </View>
      )}
      
      <Text style={[styles.category, isIndigo && styles.indigoText]}>
        {category || '공지'}
      </Text>
      
      {/* ✅ 2. 여기가 수정할 위치입니다! {title} -> {cleanTitle(title)} */}
      <Text style={[styles.title, isIndigo && styles.whiteText]} numberOfLines={2}>
        {cleanTitle(title)}
      </Text>
      
      {dday && <Text style={styles.dday}>{dday}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    width: 160, 
    padding: 16, 
    borderRadius: 20, 
    backgroundColor: '#fff', 
    elevation: 2, 
    shadowOpacity: 0.05, 
    borderWidth: 1, 
    borderColor: '#eee' 
  },
  indigoCard: { backgroundColor: '#4F46E5' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', padding: 4, borderRadius: 4, marginBottom: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  category: { fontSize: 10, color: '#94a3b8', marginBottom: 5 },
  indigoText: { color: '#e0e7ff' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', height: 40 },
  whiteText: { color: '#fff' },
  dday: { fontSize: 12, fontWeight: 'bold', color: '#f43f5e', marginTop: 10 }
});