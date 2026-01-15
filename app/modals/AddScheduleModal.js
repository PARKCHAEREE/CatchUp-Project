import React, { useState } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Image 
} from 'react-native';
import { X, Camera, MessageCircle, FileText, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../supabase';

export default function AddScheduleModal({ visible, onClose }) {
  const [sourceType, setSourceType] = useState('kakao'); // 'kakao', 'poster', 'note' 
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 🤖 AI 분석 및 Supabase 등록 로직
  const handleAISubmit = async () => {
    if (sourceType === 'kakao' && !inputText.trim()) {
      return Alert.alert("내용 입력", "카톡 공지 내용을 입력해주세요."); 
    }

    setIsAnalyzing(true);

    // --- [AI VLM 엔진 구동 시뮬레이션] --- [cite: 100, 104]
    // 실제로 AI API(OpenAI 등)를 연결할 지점입니다.
    await new Promise(resolve => setTimeout(resolve, 2000)); 

    const aiExtractedData = {
      title: sourceType === 'kakao' ? "[AI 추출] 단톡방 일정" : "[AI 추출] 이미지 일정", 
      content: inputText || "이미지에서 추출된 공지 내용입니다.",
      category: sourceType === 'kakao' ? "학과" : "학사",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후로 자동 계산 
      summary: "AI가 분석한 핵심 일정입니다. 마감 기한을 준수하세요.", 
      link: "https://www.kyonggi.ac.kr" // 기본 학교 홈페이지 연결 
    };
    // ------------------------------------

    try {
      const { error } = await supabase.from('notices').insert([aiExtractedData]);
      if (error) throw error;

      Alert.alert("등록 완료 ✨"); 
      onClose();
      setInputText('');
    } catch (e) {
      Alert.alert("오류", e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>일정 추가</Text> [cite: 76]
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#94a3b8" /> [cite: 79]
            </TouchableOpacity>
          </View>

          {/* 소스 선택 탭 (기획서 UI 반영) */} [cite: 82, 100]
          <View style={styles.tabContainer}>
            {[
              { id: 'kakao', label: '💬 단톡', icon: <MessageCircle size={18}/> },
              { id: 'poster', label: '🖼️ 포스터', icon: <Camera size={18}/> },
              { id: 'note', label: '📝 필기', icon: <FileText size={18}/> }
            ].map(tab => (
              <TouchableOpacity 
                key={tab.id}
                onPress={() => setSourceType(tab.id)}
                style={[styles.tab, sourceType === tab.id && styles.activeTab]}
              >
                <Text style={[styles.tabText, sourceType === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 입력창 또는 카메라 업로드 UI */} [cite: 89, 93]
          <View style={styles.inputSection}>
            {sourceType === 'kakao' ? (
              <TextInput
                style={styles.textArea}
                placeholder="카톡 공지 내용을 복사해서 붙여넣으세요..." 
                multiline
                value={inputText}
                onChangeText={setInputText}
              />
            ) : (
              <TouchableOpacity style={styles.imageUploadBtn}>
                <Camera size={40} color="#4F46E5" /> [cite: 93]
                <Text style={styles.imageUploadText}>터치해서 사진 업로드</Text> 
                <Text style={styles.imageSubText}>AI가 텍스트를 인식하여 등록합니다</Text> [cite: 89, 104]
              </TouchableOpacity>
            )}
          </View>

          {/* 등록 버튼 */}
          <TouchableOpacity 
            style={[styles.submitBtn, isAnalyzing && styles.disabledBtn]} 
            onPress={handleAISubmit}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.submitBtnText}>AI 분석 중...</Text> 
              </View>
            ) : (
              <Text style={styles.submitBtnText}>등록하기</Text> 
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingBottom: 40 
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { padding: 4 },
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#f1f5f9', 
    borderRadius: 16, 
    padding: 6, 
    marginBottom: 24 
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  activeTabText: { color: '#4F46E5' },
  inputSection: { marginBottom: 24 },
  textArea: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    padding: 20, 
    height: 180, 
    fontSize: 15, 
    textAlignVertical: 'top',
    color: '#334155'
  },
  imageUploadBtn: { 
    height: 180, 
    backgroundColor: '#f5f7ff', 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: '#e0e7ff', 
    borderStyle: 'dashed', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imageUploadText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
  imageSubText: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  submitBtn: { 
    backgroundColor: '#4F46E5', 
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  disabledBtn: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }
});