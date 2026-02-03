import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet } from 'react-native';


const CATEGORIES = ['전체', '학사', '장학', '등록', '취업', '생활', '행사', '비교과', '일반'];
interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

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
    paddingRight: 20, 
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#f3f4f6', 
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterBtn: {
    backgroundColor: '#1f2937', 
    borderColor: '#1f2937',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  activeFilterText: {
    color: '#fff', 
  },
});