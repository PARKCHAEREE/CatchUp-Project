import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
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
        <View style={styles.logoContainer}>
            <Text style={styles.univName}>KYONGGI UNIV.</Text>
            <Text style={styles.title}>CatchUp<Text style={styles.dot}>.</Text></Text>
        </View>
        
        <TouchableOpacity style={styles.bellBtn} onPress={onOpenActivity}>
          <Bell size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#94a3b8" size={18} style={styles.searchIcon} />
        <TextInput 
          style={styles.input}
          placeholder="궁금한 공지를 입력하세요!" 
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
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 15 : 50, 
    paddingHorizontal: 24,
    paddingBottom: 20, 
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    // 그림자 설정
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15, 
  },
  logoContainer: {
    flexDirection: 'column',
  },
  univName: {
    fontSize: 11, 
    fontWeight: '700',
    color: '#cbd5e1', 
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  title: {
    fontSize: 28, 
    fontWeight: '900',
    color: '#1e293b', 
    lineHeight: 32,
  },
  dot: {
    color: '#6366f1', 
  },
  bellBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F6F8', 
    borderRadius: 25, 
    paddingHorizontal: 16,
    paddingVertical: 10, 
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1e293b',
    padding: 0, 
  },
});