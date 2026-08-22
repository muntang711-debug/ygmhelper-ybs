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
  Volume2,
  Plus,
  Minus,
  Activity,
  Target,
  CheckCircle2,
  XCircle,
  MessageSquare,
  HelpCircle,
  Check,
  X
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

// 발음 정확도 테스트 문구 목록
const PRON_SENTENCES = [
  '한국관광공사 곽진광 관광과장',
  '내가 그린 기린 그림은 긴 기린 그림이고 네가 그린 기린 그림은 안 긴 기린 그림이다',
  '저 뜀틀이 내가 뛸 뜀틀인가 내가 안 뛸 뜀틀인가',
  '올망졸망똘망똘망 올망졸망똘망똘망',
  '간장공장 공장장은 강 공장장이고 된장공장 공장장은 장 공장장이다',
  '고려고 교복은 고급 교복이고 고려고 교복은 고급 원단을 사용했다',
  '서울특별시 특허허가과 허가과장 허 과장',
];

// 사자성어 이어말하기 데이터베이스 (추후 단어 추가 가능)
const FOUR_LETTER_IDIOMS = [
  { front: '사자', back: '성어', full: '사자성어' },
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

  // 화면 이동 상태 ('main' | 'treasure_menu' | 'game_register' | 'game_guide' | 'game_play' | 'game_result' | 'jegi_guide' | 'jegi_play' | 'pron_guide' | 'pron_play' | 'relay_guide' | 'relay_play' | 'settlement')
  const [activeView, setActiveView] = useState('main');

  // 미니게임 참가 학생 정보
  const [participantId, setParticipantId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantGender, setParticipantGender] = useState('남자');
  const [participantError, setParticipantError] = useState('');

  // 10초 타이머 게임 관련 상태
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [stoppedTime, setStoppedTime] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  // 제기차기 게임 관련 상태
  const [jegiCount, setJegiCount] = useState(0);

  // 발음 테스트 게임 관련 상태 (수동 채점)
  const [targetSentence, setTargetSentence] = useState('');
  const [pronCoupons, setPronCoupons] = useState(null);
  const [pronRankName, setPronRankName] = useState('');

  // 사자성어 이어말하기 게임 관련 상태 (수동 채점)
  const [relayQuestions, setRelayQuestions] = useState([]);
  const [relayIndex, setRelayIndex] = useState(0);
  const [relayScore, setRelayScore] = useState(0);
  const [relayRoundEvaluated, setRelayRoundEvaluated] = useState(false);
  const [relayIsCorrect, setRelayIsCorrect] = useState(false);

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
    if (error) setError('');
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

    const trimmedName = name.trim();
    const validNames = STUDENT_DATA[grade] || [];

    if (
      !grade ||
      !trimmedName ||
      !validNames.includes(trimmedName) ||
      inputCode.trim() !== 'ybs2026'
    ) {
      setError('인증 정보가 올바르지 않습니다.');
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
    setJegiCount(0);
    setPronCoupons(null);
    setPronRankName('');
    setActiveView('game_guide');
  };

  // 타이머 시작
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

  // 발음 테스트 문장 랜덤 뽑기
  const setupRandomPronSentence = () => {
    const randomIndex = Math.floor(Math.random() * PRON_SENTENCES.length);
    setTargetSentence(PRON_SENTENCES[randomIndex]);
    setPronCoupons(null);
    setPronRankName('');
  };

  // 발음 수동 평가 선택 함수
  const handleSelectPronScore = (coupons, rankName) => {
    setPronCoupons(coupons);
    setPronRankName(rankName);
  };

  // 사자성어 수동 설정
  const setupRelayGame = () => {
    const shuffled = [...FOUR_LETTER_IDIOMS].sort(() => 0.5 - Math.random());
    setRelayQuestions(shuffled);
    setRelayIndex(0);
    setRelayScore(0);
    setRelayRoundEvaluated(false);
    setRelayIsCorrect(false);
  };

  // 사자성어 수동 평가 (성공 / 실패)
  const handleEvaluateRelay = (isSuccess) => {
    setRelayRoundEvaluated(true);
    setRelayIsCorrect(isSuccess);
    if (isSuccess) {
      setRelayScore((prev) => prev + 1);
    }
  };

  // 사자성어 다음 문제 이동
  const handleNextRelayQuestion = () => {
    if (relayIndex + 1 < relayQuestions.length) {
      setRelayIndex((prev) => prev + 1);
      setRelayRoundEvaluated(false);
      setRelayIsCorrect(false);
    } else {
      setActiveView('settlement');
    }
  };

  // 타이머 투명도 계산
  const getTimerOpacity = () => {
    if (!isRunning) return 1;
    if (time >= 1.0) return 0;
    return Math.max(0, 1.0 - time);
  };

  // 00.00 포맷 변환
  const formatDisplayTime = (val) => {
    return val.toFixed(2).padStart(5, '0');
  };

  // 제기차기 통과 여부 및 간식권 계산
  const getJegiResult = () => {
    const target = participantGender === '남자' ? 5 : 3;
    const isPassed = jegiCount >= target;
    const coupons = isPassed ? 3 : 0;
    return { target, isPassed, coupons };
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

  const jegiRes = getJegiResult();
  const currentRelayItem = relayQuestions[relayIndex];

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
                    타이머 + 제기차기 + 발음 + 사자성어 4종 미니게임 체험 및 통합 정산을 진행합니다.
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

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">성별</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setParticipantGender('남자')}
                      className={`py-3.5 rounded-2xl text-sm font-semibold border transition-all cursor-pointer ${
                        participantGender === '남자'
                          ? 'bg-blue-50 border-[#1a73e8] text-[#1a73e8]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      남자
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantGender('여자')}
                      className={`py-3.5 rounded-2xl text-sm font-semibold border transition-all cursor-pointer ${
                        participantGender === '여자'
                          ? 'bg-rose-50 border-rose-500 text-rose-600'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      여자
                    </button>
                  </div>
                </div>

                {participantError && (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 ml-1">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>{participantError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm mt-2 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>다음 (안내 확인)</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. 10초 타이머 진행 안내 화면 */}
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
                  {participantId} {participantName} ({participantGender})
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
                <span>{participantId} {participantName} ({participantGender}) 도전 중</span>
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

        {/* 6. 타이머 결과 화면 */}
        {activeView === 'game_result' && gameResult && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50 text-[#1a73e8]">
                <Award size={32} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 mb-1">10초 타이머 결과</h2>
              <p className="text-xs text-slate-500 mb-6">{participantId} {participantName} 학생의 기록입니다.</p>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                <div className="text-xs text-slate-400 mb-1">최종 기록</div>
                <div className="text-5xl font-black text-slate-900 font-mono mb-2">
                  {formatDisplayTime(gameResult.stoppedTime)}초
                </div>
                <div className="text-xs font-semibold text-slate-500 mb-6">
                  목표(10.00초)와 오차: <span className="text-[#1a73e8]">{gameResult.diff}초</span>
                </div>

                {/* 타임라인 바 */}
                <div className="mt-4 pt-4 border-t border-slate-200/60 text-left">
                  <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 mb-2">
                    <span>타임라인 분석 (0초 ~ 12초)</span>
                    <span className="text-xs text-[#1a73e8]">
                      {gameResult.stoppedTime >= 12 ? '12.00s+' : `${formatDisplayTime(gameResult.stoppedTime)}초`}
                    </span>
                  </div>

                  <div className="relative w-full h-7 bg-slate-200/80 rounded-xl overflow-hidden my-2 border border-slate-300/50">
                    <div
                      className="absolute top-0 bottom-0 bg-blue-300 -translate-x-1/2"
                      style={{ left: '83.3333%', width: '4.1667%' }}
                      title="근접 구간 (±0.25초)"
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500 z-10 -translate-x-1/2"
                      style={{ left: '83.3333%', width: 'max(0.8333%, 6px)' }}
                      title="초근접 구간 (±0.05초)"
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 w-[1.5px] bg-amber-600 z-20 -translate-x-1/2"
                      style={{ left: '83.3333%' }}
                      title="완벽 목표점 (10.00초)"
                    ></div>
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-red-600 rounded-full z-30 -translate-x-1/2 shadow-md transition-all duration-700 ease-out"
                      style={{
                        left: `${animatedPos}%`
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                    <span>0s</span>
                    <span>3s</span>
                    <span>6s</span>
                    <span>9s</span>
                    <span className="font-bold text-amber-600">10s🎯</span>
                    <span>12s+</span>
                  </div>
                </div>
              </div>

              <div className={`p-5 rounded-2xl border mb-6 ${
                gameResult.rank === '완벽'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : gameResult.rank === '초근접'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : gameResult.rank === '근접'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-70">1차 타이머 판정</div>
                <div className="text-2xl font-black mb-1">{gameResult.rank}</div>
                <div className="text-xs font-medium">
                  {gameResult.rank === '완벽' && '🎉 간식권 3개 획득!'}
                  {gameResult.rank === '초근접' && '👏 간식권 2개 획득!'}
                  {gameResult.rank === '근접' && '👍 간식권 1개 획득!'}
                  {gameResult.rank === '실패' && '😅 간식권 미획득'}
                </div>
              </div>

              <button
                onClick={() => setActiveView('jegi_guide')}
                className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>다음 단계 (제기차기 안내)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 7. 제기차기 시작 전 안내 화면 */}
        {activeView === 'jegi_guide' && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setActiveView('game_result')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>타이머 결과로 돌아가기</span>
            </button>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full">
                  {participantId} {participantName} ({participantGender})
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-3">제기차기 게임 안내</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">1. 제기차기 진행</h4>
                    <p className="text-xs text-slate-500 mt-0.5">준비된 제기를 받아 땅에 떨어뜨리지 않고 계속해서 차 올리세요.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">2. 개수 입력</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      도전이 완료되면 부원이 측정한 개수를 다음 화면의 카운터로 입력하세요.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-slate-700">
                  <b>💡 성공 기준:</b> 기준 개수({participantGender === '남자' ? '남자 5개' : '여자 3개'}) 이상 성공 시 <b>간식권 3개</b>를 추가로 획득합니다!
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveView('jegi_play');
                }}
                className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>제기차기 개수 입력하기</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 8. 제기차기 개수 측정 화면 */}
        {activeView === 'jegi_play' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-amber-50 text-amber-600">
                <Activity size={28} />
              </div>

              <h2 className="text-xl font-bold text-slate-900">제기차기 개수 측정</h2>
              <p className="text-xs text-slate-500 mt-1">
                현실에서 성공한 제기차기 개수를 기록하세요.
              </p>

              {/* 성별 기준 목표 안내 */}
              <div className="my-5 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-[#1a73e8]" />
                  <span className="font-semibold text-slate-700">
                    {participantGender} 기준 목표: <span className="text-[#1a73e8] font-bold">{jegiRes.target}개 이상</span>
                  </span>
                </div>
                <span className="text-slate-400">(달성 시 간식권 +3개)</span>
              </div>

              {/* 개수 카운터 디스플레이 */}
              <div className="my-6">
                <div className="text-7xl font-black text-slate-900 font-mono tracking-tight my-2">
                  {jegiCount}
                  <span className="text-2xl font-bold text-slate-400 ml-1">개</span>
                </div>
              </div>

              {/* 카운터 버튼 영역 */}
              <div className="flex items-center justify-center gap-4 mb-8">
                <button
                  type="button"
                  onClick={() => setJegiCount((prev) => Math.max(0, prev - 1))}
                  className="w-16 h-16 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Minus size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => setJegiCount((prev) => prev + 1)}
                  className="w-20 h-20 bg-[#1a73e8] hover:bg-blue-700 active:bg-blue-800 text-white rounded-3xl flex items-center justify-center shadow-md transition-colors cursor-pointer"
                >
                  <Plus size={32} />
                </button>
                <button
                  type="button"
                  onClick={() => setJegiCount(0)}
                  className="w-16 h-16 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-500 rounded-2xl flex items-center justify-center text-xs font-semibold transition-colors cursor-pointer"
                >
                  초기화
                </button>
              </div>

              {/* 달성 여부 미리보기 상태 */}
              <div className={`p-4 rounded-2xl text-xs font-bold mb-6 border ${
                jegiRes.isPassed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}>
                {jegiRes.isPassed
                  ? `🎉 목표 달성! (간식권 3개 확정)`
                  : `현재 ${jegiRes.target - jegiCount > 0 ? `${jegiRes.target - jegiCount}개 더 필요` : '미달성'}`}
              </div>

              <button
                onClick={() => {
                  setupRandomPronSentence();
                  setActiveView('pron_guide');
                }}
                className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>다음 단계 (발음 테스트 안내)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 9. 발음 정확도 테스트 사전 안내 화면 */}
        {activeView === 'pron_guide' && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setActiveView('jegi_play')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>제기차기로 돌아가기</span>
            </button>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <span className="px-3 py-1 bg-purple-50 text-purple-600 text-xs font-semibold rounded-full">
                  3단계: 발음 정확도 테스트
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-3">발음 정확하게 말하기 안내</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">1. 제시된 문구 크게 읽기</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      학생이 화면의 제시문구를 또박또박 크게 읽습니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">2. 부원 직접 채점</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      부원이 직접 발음을 듣고 완벽/우수/통과/실패 등급을 선택합니다.
                    </p>
                  </div>
                </div>

                {/* 보상 등급표 */}
                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 text-xs text-purple-900">
                  <b className="block mb-1">🎁 등급별 보상 세부 안내:</b>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                    <li><b>완벽 (100%)</b> : 간식권 3개</li>
                    <li><b>우수 (95% 이상)</b> : 간식권 2개</li>
                    <li><b>통과 (90% 이상)</b> : 간식권 1개</li>
                    <li><b>실패 (90% 미만)</b> : 간식권 0개</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setActiveView('pron_play')}
                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>발음 테스트 진행하기</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 10. 발음 정확도 측정 진행 화면 (부원 수동 채점) */}
        {activeView === 'pron_play' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-purple-50 text-purple-600">
                <MessageSquare size={28} />
              </div>

              <h2 className="text-xl font-bold text-slate-900">발음 정확하게 말하기</h2>
              <p className="text-xs text-slate-500 mt-1 mb-6">
                학생이 읽은 발음을 듣고 부원이 직접 채점 버튼을 누르세요.
              </p>

              {/* 제시된 문장 카드 */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-left mb-6 relative">
                <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md mb-2 inline-block">
                  제시어
                </span>
                <p className="text-base font-bold text-slate-800 leading-relaxed break-keep">
                  "{targetSentence}"
                </p>
              </div>

              {/* 부원 채점 버튼 영역 */}
              <div className="space-y-2 mb-6 text-left">
                <span className="text-xs font-semibold text-slate-600 ml-1 block mb-2">
                  부원 직접 평가 선택:
                </span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPronScore(3, '완벽 (100%)')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      pronCoupons === 3
                        ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>완벽 (+3개)</span>
                    <span className="text-[10px] font-normal text-slate-400">발음 정확함</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPronScore(2, '우수 (95% 이상)')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      pronCoupons === 2
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>우수 (+2개)</span>
                    <span className="text-[10px] font-normal text-slate-400">약간 서툼</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPronScore(1, '통과 (90% 이상)')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      pronCoupons === 1
                        ? 'bg-blue-50 border-blue-400 text-blue-900 ring-2 ring-blue-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>통과 (+1개)</span>
                    <span className="text-[10px] font-normal text-slate-400">절반 이상 판정</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPronScore(0, '실패 (90% 미만)')}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      pronCoupons === 0
                        ? 'bg-red-50 border-red-400 text-red-900 ring-2 ring-red-400/30'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>실패 (+0개)</span>
                    <span className="text-[10px] font-normal text-slate-400">틀림 / 미도전</span>
                  </button>
                </div>
              </div>

              {/* 판정 상태 표시 */}
              {pronCoupons !== null && (
                <div className={`p-4 rounded-2xl text-xs font-bold mb-6 border flex items-center justify-center gap-2 ${
                  pronCoupons > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                  {pronCoupons > 0 ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{pronRankName} 판정! (간식권 +{pronCoupons}개)</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={16} />
                      <span>{pronRankName} 판정 (간식권 미획득)</span>
                    </>
                  )}
                </div>
              )}

              <button
                disabled={pronCoupons === null}
                onClick={() => {
                  setupRelayGame();
                  setActiveView('relay_guide');
                }}
                className={`w-full py-4 font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 ${
                  pronCoupons !== null
                    ? 'bg-[#1a73e8] hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>다음 단계 (사자성어 이어말하기)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* 11. 사자성어 이어말하기 안내 화면 */}
        {activeView === 'relay_guide' && (
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setActiveView('pron_play')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>발음 테스트로 돌아가기</span>
            </button>

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <span className="px-3 py-1 bg-teal-50 text-teal-600 text-xs font-semibold rounded-full">
                  4단계: 사자성어 이어말하기
                </span>
                <h2 className="text-2xl font-bold text-slate-900 mt-3">사자성어 이어말하기 안내</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">1. 화면 글자 구분 확인</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      파란색 영역은 <b>[제시어]</b>이며, 녹색 영역은 부원이 확인할 <b>[정답어]</b>입니다.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                    <User size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">2. 부원 직접 성공/실패 판정</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      학생이 말한 답을 듣고 부원이 [성공] 또는 [실패] 버튼을 직접 클릭합니다.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 text-xs text-teal-900">
                  <b>🎁 보상 안내:</b> 성공한 문제 수만큼 간식권(개당 +1개)을 획득합니다!
                </div>
              </div>

              <button
                onClick={() => setActiveView('relay_play')}
                className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>이어말하기 시작</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* 12. 사자성어 이어말하기 게임 진행 화면 (수동 판정 및 제시어/정답어 명확한 구분) */}
        {activeView === 'relay_play' && currentRelayItem && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 mb-6">
              {/* 진행도 및 현황 */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full">
                  문제 {relayIndex + 1} / {relayQuestions.length}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  현재 성공: <b className="text-teal-600">{relayScore}개</b>
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-6">학생이 말할 뒤 2글자를 확인하세요!</h2>

              {/* 제시어 및 정답어 분리 카드 */}
              <div className="my-6 p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md inline-block mb-2">
                    📢 학생에게 보여줄 제시어
                  </span>
                  <div className="text-4xl font-black text-blue-600 tracking-wider font-mono">
                    {currentRelayItem.front}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md inline-block mb-2">
                    🎯 학생이 말해야 할 정답
                  </span>
                  <div className="text-4xl font-black text-emerald-600 tracking-wider font-mono">
                    {currentRelayItem.back}
                  </div>
                </div>
              </div>

              {/* 부원 직접 판정 버튼 (성공 / 실패) */}
              {!relayRoundEvaluated ? (
                <div className="grid grid-cols-2 gap-3 my-6">
                  <button
                    type="button"
                    onClick={() => handleEvaluateRelay(true)}
                    className="py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl transition-colors shadow-md text-base flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Check size={20} />
                    <span>성공 (+1개)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEvaluateRelay(false)}
                    className="py-4 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white font-bold rounded-2xl transition-colors shadow-md text-base flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <X size={20} />
                    <span>실패 (+0개)</span>
                  </button>
                </div>
              ) : (
                /* 라운드 결과 표시 및 다음 버튼 */
                <div className="my-6 space-y-4">
                  <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 ${
                    relayIsCorrect
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {relayIsCorrect ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>성공 판정! (완성: {currentRelayItem.full})</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={16} />
                        <span>실패 판정 (정답: {currentRelayItem.full})</span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleNextRelayQuestion}
                    className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl transition-colors shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{relayIndex + 1 < relayQuestions.length ? '다음 문제' : '최종 정산으로 이동'}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 13. 통합 최종 정산 화면 */}
        {activeView === 'settlement' && gameResult && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Gift size={30} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">최종 보상 정산</h2>
                <p className="text-xs text-slate-500 mt-1">방송실 간식 지급 최종 확인서</p>
              </div>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6 text-sm">
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">학번 / 이름</span>
                  <span className="font-semibold text-slate-800">
                    {participantId} {participantName} ({participantGender})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">10초 타이머</span>
                  <span className="font-semibold text-slate-800">
                    {gameResult.rank} (+{gameResult.coupons}개)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">제기차기 기록</span>
                  <span className="font-semibold text-slate-800">
                    {jegiCount}개 ({jegiRes.isPassed ? '성공 +3개' : '실패 +0개'})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">발음 테스트</span>
                  <span className="font-semibold text-slate-800">
                    {pronRankName || '미도전'} (+{pronCoupons || 0}개)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">사자성어 이어말하기</span>
                  <span className="font-semibold text-slate-800">
                    {relayScore} / {relayQuestions.length}개 성공 (+{relayScore}개)
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 text-xs">총 간식권</span>
                  <span className="font-bold text-[#1a73e8]">
                    {gameResult.coupons + jegiRes.coupons + (pronCoupons || 0) + relayScore}개
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-700 font-bold text-xs">최종 수령 보상</span>
                  <span className="font-extrabold text-lg text-amber-600">
                    마이쮸 {gameResult.coupons + jegiRes.coupons + (pronCoupons || 0) + relayScore}개
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setParticipantId('');
                    setParticipantName('');
                    setParticipantGender('남자');
                    setGameResult(null);
                    setJegiCount(0);
                    setPronCoupons(null);
                    setPronRankName('');
                    setRelayQuestions([]);
                    setRelayIndex(0);
                    setRelayScore(0);
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
                    setParticipantGender('남자');
                    setGameResult(null);
                    setJegiCount(0);
                    setPronCoupons(null);
                    setPronRankName('');
                    setRelayQuestions([]);
                    setRelayIndex(0);
                    setRelayScore(0);
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