import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MajorPickCard({ title, dday, category, urgent, isIndigo, type }) {
  return (
    <View style={[styles.card, isIndigo && styles.indigoCard]}>
      {type && <View style={styles.badge}><Text style={styles.badgeText}>{type}</Text></View>}
      <Text style={[styles.category, isIndigo && styles.indigoText]}>{category || '공지'}</Text>
      <Text style={[styles.title, isIndigo && styles.whiteText]} numberOfLines={2}>{title}</Text>
      {dday && <Text style={styles.dday}>{dday}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: 160, padding: 16, borderRadius: 20, backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.05, borderWeight: 1, borderColor: '#eee' },
  indigoCard: { backgroundColor: '#4F46E5' },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', padding: 4, borderRadius: 4, marginBottom: 5 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  category: { fontSize: 10, color: '#94a3b8', marginBottom: 5 },
  indigoText: { color: '#e0e7ff' },
  title: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', height: 40 },
  whiteText: { color: '#fff' },
  dday: { fontSize: 12, fontWeight: 'bold', color: '#f43f5e', marginTop: 10 }
});