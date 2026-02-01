import React, { useState } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Image 
} from 'react-native';
import { X, Camera, MessageCircle, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore: supabase.js가 js파일이라 타입 추론이 안 될 경우를 대비해 ignore 처리하거나 supabase.ts로 변환 권장
import { supabase } from '../supabase'; 

// Props 타입 정의
interface AddScheduleModalProps {
  visible: boolean;
  onClose: () => void;
}

// 소스 타입 정의 (오타 방지)
type SourceType = 'kakao' | 'poster' | 'note';

// 서버 URL (본인 IP로 변경 필요)
const SERVER_URL = 'http://192.168.0.x:8000'; 

export default function AddScheduleModal({ visible, onClose }: AddScheduleModalProps) {
  // State에 제네릭(<SourceType>)을 사용하여 허용된 문자열만 들어가도록 제한
  const [sourceType, setSourceType] = useState<SourceType>('kakao'); 
  const [inputText, setInputText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 부족', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

// 수정된 handleAISubmit 함수
  const handleAISubmit = async () => {
    // 카카오톡 케이스 처리 (여기서 return 되면 아래 코드는 실행 안 됨)
    if (sourceType === 'kakao') {
       Alert.alert("알림", "카카오톡 분석 기능은 아직 백엔드에 구현되지 않았습니다.");
       return;
    }
    
    // 위에서 'kakao'가 걸러졌으므로, 여기는 무조건 'poster'나 'note'입니다.
    if (!selectedImage) {
      return Alert.alert("이미지 없음", "분석할 이미지를 업로드해주세요."); 
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      const filename = selectedImage?.split('/').pop() || 'upload.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: selectedImage,
        name: filename,
        type: type,
      } as any);

      const response = await fetch(`${SERVER_URL}/api/case-b`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "서버 오류 발생");
      }

      Alert.alert("등록 완료 ✨", `"${result.title}" 일정이 추가되었습니다.`);
      onClose();
      setSelectedImage(null);
      setInputText('');
      
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
        <View style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>일정 추가</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* 탭 버튼 */}
          <View style={styles.tabContainer}>
            {([
              { id: 'kakao', label: '💬 단톡', icon: <MessageCircle size={18}/> },
              { id: 'poster', label: '🖼️ 포스터', icon: <Camera size={18}/> },
              { id: 'note', label: '📝 필기', icon: <FileText size={18}/> }
            ] as const).map((tab) => (
              <TouchableOpacity 
                key={tab.id}
                onPress={() => setSourceType(tab.id as SourceType)}
                style={[styles.tab, sourceType === tab.id && styles.activeTab]}
              >
                <Text style={[styles.tabText, sourceType === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 입력 섹션 */}
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
              <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={{ width: '100%', height: '100%', borderRadius: 16 }} resizeMode="cover" />
                ) : (
                  <>
                    <Camera size={40} color="#4F46E5" />
                    <Text style={styles.imageUploadText}>터치해서 사진 업로드</Text> 
                    <Text style={styles.imageSubText}>AI가 텍스트를 인식하여 등록합니다</Text>
                  </>
                )}
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
  container: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  closeBtn: { padding: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 6, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1 },
  tabText: { fontSize: 13, fontWeight: 'bold', color: '#94a3b8' },
  activeTabText: { color: '#4F46E5' },
  inputSection: { marginBottom: 24 },
  textArea: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 20, height: 180, fontSize: 15, textAlignVertical: 'top', color: '#334155' },
  imageUploadBtn: { height: 180, backgroundColor: '#f5f7ff', borderRadius: 20, borderWidth: 2, borderColor: '#e0e7ff', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imageUploadText: { marginTop: 12, fontSize: 16, fontWeight: 'bold', color: '#4F46E5' },
  imageSubText: { marginTop: 4, fontSize: 12, color: '#94a3b8' },
  submitBtn: { backgroundColor: '#4F46E5', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 5, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  disabledBtn: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }
});