import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, Modal, ScrollView 
} from 'react-native';
import { supabase } from '../supabase';
import { ChevronDown, Check } from 'lucide-react-native';

// 경기대학교 전체 학과/전공 리스트 
const MAJORS = [
  // [자유교양대학]
  '교직학부', '자유전공학부(수원)',
  
  // [인문대학]
  '국어국문학과', '영어영문학과', '사학과', '문헌정보학과', '문예창작학과', '유아교육과',
  '독어독문전공', '프랑스어문전공', '일어일문전공', '중어중문전공', '러시아어문전공',

  // [예술체육대학]
  '입체조형학과', '체육학과', '시큐리티매니지먼트학과',
  '시각정보디자인전공', '산업디자인전공', '장신구금속디자인전공',
  '한국화전공', '서양화전공', '미술경영전공', '서예전공',
  '스포츠건강과학전공', '스포츠레저산업전공',

  // [사회과학대학]
  '법학과', '무역학과',
  '범죄교정심리학전공', '경찰행정학전공',
  '사회복지학전공', '청소년학전공',
  '행정학전공', '정치외교학전공',
  '경제학전공', '응용통계학전공', '지식재산학전공',

  // [소프트웨어경영대학]
  '경영학전공', '회계세무학전공', 
  '산업경영공학과', 
  '컴퓨터공학전공', '인공지능전공', 'SW안전보안전공', '모빌리티SW전공',

  // [융합과학대학]
  '수학과', '화학과', 
  '생명과학전공', '식품생물공학전공',

  // [창의공과대학]
  '건축학과', '사회에너지시스템공학과', '기계시스템공학과',
  '나노ㆍ반도체전공', '정보통신시스템전공',
  '신소재공학전공', '화학공학전공',
  '건축공학전공', '도시ㆍ교통공학전공',
  '건축안전공학과',

  // [관광문화대학]
  '관광개발경영학과', 
  '호텔경영전공', '외식·조리전공',
  '관광문화콘텐츠학과', '외식조리·관광서비스학과',
  '미디어영상학과', '실용음악학과', '연기학과', '애니메이션학과',
  '자유전공학부(서울)'
];

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('');
  
  // OTP(인증번호) 관련 상태
  const [otp, setOtp] = useState('');
  const [isOtpVisible, setIsOtpVisible] = useState(false); // 인증번호 입력창 보이기 여부

  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // 로그인 처리
  const handleLogin = async () => {
    if (!email || !password) return Alert.alert("알림", "이메일과 비밀번호를 입력해주세요.");
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
       if (error.message.includes("Email not confirmed")) {
            Alert.alert("인증 필요", "이메일 인증이 안 됐습니다.\n스팸함을 확인해서 인증번호를 입력해주세요.");
            setIsLoginMode(false); // 회원가입 모드로 보내서 인증번호 입력 유도
            setIsOtpVisible(true); // 인증번호 창 열어주기
       } else {
            Alert.alert("로그인 실패", error.message);
       }
    }
    setLoading(false);
  };

  // 회원가입 요청 (OTP 전송)
  const handleSignUp = async () => {
    if (!email || !password || !name || !selectedMajor) {
      return Alert.alert("알림", "모든 정보를 입력해주세요.");
    }

    const isValidDomain = email.endsWith('@kyonggi.ac.kr') || email.endsWith('@kgu.ac.kr');
    if (!isValidDomain) {
        Alert.alert("가입 제한", "경기대학교 웹메일(@kyonggi.ac.kr)로만 가입할 수 있습니다.");
        return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: { full_name: name, major: selectedMajor },
      },
    });

    if (error) {
      Alert.alert("회원가입 실패", error.message);
    } else {
      // 성공하면 인증번호 입력창 띄움
      setIsOtpVisible(true);
      Alert.alert("인증번호 발송 📩", "메일함(스팸함)을 확인하여 6자리 인증번호를 입력해주세요.");
    }
    setLoading(false);
  };

  // 인증번호 확인 함수
  const handleVerifyOtp = async () => {
    if (!otp) return Alert.alert("알림", "인증번호를 입력해주세요.");

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email,
      token: otp,
      type: 'signup' // 회원가입 인증 타입
    });

    if (error) {
      Alert.alert("인증 실패", "인증번호가 틀렸거나 만료되었습니다.");
    } else {
      Alert.alert("환영합니다!", "인증이 완료되었습니다. 자동으로 로그인됩니다.");
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>CatchUp<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.subTitle}>
          {isLoginMode ? "경기대 공지, 놓치지 마세요!" : "경기대생 인증이 필요합니다"}
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="학교 이메일 (@kyonggi.ac.kr)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!isOtpVisible} // 인증 중엔 이메일 수정 불가
        />
        
        {/* 인증번호 입력 모드일 때는 비밀번호/이름 창 숨김 */}
        {!isOtpVisible && (
          <TextInput
            style={styles.input}
            placeholder="비밀번호 (6자리 이상)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        )}

        {/* 회원가입 모드 + 인증 전일 때만 이름/학과 보임 */}
        {!isLoginMode && !isOtpVisible && (
          <>
            <TextInput
              style={styles.input}
              placeholder="이름 (예: 김경기)"
              value={name}
              onChangeText={setName}
            />
            <TouchableOpacity 
              style={[styles.input, styles.selectorBtn]} 
              onPress={() => setIsModalVisible(true)}
            >
              <Text style={selectedMajor ? styles.inputText : styles.placeholderText}>
                {selectedMajor || "학과를 선택해주세요"}
              </Text>
              <ChevronDown size={20} color="#94a3b8" />
            </TouchableOpacity>
          </>
        )}

        {/* 인증번호 입력칸 (OTP 모드일 때만 등장) */}
        {isOtpVisible && (
          <View style={styles.otpContainer}>
             <Text style={styles.otpLabel}>메일로 전송된 6자리 숫자를 입력하세요</Text>
             <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        )}
      </View>

      {/* 버튼 로직: 로그인 vs 회원가입 vs 인증확인 */}
      <TouchableOpacity 
        style={styles.btn} 
        onPress={
          isOtpVisible ? handleVerifyOtp : (isLoginMode ? handleLogin : handleSignUp)
        }
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>
            {isOtpVisible ? "인증번호 확인" : (isLoginMode ? "로그인" : "인증번호 받기")}
          </Text>
        )}
      </TouchableOpacity>

      {/* 모드 전환 버튼 (인증 중엔 숨김) */}
      {!isOtpVisible && (
        <TouchableOpacity 
          style={styles.switchBtn} 
          onPress={() => {
            setIsLoginMode(!isLoginMode);
            setEmail(''); setPassword(''); setName(''); setSelectedMajor('');
          }}
        >
          <Text style={styles.switchText}>
            {isLoginMode ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
          </Text>
        </TouchableOpacity>
      )}

      {/* 학과 선택 모달 */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>학과 선택</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Text style={styles.closeText}>닫기</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={true}>
              {MAJORS.map((major, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.majorItem}
                  onPress={() => {
                    setSelectedMajor(major);
                    setIsModalVisible(false);
                  }}
                >
                  <Text style={[styles.majorText, selectedMajor === major && styles.selectedMajorText]}>
                    {major}
                  </Text>
                  {selectedMajor === major && <Check size={18} color="#4F46E5" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginBottom: 30 },
  brand: { fontSize: 32, fontWeight: '900', color: '#1e293b' },
  dot: { color: '#4F46E5' },
  subTitle: { color: '#64748b', marginTop: 8, fontSize: 14 },
  inputContainer: { gap: 12, marginBottom: 20 },
  input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, fontSize: 15, color: '#1e293b' },
  selectorBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inputText: { color: '#1e293b' },
  placeholderText: { color: '#94a3b8' },
  btn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  switchBtn: { alignItems: 'center', marginTop: 16, padding: 10 },
  switchText: { color: '#64748b', fontSize: 13 },
  otpContainer: { marginTop: 10 },
  otpLabel: { color: '#4F46E5', fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  otpInput: { borderColor: '#4F46E5', borderWidth: 1, backgroundColor: '#fff', textAlign: 'center', fontSize: 24, letterSpacing: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  closeText: { color: '#64748b', fontSize: 14 },
  majorItem: { paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  majorText: { fontSize: 16, color: '#334155' },
  selectedMajorText: { color: '#4F46E5', fontWeight: 'bold' },
});