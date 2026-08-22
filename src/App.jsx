import React, { useState } from 'react';
import { Lock, Radio, KeyRound, Sparkles, ShieldAlert } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e) => {
    e.preventDefault();
    if (inputCode.trim() === 'ybs2026') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('올바른 인증 코드가 아닙니다.');
    }
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
            <p className="text-sm text-slate-500 mt-1">방송부 전용 서비스 접근을 위해 인증 코드를 입력하세요.</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">인증 코드</label>
              <div className="relative">
                <input
                  type="password"
                  value={inputCode}
                  onChange={(e) => {
                    setInputCode(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="인증 코드를 입력하세요"
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm"
                />
                <KeyRound className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
              </div>
              {error && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 ml-1">
                  <ShieldAlert size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm"
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
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600">
            <Sparkles size={14} className="text-amber-500" />
            <span>방송부 전용</span>
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