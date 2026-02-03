import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, Bell } from 'lucide-react-native';

interface HeaderProps {
  keyword: string;
  setKeyword: (text: string) => void;
  onOpenActivity: () => void;
}

export default function Header({ keyword, setKeyword, onOpenActivity }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View>
            <Text style={styles.title}>CatchUp<Text style={styles.dot}>.</Text></Text>
            <Text style={styles.subtitle}>경기대 주요 공지를 한눈에!</Text>
        </View>
        
        <TouchableOpacity style={styles.bellBtn} onPress={onOpenActivity}>
          <Bell size={24} color="#1e293b" />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={20} />
        <TextInput 
          style={styles.input}
          placeholder="궁금한 공지 키워드 검색..."
          placeholderTextColor="#94a3b8"
          value={keyword}
          onChangeText={setKeyword}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60, 
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1e293b',
  },
  dot: {
    color: '#4F46E5',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  bellBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    padding: 0, 
  },
});