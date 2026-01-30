import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';

// 기획서에 정의된 카테고리 목록 
const CATEGORIES = ['전체', '학과', '장학', '학사', '취업', '행사', '비교과'];

// ✅ 1. Props 타입 정의 (인터페이스)
// 부모 컴포넌트(HomeScreen)가 넘겨주는 데이터의 모양을 정의합니다.
interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

// ✅ 2. 타입 적용 (: CategoryFilterProps)
export default function CategoryFilter({ selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {CATEGORIES.map((cat) => (
        <TouchableOpacity
          key={cat}
          onPress={() => onSelectCategory(cat)}
          style={[
            styles.filterBtn,
            selectedCategory === cat && styles.activeFilterBtn
          ]}
        >
          <Text style={[
            styles.filterText,
            selectedCategory === cat && styles.activeFilterText
          ]}>
            {cat}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  contentContainer: {
    paddingRight: 20, // 마지막 아이템 여백
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6', // 기본 배경색
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterBtn: {
    backgroundColor: '#1f2937', // 기획서의 선택된 탭 검정색 배경
    borderColor: '#1f2937',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: '#fff', // 선택된 탭 흰색 글자
  },
});