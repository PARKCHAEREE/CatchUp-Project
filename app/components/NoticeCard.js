import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MessageCircle, Star } from 'lucide-react-native';

export default function NoticeCard({ title, category, source }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBox}><MessageCircle size={20} color="#4F46E5" /></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subText}>{category} • {source}</Text>
      </View>
      <Star size={18} color="#cbd5e1" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, marginBottom: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#334155' },
  subText: { fontSize: 12, color: '#94a3b8', marginTop: 2 }
});