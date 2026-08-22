import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  Radio,
  KeyRound,
  Sparkles,
  ShieldAlert,
  Eye,
  EyeOff,
  User,
  GraduationCap,
  ShieldCheck,
  ChevronLeft,
  Headphones,
  Play,
  Square,
  RotateCcw,
  Trophy,
  Gift,
  ArrowRight,
  Timer,
  Award,
  Volume2
} from 'lucide-react';

// 방송부 부원 명단 데이터 (검증용)
const STUDENT_DATA = {
  '1': ['조민욱', '김담영', '백승준', '옥지윤', '임하늘'],
  '2': ['이상혁', '안지환', '김아린', '한유정', '조민서'],
  '3': ['김동건', '최승아', '김지민', '박현준'],
};

// 관리자 명단 데이터
const ADMIN_DATA = [
  { grade: '3', name: '최승아' },
  { grade: '2', name: '이상혁' },
];

export default function App() {
  // 인증 관련 상태
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [error, setError] = useState('');

  // 화면 이동 상태 ('main' | 'treasure_menu' | 'game_register' | 'game_guide' | 'game_play' | 'game_result' | 'settlement')
  const [activeView, setActiveView] = useState('main');

  // 미니게임 참가 학생 정보
  const [participantId, setParticipantId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantError, setParticipantError] = useState('');

  // 타이머 게임 관련 상태
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stoppedTime, setStoppedTime] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  // 결과 화면 마커 애니메이션 위치 상태 (%)
  const [animatedPos, setAnimatedPos] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  // 컴포넌트 마운트 시 오디오 사전 로딩 설정
  useEffect(() => {
    const audio = new Audio('/10sTimer.mp3');
    audio.preload = 'auto';
    audio.loop = true;
    audio.load();
    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // 화면 이동 시 오디오 및 상태 제어
  useEffect(() => {
    if ((activeView === 'game_guide' || activeView === 'game_register') && audioRef.current) {
      audioRef.current.load();
    }
    if (activeView !== 'game_play' && audioRef.current) {
      audioRef.current.pause();
    }
    if (activeView === 'game_play') {
      setTime(0);
      setIsRunning(false);
    }
  }, [activeView]);

  // 결과 화면 진입 시 마커 슬라이딩 애니메이션 실행
  useEffect(() => {
    if (activeView === 'game_result' && gameResult) {
      setAnimatedPos(0);
      const timer = setTimeout(() => {
        const targetPos = Math.min((gameResult.stoppedTime / 12) * 100, 100);
        setAnimatedPos(targetPos);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeView, gameResult]);

  // 학년 변경 시 입력값 초기화
  const handleGradeChange = (e) => {
    setGrade(e.target.value);
    setError('');
  };

  // 관리자 여부 확인 함수
  const checkIsAdmin = (gradeVal, nameVal) => {
    return ADMIN_DATA.some(
      (admin) => admin.grade === gradeVal && admin.name === nameVal
    );
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

    const isAdmin = checkIsAdmin(grade, trimmedName);
    setIsAuthenticated(true);
    setUserSession({ grade, name: trimmedName, isAdmin });
    setError('');
  };

  // 학생 등록 제출
  const handleRegisterParticipant = (e) => {
    e.preventDefault();
    if (!participantId.trim()) {
      setParticipantError('학번을 입력해 주세요. (예: 10101)');
      return;
    }
    if (!participantName.trim()) {
      setParticipantError('이름을 입력해 주세요.');
      return;
    }
    setParticipantError('');
    setActiveView('game_guide');
  };

  // 타이머 시작 (0~165초 사이 무작위 위치에서 시작)
  const startGame = () => {
    setTime(0);
    setStoppedTime(null);
    setGameResult(null);
    setIsRunning(true);
    startTimeRef.current = Date.now();

    if (audioRef.current) {
      const randomStart = Math.random() * 165;
      
      try {
        audioRef.current.currentTime = randomStart;
      } catch (e) {
        console.log('초기 위치 설정 예외:', e);
      }

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = randomStart;
            }
          })
          .catch((err) => {
            console.log('오디오 자동 재생 제한:', err);
          });
      }
    }

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setTime(elapsed);
    }, 10);
  };

  // 타이머 정지 및 음악 정지
  const stopGame = () => {
    clearInterval(timerRef.current);
    const finalTime = (Date.now() - startTimeRef.current) / 1000;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTime(finalTime);
    setStoppedTime(finalTime);
    setIsRunning(false);

    // 평가 로직
    const roundedTime = Number(finalTime.toFixed(2));
    const diff = Math.abs(roundedTime - 10.0);

    let rank = '';
    let coupons = 0;

    if (diff === 0) {
      rank = '완벽';
      coupons = 3;
    } else if (diff <= 0.05) {
      rank = '초근접';
      coupons = 2;
    } else if (diff <= 0.25) {
      rank = '근접';
      coupons = 1;
    } else {
      rank = '실패';
      coupons = 0;
    }

    setGameResult({
      stoppedTime: roundedTime,
      diff: diff.toFixed(2),
      rank,
      coupons,
    });
    setActiveView('game_result');
  };

  // 타이머 정리
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // 타이머 투명도 계산 (동일한 속도로 선형 투명해지며, 시작 후 정확히 1.0초에 완전히 사라짐)
  const getTimerOpacity = () => {
    if (!isRunning) return 1;
    if (time >= 1.0) return 0;
    return Math.max(0, 1.0 - time);
  };

  // 00.00 포맷 변환
  const formatDisplayTime = (val) => {
    return val.toFixed(2).padStart(5, '0');
  };

  // 부원 인증 화면
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
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 ml-1">
                <ShieldAlert size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm mt-2 cursor-pointer"
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
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0" onClick={() => setActiveView('main')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center shrink-0">
              <Radio size={20} className="sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">YBS Helper</h1>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">ybs.ygmhelper.xyz</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-slate-600 whitespace-nowrap">
              <span>{userSession?.grade}학년 {userSession?.name}</span>
              {userSession?.isAdmin && (
                <span className="flex items-center gap-0.5 sm:gap-1 bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-md text-[10px] sm:text-[11px] whitespace-nowrap">
                  <ShieldCheck size={11} />
                  관리자
                </span>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full text-xs font-medium text-[#1a73e8] whitespace-nowrap">
              <Sparkles size={14} className="text-amber-500" />
              <span>방송부 전용</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
        {/* 1. 서비스 메인 목록 */}
        {activeView === 'main' && (
          <div>
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl font-bold text-slate-900">서비스 목록</h2>
              <p className="text-sm text-slate-500 mt-1">사용 가능한 방송부 지원 도구 모음입니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                onClick={() => setActiveView('treasure_menu')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-[#1a73e8] transition-colors">
                      <Trophy size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                      사용 가능
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8] transition-colors">
                    보물찾기
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    방송부 미니게임 진행 및 간식 보상 정산 시스템입니다.
                  </p>
                </div>

                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl group-hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <span>입장하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. 보물찾기 옵션 선택 화면 */}
        {activeView === 'treasure_menu' && (
          <div>
            <button
              onClick={() => setActiveView('main')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>메인으로 돌아가기</span>
            </button>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900">보물찾기 모드 선택</h2>
              <p className="text-sm text-slate-500 mt-1">진행할 보물찾기 서비스 모드를 선택하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm opacity-60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center">
                      <Lock size={22} />
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                      접근 불가
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">서비스 연동</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    실제 보물 데이터 및 시스템과 연동하여 실시간으로 이벤트를 진행합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button disabled className="w-full py-3 bg-slate-100 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed">
                    현재 사용할 수 없습니다
                  </button>
                </div>
              </div>

              <div
                onClick={() => setActiveView('game_register')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center">
                      <Timer size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-[#1a73e8] text-xs font-semibold rounded-full">
                      테스트 가능
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8] transition-colors">
                    올인원 테스트
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    10초 맞추기 미니게임 체험 및 간식권 보상 정산 테스트를 진행합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl group-hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <span>시작하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. 학생 등록 화면 */}
        {activeView === 'game_register' && (
          <div className="max-w-md mx-auto">
            <button
              onClick={() => setActiveView('treasure_menu')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>모드 선택으로 돌아가기</span>
            </button>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <User size={24} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">참가 학생 정보 등록</h2>
                <p className="text-xs text-slate-500 mt-1">미니게임을 진행할 학생의 정보를 입력하세요.</p>
              </div>

              <form onSubmit={handleRegisterParticipant} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">학번</label>
                  <input
                    type="text"
                    value={participantId}
                    onChange={(e) => {
                      setParticipantId(e.target.value);
                      if (participantError) setParticipantError('');
                    }}
                    placeholder="예: 10101"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">이름</label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => {
                      setParticipantName(e.target.value);
                      if (participantError) setParticipantError('');
                    }}
                    placeholder="학생 이름 입력"
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8] transition-all text-sm"
                  />
                </div>

                {participantError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 ml-1">
                    <ShieldAlert size={14} />
                    <span>{participantError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm mt-2 cursor-pointer"
                >
                  다음 (안내 확인)
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. 미니게임 진행 안내 화면 */}
        {activeView === 'game_guide' && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setActiveView('game_register')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>학생 등록으로 돌아가기</span>
            </button>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <span className="px-3 py-1 bg-blue-50 text-[#1a73e8] text-xs font-semibold rounded-full">
                  {participantId} {participantName} 학생
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-3">10초 맞추기 게임 안내</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Headphones size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">1. 헤드셋 착용</h4>
                    <p className="text-xs text-slate-500 mt-0.5">준비된 헤드셋을 착용하고 나오는 오디오 방해 요소에 현혹되지 마세요.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Play size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">2. 시작 및 정지</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      다음 화면에서 시작 버튼을 누르면 타이머가 동작합니다. 마음속으로 초를 세어 <b>10초에 가장 가까울 때</b> 정지 버튼을 누르세요.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 text-xs text-amber-800">
                  <b>💡 주의:</b> 타이머 숫자는 시작과 동시에 일정한 속도로 점차 투명해져 <b>1초 후에 완전히 사라집니다!</b> 정지 버튼을 누르면 시간이 다시 나타납니다.
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveView('game_play');
                }}
                className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>테스트 화면으로 이동</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 5. 타이머 게임 진행 화면 */}
        {activeView === 'game_play' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              <div className="mb-2 text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
                <span>{participantId} {participantName} 학생 도전 중</span>
                {isRunning && <Volume2 size={14} className="text-blue-500 animate-pulse" />}
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-6">10.00초에 맞춰 정지하세요!</h3>

              <div className="h-36 flex items-center justify-center my-4 bg-slate-50/70 rounded-3xl border border-slate-100">
                <div
                  style={{ opacity: getTimerOpacity() }}
                  className="text-7xl font-black tracking-tight text-slate-900 font-mono select-none"
                >
                  {formatDisplayTime(time)}
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-8">
                {isRunning ? (time < 1.0 ? '숫자가 사라지는 중...' : '감각으로 10초를 맞추세요!') : '준비되면 아래 시작 버튼을 누르세요'}
              </p>

              {isRunning ? (
                <button
                  onClick={stopGame}
                  className="w-full py-5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-2xl transition-colors shadow-md text-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square size={22} />
                  <span>정지 (STOP)</span>
                </button>
              ) : (
                <button
                  onClick={startGame}
                  className="w-full py-5 bg-[#1a73e8] hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl transition-colors shadow-md text-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={22} />
                  <span>시작 (START)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 6. 미니게임 결과 및 평가 화면 (마커 슬라이딩 애니메이션 적용) */}
        {activeView === 'game_result' && gameResult && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50 text-[#1a73e8]">
                <Award size={32} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">도전 결과</h2>
              <p className="text-xs text-slate-500 mb-6">{participantId} {participantName} 학생의 기록입니다.</p>

              {/* 기록 디스플레이 */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 mb-1">최종 기록</div>
                <div className="text-5xl font-black text-slate-900 font-mono mb-2">
                  {formatDisplayTime(gameResult.stoppedTime)}초
                </div>
                <div className="text-xs font-semibold text-slate-500 mb-6">
                  목표(10.00초)와 오차: <span className="text-[#1a73e8]">{gameResult.diff}초</span>
                </div>

                {/* 0초 ~ 12초 시각적 트랙 바 */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-left">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mb-2">
                    <span>타임라인 분석 (0초 ~ 12초)</span>
                    <span className="text-xs text-[#1a73e8]">
                      {gameResult.stoppedTime >= 12 ? '12.00s+' : `${formatDisplayTime(gameResult.stoppedTime)}초`}
                    </span>
                  </div>

                  <div className="relative w-full h-7 bg-slate-200/80 rounded-xl overflow-hidden my-2 border border-slate-300/50">
                    {/* 근접 구간 영역 */}
                    <div
                      className="absolute top-0 bottom-0 bg-blue-300 -translate-x-1/2"
                      style={{ left: '83.3333%', width: '4.1667%' }}
                      title="근접 구간 (±0.25초)"
                    ></div>

                    {/* 초근접 구간 영역 */}
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500 z-10 -translate-x-1/2"
                      style={{ left: '83.3333%', width: 'max(0.8333%, 6px)' }}
                      title="초근접 구간 (±0.05초)"
                    ></div>

                    {/* 완벽 목표선 */}
                    <div
                      className="absolute top-0 bottom-0 w-[1.5px] bg-amber-600 z-20 -translate-x-1/2"
                      style={{ left: '83.3333%' }}
                      title="완벽 목표점 (10.00초)"
                    ></div>

                    {/* 사용자 누른 지점 핀 마커 (왼쪽 끝에서 시작하여 부드럽게 위치로 이동) */}
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-red-600 rounded-full z-30 -translate-x-1/2 shadow-md transition-all duration-700 ease-out"
                      style={{
                        left: `${animatedPos}%`
                      }}
                    ></div>
                  </div>

                  {/* 눈금 라벨 */}
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>0s</span>
                    <span>3s</span>
                    <span>6s</span>
                    <span>9s</span>
                    <span className="font-bold text-amber-600">10s🎯</span>
                    <span>12s+</span>
                  </div>

                  {/* 범례 안내 */}
                  <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-300 inline-block"></span>
                      <span>근접</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      <span>초근접</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-[1.5px] h-3 bg-amber-600 inline-block"></span>
                      <span>10.00s 완벽</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                      <span>내 기록</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 등급 판정 박스 */}
              <div className={`p-5 rounded-2xl border mb-6 ${
                gameResult.rank === '완벽'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : gameResult.rank === '초근접'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : gameResult.rank === '근접'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">판정 결과</div>
                <div className="text-2xl font-black mb-2">{gameResult.rank}</div>
                <div className="text-xs font-medium">
                  {gameResult.rank === '완벽' && '🎉 10.00초 완벽 적중! 간식권 3개 획득!'}
                  {gameResult.rank === '초근접' && '👏 ±0.05초 이내 초근접! 간식권 2개 획득!'}
                  {gameResult.rank === '근접' && '👍 ±0.25초 이내 근접! 간식권 1개 획득!'}
                  {gameResult.rank === '실패' && '😅 아쉽습니다! 간식권을 획득하지 못했습니다.'}
                </div>
              </div>

              <button
                onClick={() => setActiveView('settlement')}
                className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>정산 화면으로 이동</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 7. 최종 정산 화면 */}
        {activeView === 'settlement' && gameResult && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Gift size={30} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">최종 보상 정산</h2>
                <p className="text-xs text-slate-500 mt-1">방송실 간식 지급 확인서</p>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">학번</span>
                  <span className="font-semibold text-slate-800">{participantId}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">이름</span>
                  <span className="font-semibold text-slate-800">{participantName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">게임 결과</span>
                  <span className="font-semibold text-slate-800">
                    {gameResult.rank} ({formatDisplayTime(gameResult.stoppedTime)}초)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">획득 간식권</span>
                  <span className="font-bold text-[#1a73e8]">{gameResult.coupons}개</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-700 font-bold text-xs">최종 수령 보상</span>
                  <span className="font-extrabold text-base text-amber-600">
                    마이쮸 {gameResult.coupons}개
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setParticipantId('');
                    setParticipantName('');
                    setGameResult(null);
                    setActiveView('game_register');
                  }}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw size={16} />
                  <span>새 학생 테스트하기</span>
                </button>

                <button
                  onClick={() => {
                    setParticipantId('');
                    setParticipantName('');
                    setGameResult(null);
                    setActiveView('main');
                  }}
                  className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>메인 목록으로 돌아가기</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}