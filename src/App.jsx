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
  X,
  Server,
  Wifi
} from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';

// 방송부 부원 명단 데이터
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

// 사자성어 데이터베이스
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

  // 화면 이동 상태
  const [activeView, setActiveView] = useState('main'); // 'main' | 'treasure_menu' | 'all_in_one' | 'network_menu' | 'station_app'

  // 서비스 연동 기기 역할 상태
  const [stationRole, setStationRole] = useState(''); // 'register' | 'timer' | 'jegi' | 'pron' | 'relay' | 'settlement'

  // 실시간 파이어베이스 DB 데이터 상태
  const [globalParticipants, setGlobalParticipants] = useState({});
  const [connectedStations, setConnectedStations] = useState({});

  // 기기 고유 ID 생성
  const [deviceId] = useState(() => 'dev_' + Math.random().toString(36).substring(2, 9));

  // 검색/선택 관련 상태
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // 정보입력대 등록 폼 상태
  const [participantId, setParticipantId] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantGender, setParticipantGender] = useState('남자');
  const [participantError, setParticipantError] = useState('');

  // 10초 타이머 게임 관련 상태
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  // 제기차기 게임 관련 상태
  const [jegiCount, setJegiCount] = useState(0);

  // 발음 테스트 게임 관련 상태
  const [pronCoupons, setPronCoupons] = useState(null);
  const [pronRankName, setPronRankName] = useState('');

  // 사자성어 이어말하기 게임 관련 상태
  const [relayIndex] = useState(0);
  const [relayScore, setRelayScore] = useState(0);
  const [relayRoundEvaluated, setRelayRoundEvaluated] = useState(false);
  const [relayIsCorrect, setRelayIsCorrect] = useState(false);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  // 파이어베이스 실시간 데이터 수신 동기화
  useEffect(() => {
    const participantsRef = ref(db, 'participants');
    const stationsRef = ref(db, 'connectedStations');

    const unsubscribeParticipants = onValue(participantsRef, (snapshot) => {
      const data = snapshot.val();
      setGlobalParticipants(data || {});
    });

    const unsubscribeStations = onValue(stationsRef, (snapshot) => {
      const data = snapshot.val();
      setConnectedStations(data || {});
    });

    return () => {
      unsubscribeParticipants();
      unsubscribeStations();
    };
  }, []);

  // 기기 핑 송신 (파이어베이스 DB에 기기 접속 상태 3초마다 갱신)
  useEffect(() => {
    if (!stationRole) return;

    const deviceRef = ref(db, `connectedStations/${deviceId}`);
    
    const interval = setInterval(() => {
      set(deviceRef, {
        role: stationRole,
        lastActive: Date.now(),
      });
    }, 3000);

    return () => {
      clearInterval(interval);
      remove(deviceRef);
    };
  }, [stationRole, deviceId]);

  // 오디오 사전 로딩
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

  // 날짜 제한 검증 (2026년 8월 28일 자정 오픈, 관리자는 예외)
  const isNetworkServiceAvailable = () => {
    const targetDate = new Date('2026-08-28T00:00:00');
    const now = new Date();
    return now >= targetDate || (userSession && userSession.isAdmin);
  };

  // 서비스 연동 최소 조건 검증 (6개 부스 최소 1대 이상 접속 여부)
  const checkServiceReadiness = () => {
    const now = Date.now();
    const activeStations = Object.values(connectedStations).filter(
      (s) => now - s.lastActive < 8000
    );
    const activeRoles = activeStations.map((s) => s.role);
    const required = ['register', 'timer', 'jegi', 'pron', 'relay', 'settlement'];
    const missing = required.filter((req) => !activeRoles.includes(req));

    return {
      isReady: missing.length === 0,
      missing,
      activeRolesCount: {
        register: activeRoles.filter((r) => r === 'register').length,
        timer: activeRoles.filter((r) => r === 'timer').length,
        jegi: activeRoles.filter((r) => r === 'jegi').length,
        pron: activeRoles.filter((r) => r === 'pron').length,
        relay: activeRoles.filter((r) => r === 'relay').length,
        settlement: activeRoles.filter((r) => r === 'settlement').length,
      },
    };
  };

  // 관리자 전체 데이터 초기화
  const handleResetAllData = () => {
    if (!userSession?.isAdmin) {
      alert('관리자만 초기화할 수 있습니다.');
      return;
    }
    if (window.confirm('파이어베이스의 모든 참가자 데이터 및 기기 접속 데이터를 삭제하시겠습니까?')) {
      remove(ref(db, 'participants'));
      remove(ref(db, 'connectedStations'));
      alert('파이어베이스 서버 데이터가 전체 초기화되었습니다.');
    }
  };

  // 관리자 확인
  const checkIsAdmin = (gradeVal, nameVal) => {
    return ADMIN_DATA.some(
      (admin) => admin.grade === gradeVal && admin.name === nameVal
    );
  };

  // 로그인 인증
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

  // 1. 정보입력대: 중앙 서버에 학생 등록
  const handleRegisterToFirebase = (e) => {
    e.preventDefault();
    const cleanId = participantId.trim();
    const cleanName = participantName.trim();

    if (!cleanId) {
      setParticipantError('학번을 입력하세요 (예: 10101)');
      return;
    }
    if (!cleanName) {
      setParticipantError('이름을 입력하세요');
      return;
    }

    set(ref(db, `participants/${cleanId}`), {
      id: cleanId,
      name: cleanName,
      gender: participantGender,
      registeredAt: Date.now(),
      scores: {},
      settled: false,
    });

    setParticipantId('');
    setParticipantName('');
    setParticipantError('');
    alert(`[${cleanName}] 학생이 성공적으로 서버에 등록되었습니다!`);
  };

  // 2. 타이머 게임 동작
  const startGame = () => {
    setTime(0);
    setGameResult(null);
    setIsRunning(true);
    startTimeRef.current = Date.now();

    if (audioRef.current) {
      audioRef.current.currentTime = Math.random() * 165;
      audioRef.current.play().catch(() => {});
    }

    timerRef.current = setInterval(() => {
      setTime((Date.now() - startTimeRef.current) / 1000);
    }, 10);
  };

  const stopGame = () => {
    clearInterval(timerRef.current);
    const finalTime = (Date.now() - startTimeRef.current) / 1000;
    if (audioRef.current) audioRef.current.pause();

    setTime(finalTime);
    setIsRunning(false);

    const roundedTime = Number(finalTime.toFixed(2));
    const diff = Math.abs(roundedTime - 10.0);

    let rank = '';
    let coupons = 0;

    if (diff === 0) {
      rank = '완벽'; coupons = 3;
    } else if (diff <= 0.05) {
      rank = '초근접'; coupons = 2;
    } else if (diff <= 0.25) {
      rank = '근접'; coupons = 1;
    } else {
      rank = '실패'; coupons = 0;
    }

    const resultObj = { stoppedTime: roundedTime, diff: diff.toFixed(2), rank, coupons };
    setGameResult(resultObj);

    if (stationRole === 'timer' && selectedStudentId) {
      update(ref(db, `participants/${selectedStudentId}/scores/timer`), resultObj);
    }
  };

  // 3. 제기차기 수동 점수 저장
  const handleSaveJegiScore = () => {
    if (!selectedStudentId) return;
    const student = globalParticipants[selectedStudentId];
    const target = student?.gender === '남자' ? 5 : 3;
    const isPassed = jegiCount >= target;
    const coupons = isPassed ? 3 : 0;

    update(ref(db, `participants/${selectedStudentId}/scores/jegi`), {
      count: jegiCount,
      isPassed,
      coupons,
    });
    alert('제기차기 기록이 서버에 저장되었습니다!');
  };

  // 4. 발음 테스트 수동 점수 저장
  const handleSavePronScore = (coupons, rankName) => {
    setPronCoupons(coupons);
    setPronRankName(rankName);

    if (stationRole === 'pron' && selectedStudentId) {
      update(ref(db, `participants/${selectedStudentId}/scores/pron`), {
        rankName,
        coupons,
      });
      alert('발음 테스트 결과가 서버에 저장되었습니다!');
    }
  };

  // 5. 사자성어 성공/실패 저장
  const handleSaveRelayScore = (isSuccess) => {
    setRelayRoundEvaluated(true);
    setRelayIsCorrect(isSuccess);
    const newScore = isSuccess ? relayScore + 1 : relayScore;
    if (isSuccess) setRelayScore(newScore);

    if (stationRole === 'relay' && selectedStudentId) {
      update(ref(db, `participants/${selectedStudentId}/scores/relay`), {
        score: newScore,
        coupons: newScore,
      });
    }
  };

  // 6. 간식 지급 완료 처리
  const handleSettleSnack = (studentId) => {
    update(ref(db, `participants/${studentId}`), {
      settled: true,
      settledAt: Date.now(),
    });
    alert('간식 수령 처리가 완료되었습니다!');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-4 font-sans">
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
                  onChange={(e) => { setGrade(e.target.value); setError(''); }}
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm appearance-none cursor-pointer text-slate-800"
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
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  placeholder="이름을 입력하세요"
                  className="w-full px-4 py-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800"
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
                  onChange={(e) => { setInputCode(e.target.value); setError(''); }}
                  placeholder="인증 코드를 입력하세요"
                  className="w-full px-4 py-3.5 pl-11 pr-11 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                />
                <KeyRound className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400"
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
              className="w-full py-3.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-medium rounded-2xl text-sm mt-2 cursor-pointer"
            >
              인증하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  const readiness = checkServiceReadiness();

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-800 font-sans">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0" onClick={() => setActiveView('main')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center shrink-0">
              <Radio size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">YBS Helper</h1>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">ybs.ygmhelper.xyz</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium text-slate-600">
              <span>{userSession?.grade}학년 {userSession?.name}</span>
              {userSession?.isAdmin && (
                <span className="flex items-center gap-0.5 bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                  <ShieldCheck size={11} /> 관리자
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
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
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 group-hover:text-[#1a73e8]">
                      <Trophy size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                      사용 가능
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">보물찾기</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    방송부 미니게임 진행 및 간식 보상 정산 시스템입니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <span>입장하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'treasure_menu' && (
          <div>
            <button
              onClick={() => setActiveView('main')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>메인으로 돌아가기</span>
            </button>

            <div className="mb-8">
              <h2 className="text-xl font-bold text-slate-900">보물찾기 모드 선택</h2>
              <p className="text-sm text-slate-500 mt-1">진행할 보물찾기 서비스 모드를 선택하세요.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
              <div
                onClick={() => {
                  if (isNetworkServiceAvailable()) {
                    setActiveView('network_menu');
                  } else {
                    alert('서비스 연동은 2026년 8월 28일부터 이용할 수 있습니다.');
                  }
                }}
                className={`bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm transition-all flex flex-col justify-between group ${
                  isNetworkServiceAvailable()
                    ? 'hover:shadow-md hover:border-blue-300 cursor-pointer'
                    : 'opacity-70 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Server size={24} />
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      isNetworkServiceAvailable()
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isNetworkServiceAvailable() ? '오픈됨' : '8월 28일 오픈'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">
                    서비스 연동 테스트 (다중 기기)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    파이어베이스 서버로 부스별 기기를 실시간 연동하여 미니게임을 통합 진행합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button
                    disabled={!isNetworkServiceAvailable()}
                    className={`w-full py-3 text-xs font-medium rounded-xl flex items-center justify-center gap-2 ${
                      isNetworkServiceAvailable()
                        ? 'bg-[#1a73e8] text-white hover:bg-blue-700 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{isNetworkServiceAvailable() ? '기기 역할 설정하기' : '2026-08-28 잠금'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div
                onClick={() => setActiveView('all_in_one')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center">
                      <Timer size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-[#1a73e8] text-xs font-semibold rounded-full">
                      단일 기기 테스트
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">올인원 모드</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    하나의 기기에서 학생 등록부터 4종 게임 진행 및 간식 정산까지 연속으로 체험합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <span>시작하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'network_menu' && (
          <div>
            <button
              onClick={() => setActiveView('treasure_menu')}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 mb-6 cursor-pointer"
            >
              <ChevronLeft size={16} />
              <span>모드 선택으로 돌아가기</span>
            </button>

            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">기기 역할 설정 & 현장 관제</h2>
                <p className="text-sm text-slate-500 mt-1">현재 태블릿/스마트폰의 역할을 선택하고 부스 연결 현황을 확인하세요.</p>
              </div>

              {userSession?.isAdmin && (
                <button
                  onClick={handleResetAllData}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>서버 데이터 전체 초기화 (관리자)</span>
                </button>
              )}
            </div>

            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi size={18} className={readiness.isReady ? 'text-emerald-500' : 'text-amber-500'} />
                  <span className="text-sm font-bold text-slate-800">파이어베이스 실시간 기기 연결 현황</span>
                </div>
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  readiness.isReady
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600'
                }`}>
                  {readiness.isReady ? '서비스 진행 가능 (최소 조건 충족)' : '기기 연결 준비 중'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">정보입력대</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.register}대</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">10초 타이머</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.timer}대</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">제기차기</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.jegi}대</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">발음 테스트</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.pron}대</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">사자성어</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.relay}대</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold block">간식수령대</span>
                  <span className="text-lg font-black text-slate-800">{readiness.activeRolesCount.settlement}대</span>
                </div>
              </div>

              {!readiness.isReady && (
                <p className="text-xs text-amber-600 mt-4 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <b>⚠️ 미충족 조건:</b> {readiness.missing.join(', ')} 부스가 최소 1대 이상 접속해야 서비스를 시작할 수 있습니다.
                </p>
              )}
            </div>

            <h3 className="text-sm font-bold text-slate-700 mb-4 ml-1">이 기기의 역할을 선택하세요:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => { setStationRole('register'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center mb-3">
                  <User size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">1. 학생 정보입력대</h4>
                <p className="text-xs text-slate-400 mt-1">도전 학생의 학번, 이름, 성별을 등록합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('timer'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <Timer size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">2. 10초 타이머 부스</h4>
                <p className="text-xs text-slate-400 mt-1">10초 타이머 측정 및 점수를 기록합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('jegi'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                  <Activity size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-600">3. 제기차기 부스</h4>
                <p className="text-xs text-slate-400 mt-1">제기차기 성공 개수를 측정하고 채점합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('pron'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-600">4. 발음 테스트 부스</h4>
                <p className="text-xs text-slate-400 mt-1">제시어 읽기 정확도를 수동으로 채점합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('relay'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-3">
                  <HelpCircle size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-600">5. 사자성어 부스</h4>
                <p className="text-xs text-slate-400 mt-1">이어말하기 정답 성공/실패를 판정합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('settlement'); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left cursor-pointer group"
              >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                  <Gift size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600">6. 간식 수령대</h4>
                <p className="text-xs text-slate-400 mt-1">통합 점수 계산 및 간식 지급을 완료 처리합니다.</p>
              </button>
            </div>
          </div>
        )}

        {activeView === 'station_app' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setActiveView('network_menu')}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>역할 선택으로 돌아가기</span>
              </button>

              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-700">
                <Server size={14} />
                <span>현재 기기 역할: {
                  stationRole === 'register' ? '정보입력대' :
                  stationRole === 'timer' ? '10초 타이머' :
                  stationRole === 'jegi' ? '제기차기' :
                  stationRole === 'pron' ? '발음테스트' :
                  stationRole === 'relay' ? '사자성어' : '간식수령대'
                }</span>
              </div>
            </div>

            {stationRole === 'register' && (
              <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <User size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">현장 학생 등록 (파이어베이스)</h2>
                  <p className="text-xs text-slate-500 mt-1">학번과 이름을 등록하면 모든 부스 기기에서 즉시 조회됩니다.</p>
                </div>

                <form onSubmit={handleRegisterToFirebase} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">학번</label>
                    <input
                      type="text"
                      value={participantId}
                      onChange={(e) => setParticipantId(e.target.value)}
                      placeholder="예: 10101"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">이름</label>
                    <input
                      type="text"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      placeholder="학생 이름 입력"
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">성별</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setParticipantGender('남자')}
                        className={`py-3.5 rounded-2xl text-sm font-semibold border ${
                          participantGender === '남자'
                            ? 'bg-blue-50 border-[#1a73e8] text-[#1a73e8]'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        남자
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticipantGender('여자')}
                        className={`py-3.5 rounded-2xl text-sm font-semibold border ${
                          participantGender === '여자'
                            ? 'bg-rose-50 border-rose-500 text-rose-600'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        여자
                      </button>
                    </div>
                  </div>

                  {participantError && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 ml-1">
                      <ShieldAlert size={14} />
                      <span>{participantError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-2xl text-sm mt-2 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>파이어베이스 서버에 등록</span>
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            )}

            {stationRole !== 'register' && stationRole !== 'settlement' && (
              <div className="max-w-md mx-auto mb-6 bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm">
                <label className="block text-xs font-bold text-slate-700 mb-2 ml-1">
                  🔍 도전 학생 선택 (실시간 등록 리스트)
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800"
                >
                  <option value="">-- 도전할 학생을 선택하세요 --</option>
                  {Object.values(globalParticipants).map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.id}] {st.name} ({st.gender}) - {st.scores?.[stationRole] ? '✅ 완료' : '⏳ 미완료'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stationRole === 'timer' && selectedStudentId && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <h3 className="text-lg font-bold text-slate-900 mb-2">10초 타이머 부스</h3>
                <p className="text-xs text-slate-500 mb-6">
                  선택 학생: <b>{globalParticipants[selectedStudentId]?.name}</b> ({selectedStudentId})
                </p>

                <div className="h-32 flex items-center justify-center my-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-6xl font-black text-slate-900 font-mono">
                    {time.toFixed(2)}s
                  </div>
                </div>

                {isRunning ? (
                  <button onClick={stopGame} className="w-full py-5 bg-red-500 text-white font-bold rounded-2xl text-lg cursor-pointer">
                    정지 (STOP)
                  </button>
                ) : (
                  <button onClick={startGame} className="w-full py-5 bg-[#1a73e8] text-white font-bold rounded-2xl text-lg cursor-pointer">
                    시작 (START)
                  </button>
                )}

                {gameResult && (
                  <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold">
                    서버 저장 완: {gameResult.stoppedTime}초 ({gameResult.rank} - 간식권 +{gameResult.coupons}개)
                  </div>
                )}
              </div>
            )}

            {stationRole === 'jegi' && selectedStudentId && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <h3 className="text-lg font-bold text-slate-900 mb-2">제기차기 부스</h3>
                <p className="text-xs text-slate-500 mb-6">
                  선택 학생: <b>{globalParticipants[selectedStudentId]?.name}</b> ({globalParticipants[selectedStudentId]?.gender})
                </p>

                <div className="text-6xl font-black text-slate-900 font-mono my-6">
                  {jegiCount}<span className="text-xl font-normal text-slate-400">개</span>
                </div>

                <div className="flex justify-center gap-3 mb-6">
                  <button onClick={() => setJegiCount((p) => Math.max(0, p - 1))} className="w-14 h-14 bg-slate-100 rounded-2xl font-bold text-xl cursor-pointer">-</button>
                  <button onClick={() => setJegiCount((p) => p + 1)} className="w-20 h-14 bg-[#1a73e8] text-white rounded-2xl font-bold text-xl cursor-pointer">+</button>
                </div>

                <button onClick={handleSaveJegiScore} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl text-sm cursor-pointer">
                  제기차기 결과 서버 저장
                </button>
              </div>
            )}

            {stationRole === 'pron' && selectedStudentId && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <h3 className="text-lg font-bold text-slate-900 mb-2">발음 테스트 부스</h3>
                <p className="text-xs text-slate-500 mb-4">
                  선택 학생: <b>{globalParticipants[selectedStudentId]?.name}</b>
                </p>

                <div className="p-4 bg-slate-50 rounded-2xl border text-left text-sm font-bold mb-6">
                  "{PRON_SENTENCES[0]}"
                </div>

                <div className="grid grid-cols-2 gap-2 mb-6">
                  <button onClick={() => handleSavePronScore(3, '완벽 (100%)')} className="p-3 bg-amber-50 text-amber-900 rounded-2xl text-xs font-bold border border-amber-200 cursor-pointer">완벽 (+3개)</button>
                  <button onClick={() => handleSavePronScore(2, '우수 (95% 이상)')} className="p-3 bg-emerald-50 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-200 cursor-pointer">우수 (+2개)</button>
                  <button onClick={() => handleSavePronScore(1, '통과 (90% 이상)')} className="p-3 bg-blue-50 text-blue-900 rounded-2xl text-xs font-bold border border-blue-200 cursor-pointer">통과 (+1개)</button>
                  <button onClick={() => handleSavePronScore(0, '실패 (90% 미만)')} className="p-3 bg-red-50 text-red-900 rounded-2xl text-xs font-bold border border-red-200 cursor-pointer">실패 (+0개)</button>
                </div>
              </div>
            )}

            {stationRole === 'relay' && selectedStudentId && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <h3 className="text-lg font-bold text-slate-900 mb-2">사자성어 부스</h3>
                <p className="text-xs text-slate-500 mb-4">
                  선택 학생: <b>{globalParticipants[selectedStudentId]?.name}</b>
                </p>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 my-4 space-y-3">
                  <div className="text-4xl font-extrabold text-blue-600">제시어: 사자</div>
                  <div className="text-4xl font-extrabold text-emerald-600">정답어: 성어</div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-6">
                  <button onClick={() => handleSaveRelayScore(true)} className="py-4 bg-emerald-600 text-white font-bold rounded-2xl cursor-pointer">성공 (+1개)</button>
                  <button onClick={() => handleSaveRelayScore(false)} className="py-4 bg-rose-500 text-white font-bold rounded-2xl cursor-pointer">실패 (+0개)</button>
                </div>
              </div>
            )}

            {stationRole === 'settlement' && (
              <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Gift size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">간식 수령대 (파이어베이스 실시간 연동)</h2>
                  <p className="text-xs text-slate-500 mt-1">학생의 4개 부스 결과를 통합 조회하고 간식을 수령 처리합니다.</p>
                </div>

                <div className="space-y-4">
                  {Object.values(globalParticipants).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-8">서버에 등록된 학생이 없습니다.</p>
                  ) : (
                    Object.values(globalParticipants).map((st) => {
                      const timerC = st.scores?.timer?.coupons || 0;
                      const jegiC = st.scores?.jegi?.coupons || 0;
                      const pronC = st.scores?.pron?.coupons || 0;
                      const relayC = st.scores?.relay?.coupons || 0;
                      const totalC = timerC + jegiC + pronC + relayC;

                      return (
                        <div key={st.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">[{st.id}] {st.name}</span>
                              <span className="text-xs text-slate-400">({st.gender})</span>
                              {st.settled && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-bold rounded text-[10px]">
                                  수령완료
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-2 space-x-2">
                              <span>타이머: <b>+{timerC}</b></span>
                              <span>제기: <b>+{jegiC}</b></span>
                              <span>발음: <b>+{pronC}</b></span>
                              <span>사자성어: <b>+{relayC}</b></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-base font-black text-amber-600">마이쮸 {totalC}개</span>
                            <button
                              disabled={st.settled}
                              onClick={() => handleSettleSnack(st.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                st.settled
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                              }`}
                            >
                              {st.settled ? '지급 완료됨' : '간식 지급하기'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'all_in_one' && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border">
            <button onClick={() => setActiveView('treasure_menu')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-6 cursor-pointer">
              <ChevronLeft size={16} />
              <span>돌아가기</span>
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">올인원 모드</h3>
            <p className="text-xs text-slate-500 mb-6">단일 기기에서 모든 순서를 한번에 테스트합니다.</p>
            <button onClick={() => setActiveView('main')} className="w-full py-3.5 bg-[#1a73e8] text-white font-bold rounded-2xl text-xs cursor-pointer">
              메인으로 이동
            </button>
          </div>
        )}
      </main>
    </div>
  );
}