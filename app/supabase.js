import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// ⚠️ 아래 두 정보는 본인의 Supabase 프로젝트 설정(Project Settings > API)에서 확인하세요!
const supabaseUrl = 'https://kxdqmwgukkvhbtnasjdj.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_AGLaY5wo2ahKBPpFL_P3eg_XOfD5QJv';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);