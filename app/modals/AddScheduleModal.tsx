import React, { useState } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Image, Platform, 
  KeyboardAvoidingView, ScrollView 
} from 'react-native';
import { X, Camera, MessageCircle, FileText, Calendar as CalendarIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker'; 

interface AddScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

type SourceType = 'kakao' | 'poster' | 'note';

// 서버 URL (본인 IP 확인)
const SERVER_URL = 'http://192.168.0.103:8000'; 

export default function AddScheduleModal({ visible, onClose }: AddScheduleModalProps) {
  const [sourceType, setSourceType] = useState<SourceType>('kakao'); 
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 부족', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  // 텍스트/이미지 로직 분리
  const handleAISubmit = async () => {
    if (sourceType === 'kakao') {
        if (!inputText.trim()) return Alert.alert("입력 오류", "공지 내용을 입력해주세요.");
    } else {
        if (!selectedImage) return Alert.alert("입력 오류", "분석할 사진을 선택해주세요.");
    }

    setIsAnalyzing(true);

    try {
      let response;
      const userDeadlineStr = selectedDate ? selectedDate.toISOString().split('T')[0] : null;

      if (sourceType === 'kakao') {
        // 텍스트 분석 요청
        response = await fetch(`${SERVER_URL}/api/analyze-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: inputText,
                user_deadline: userDeadlineStr
            })
        });
      } else {
        // 이미지 분석 요청
        const formData = new FormData();
        const filename = selectedImage?.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append('image', {
          uri: selectedImage,
          name: filename,
          type: type,
        } as any);

        if (userDeadlineStr) {
            formData.append('user_deadline', userDeadlineStr);
        }

        response = await fetch(`${SERVER_URL}/api/case-b`, {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "서버 오류 발생");
      }

      Alert.alert("등록 완료 ✨", `"${result.title}" 일정이 추가되었습니다.`);
      
      onClose();
      setSelectedImage(null);
      setInputText('');
      setSelectedDate(null);
      
    } catch (e: any) {
      console.error(e);
      Alert.alert("오류", e.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ width: '100%' }}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>일정 추가</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabContainer}>
              {([
                { id: 'kakao', label: '💬 공지 텍스트', icon: <MessageCircle size={18}/> },
                { id: 'poster', label: '🖼️ 포스터', icon: <Camera size={18}/> },
                { id: 'note', label: '📝 필기', icon: <FileText size={18}/> }
              ] as const).map((tab) => (
                <TouchableOpacity 
                  key={tab.id}
                  onPress={() => {
                    setSourceType(tab.id as SourceType);
                    setInputText('');
                    setSelectedImage(null);
                  }}
                  style={[styles.tab, sourceType === tab.id && styles.activeTab]}
                >
                  <Text style={[styles.tabText, sourceType === tab.id && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <View style={styles.inputSection}>
                {sourceType === 'kakao' ? (
                  <TextInput
                    style={styles.textArea}
                    placeholder="카톡 공지 내용을 붙여넣으세요..."
                    multiline
                    value={inputText}
                    onChangeText={setInputText}
                  />
                ) : (
                  <View style={styles.imageContainer}>
                    {selectedImage ? (
                      <View style={styles.previewWrapper}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="cover" />

                        <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                          <View style={styles.removeIconWrapper}>
                            <X size={16} color="#fff" />
                          </View>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                        <Camera size={40} color="#4F46E5" />
                        <Text style={styles.imageUploadText}>
                          {sourceType === 'poster' ? "포스터/공문 사진 업로드" : "필기한 노트 사진 업로드"}
                        </Text> 
                        <Text style={styles.imageSubText}>AI가 이미지를 분석하여 등록합니다</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity 
                  style={styles.dateBtn} 
                  onPress={() => setShowDatePicker(true)}
              >
                  <CalendarIcon size={20} color="#4F46E5" />
                  <Text style={styles.dateBtnText}>
                      {selectedDate 
                      ? `마감일: ${selectedDate.getFullYear()}-${selectedDate.getMonth()+1}-${selectedDate.getDate()}` 
                      : "마감일 설정"}
                  </Text>
              </TouchableOpacity>

              {showDatePicker && (
                  <DateTimePicker
                  value={selectedDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  />
              )}
            </ScrollView>

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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { padding: 4 },

  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 6, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  activeTabText: { color: '#4F46E5' },

  inputSection: { marginBottom: 16 }, 
  textArea: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, height: 180, fontSize: 15, textAlignVertical: 'top', color: '#334155' },
  
  imageContainer: { width: '100%', height: 180 },
  previewWrapper: { width: '100%', height: '100%', position: 'relative' },
  previewImage: { width: '100%', height: '100%', borderRadius: 16 },
  
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  removeIconWrapper: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },

  imageUploadBtn: { height: 180, backgroundColor: '#f5f7ff', borderRadius: 20, borderWidth: 2, borderColor: '#e0e7ff', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imageUploadText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
  imageSubText: { marginTop: 4, fontSize: 12, color: '#94a3b8' },

  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, justifyContent: 'center', gap: 8, marginBottom: 24 },
  dateBtnText: { color: '#4F46E5', fontWeight: 'bold', fontSize: 15 },

  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 5, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  disabledBtn: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }
});