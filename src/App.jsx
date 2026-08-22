import React, { useState } from 'react';
import { Lock, Radio, KeyRound, Sparkles, ShieldAlert, Eye, EyeOff, User, GraduationCap } from 'lucide-react';

// 방송부 부원 명단 데이터 (검증용)
const STUDENT_DATA = {
  '1': ['조민욱', '김담영', '백승준', '옥지윤', '임하늘'],
  '2': ['이상혁', '안지환', '김아린', '한유정', '조민서'],
  '3': ['김동건', '최승아', '김지민', '박현준'],
};

export default function App() {
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [error, setError] = useState('');

  // 학년 변경 시 입력값 초기화
  const handleGradeChange = (e) => {
    setGrade(e.target.value);
    setError('');
  };

  // 인증 제출 처리
  const handleAuth = (e) => {
    e.preventDefault();

    if (!grade) {
      setError('학년을 선택해 주세요.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('이름을 입력해 주세요.');
      return;
    }

    const validNames = STUDENT_DATA[grade] || [];
    if (!validNames.includes(trimmedName)) {
      setError('선택한 학년에 입력하신 이름의 부원이 없습니다.');
      return;
    }

    if (inputCode.trim() !== 'ybs2026') {
      setError('올바른 인증 코드가 아닙니다.');
      return;
    }

    // 모든 검증 통과시 인증 성공
    setIsAuthenticated(true);
    setUserSession({ grade, name: trimmedName });
    setError('');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Radio size={28} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">YBS Helper</h1>
            <p className="text-sm text-slate-500 mt-1">방송부 부원 신원 확인 후 서비스에 접근할 수 있습니다.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {/* 학년 선택 */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">학년</label>
              <div className="relative">
                <select
                  value={grade}
                  onChange={handleGradeChange}
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm appearance-none cursor-pointer text-slate-800"
                >
                  <option value="">학년을 선택하세요</option>
                  <option value="1">1학년</option>
                  <option value="2">2학년</option>
                  <option value="3">3학년</option>
                </select>
                <GraduationCap className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            {/* 이름 텍스트 입력 */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">이름</label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm text-slate-800"
                />
                <User className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            {/* 인증 코드 (눈 모양 토글) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">인증 코드</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="인증 코드를 입력하세요"
                  className="w-full px-4 py-3.5 pl-11 pr-11 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm"
                />
                <KeyRound className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  aria-label="인증 코드 보기 토글"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 ml-1">
                <ShieldAlert size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm mt-2"
            >
              인증하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-800">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center">
              <Radio size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none">YBS Helper</h1>
              <span className="text-xs text-slate-400 font-medium">ybs.ygmhelper.xyz</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
              {userSession?.grade}학년 {userSession?.name}
            </div>
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-medium text-[#1a73e8]">
              <Sparkles size={14} className="text-amber-500" />
              <span>방송부 전용</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-slate-900">서비스 목록</h2>
          <p className="text-sm text-slate-500 mt-1">사용 가능한 방송부 지원 도구 모음입니다.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                  <Lock size={22} />
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                  접근 불가
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">보물찾기</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                방송부 이벤트 전용 보물찾기 관리 도구입니다. 현재 서비스 준비 중입니다.
              </p>
            </div>

            <div className="mt-6">
              <button
                disabled
                className="w-full py-3 bg-slate-100 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock size={14} />
                <span>현재 입장할 수 없습니다</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}