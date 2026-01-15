import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Bell, Search } from 'lucide-react-native';

export default function Header({ keyword, setKeyword }) {
  return (
    <View style={styles.headerContainer}>
      {/* 로고 및 알림 아이콘 영역  */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.brandSub}>KYONGGI UNIV.</Text>
          <Text style={styles.brandLogo}>
            CatchUp<Text style={styles.logoDot}>.</Text>
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Bell size={24} color="#1e293b" />
          {/* 알림 배지 (필요 시) */}
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* 검색바 영역  */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="궁금한 공지를 검색해보세요"
          placeholderTextColor="#94a3b8"
          value={keyword}
          onChangeText={setKeyword}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    // 하단 그림자 효과
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: 1,
  },
  brandLogo: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1e293b',
  },
  logoDot: {
    color: '#4F46E5', // 기획서의 포인트 컬러 (인디고)
  },
  iconBtn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    backgroundColor: '#ef4444',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
});