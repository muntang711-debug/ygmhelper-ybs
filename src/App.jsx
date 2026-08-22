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
  Wifi,
  AlertCircle
} from 'lucide-react';
import { db } from './firebase';
import { ref, onValue, set, update, remove, onDisconnect } from 'firebase/database';

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

  // 메인 화면 및 뷰 제어 상태
  const [activeView, setActiveView] = useState('main'); 
  // 'main' | 'treasure_menu' | 'network_menu' | 'station_app' 
  // | 'aio_register' | 'aio_timer_guide' | 'aio_timer_play' | 'aio_timer_result'
  // | 'aio_jegi_guide' | 'aio_jegi_play' | 'aio_pron_guide' | 'aio_pron_play'
  // | 'aio_relay_guide' | 'aio_relay_play' | 'aio_settlement'

  // 서비스 연동 기기 역할 상태
  const [stationRole, setStationRole] = useState(''); // 'register' | 'timer' | 'jegi' | 'pron' | 'relay' | 'settlement'

  // 파이어베이스 실시간 수신 상태
  const [globalParticipants, setGlobalParticipants] = useState({});
  const [connectedStations, setConnectedStations] = useState({});

  // 기기 고유 ID 생성
  const [deviceId] = useState(() => 'dev_' + Math.random().toString(36).substring(2, 9));

  // 현재 선택된 도전 학생 ID
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // 입력/테스트 공통 참가자 상태
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
  const [targetSentence, setTargetSentence] = useState('');
  const [pronCoupons, setPronCoupons] = useState(null);
  const [pronRankName, setPronRankName] = useState('');

  // 사자성어 이어말하기 게임 관련 상태
  const [relayIndex, setRelayIndex] = useState(0);
  const [relayScore, setRelayScore] = useState(0);
  const [relayRoundEvaluated, setRelayRoundEvaluated] = useState(false);
  const [relayIsCorrect, setRelayIsCorrect] = useState(false);

  // 타임라인 마커 위치 애니메이션 (%)
  const [animatedPos, setAnimatedPos] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  // 파이어베이스 데이터 실시간 동기화 및 관제 수신
  useEffect(() => {
    const participantsRef = ref(db, 'participants');
    const stationsRef = ref(db, 'connectedStations');

    const unsub1 = onValue(participantsRef, (snapshot) => {
      setGlobalParticipants(snapshot.val() || {});
    });

    const unsub2 = onValue(stationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setConnectedStations(data);

      // 만약 데이터 초기화로 인해 현재 기기 등록이 지워졌다면 역할 초기화
      if (stationRole && !data[deviceId]) {
        setStationRole('');
        setSelectedStudentId('');
        setActiveView('network_menu');
      }
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [deviceId, stationRole]);

  // 실시간 기기 핑(Heartbeat) 및 이탈(onDisconnect) 자동 제거 로직
  useEffect(() => {
    if (!stationRole) return;

    const deviceRef = ref(db, `connectedStations/${deviceId}`);

    // 접속 해제 시 자동으로 서버 데이터에서 제거
    onDisconnect(deviceRef).remove();

    // 2초마다 실시간 핑 전송
    const interval = setInterval(() => {
      set(deviceRef, {
        role: stationRole,
        lastActive: Date.now(),
      });
    }, 2000);

    return () => {
      clearInterval(interval);
      remove(deviceRef);
    };
  }, [stationRole, deviceId]);

  // 오디오 파일 사전 로딩
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

  // 타임라인 애니메이션
  useEffect(() => {
    if (activeView === 'aio_timer_result' && gameResult) {
      setAnimatedPos(0);
      const timer = setTimeout(() => {
        const targetPos = Math.min((gameResult.stoppedTime / 12) * 100, 100);
        setAnimatedPos(targetPos);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeView, gameResult]);

  // 학년 선택
  const handleGradeChange = (e) => {
    setGrade(e.target.value);
    if (error) setError('');
  };

  // 관리자 여부 판정
  const checkIsAdmin = (gradeVal, nameVal) => {
    return ADMIN_DATA.some(
      (admin) => admin.grade === gradeVal && admin.name === nameVal
    );
  };

  // 부원 로그인 인증
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

  // 특정 역할(부스)에 이미 다른 기기가 접속 중인지 확인 (1~5번 부스 1대 제한)
  const isRoleOccupied = (roleToCheck) => {
    if (roleToCheck === 'settlement') return false; // 6번 간식 수령대는 다중 접속 가능
    const now = Date.now();
    return Object.entries(connectedStations).some(([id, station]) => {
      return id !== deviceId && station.role === roleToCheck && (now - station.lastActive < 5000);
    });
  };

  // 부스별 플레이 자격 요건 검증 (앞 단계 완료 필수)
  const canPlayStation = (student, role) => {
    if (!student) return false;
    const scores = student.scores || {};
    if (role === 'timer') return true; // 등록된 학생이면 10초 타이머 가능
    if (role === 'jegi') return !!scores.timer; // 타이머 완료자만 제기차기 가능
    if (role === 'pron') return !!scores.jegi; // 제기차기 완료자만 발음 테스트 가능
    if (role === 'relay') return !!scores.pron; // 발음 완료자만 사자성어 가능
    if (role === 'settlement') return !!scores.relay; // 사자성어 완료자만 수령 가능
    return false;
  };

  // 서버 데이터 및 기기 접속 완전 초기화 (관리자 전용)
  const handleResetAllData = () => {
    if (!userSession?.isAdmin) {
      alert('관리자만 초기화할 수 있습니다.');
      return;
    }
    if (window.confirm('서버의 모든 학생 참가 기록, 점수, 기기 접속 정보 및 모든 기기의 역할 선택까지 전체 초기화하시겠습니까?')) {
      remove(ref(db, 'participants'));
      remove(ref(db, 'connectedStations'));
      setStationRole('');
      setSelectedStudentId('');
      setActiveView('network_menu');
      alert('서버 데이터 및 기기 역할 설정이 완전히 초기화되었습니다.');
    }
  };

  // 1. 정보입력대: 서버 학생 등록
  const handleRegisterToFirebase = (e) => {
    e.preventDefault();
    const cleanId = participantId.trim();
    const cleanName = participantName.trim();

    if (!cleanId) {
      setParticipantError('학번을 입력해 주세요. (예: 10101)');
      return;
    }
    if (!cleanName) {
      setParticipantError('이름을 입력해 주세요.');
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
    alert(`[${cleanName}] 학생이 성공적으로 등록되었습니다.`);
  };

  // 타이머 게임 로직
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

    // 연동 모드일 경우 서버 저장
    if (stationRole === 'timer' && selectedStudentId) {
      update(ref(db, `participants/${selectedStudentId}/scores/timer`), resultObj);
    }
  };

  // 제기차기 결과 서버 저장
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

  // 발음 테스트 결과 서버 저장
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

  // 사자성어 결과 서버 저장
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

  // 간식 수령 완료
  const handleSettleSnack = (studentId) => {
    update(ref(db, `participants/${studentId}`), {
      settled: true,
      settledAt: Date.now(),
    });
    alert('간식 지급 처리가 완료되었습니다!');
  };

  // 올인원 모드 제기차기 결과 계산
  const getJegiResult = () => {
    const target = participantGender === '남자' ? 5 : 3;
    const isPassed = jegiCount >= target;
    const coupons = isPassed ? 3 : 0;
    return { target, isPassed, coupons };
  };

  // 인증 로그인 전 화면
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
                  onChange={handleGradeChange}
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

  const jegiRes = getJegiResult();

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
        {/* 1. 메인 서비스 목록 */}
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

        {/* 2. 보물찾기 모드 선택 */}
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
              {/* 다중 기기 실시간 연동 모드 (모든 부원 참여 허용) */}
              <div
                onClick={() => setActiveView('network_menu')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Server size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                      테스트 가능
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">
                    서비스 연동 테스트 (다중 기기)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    부스별 태블릿/스마트폰을 파이어베이스로 연결하여 실시간 데이터를 공유합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <span>부스 기기 역할 설정</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 단일 기기 올인원 풀코스 체험 모드 */}
              <div
                onClick={() => setActiveView('aio_register')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center">
                      <Timer size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-blue-50 text-[#1a73e8] text-xs font-semibold rounded-full">
                      단일 기기 풀코스
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">올인원 체험 모드</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    하나의 기기에서 학생 등록 ➔ 4종 게임 진행 ➔ 간식 정산까지 한 번에 진행합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <span>올인원 시작하기</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. 서비스 연동 관제 & 역할 선택 메뉴 */}
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
                <p className="text-sm text-slate-500 mt-1">이 기기의 부스 역할을 선택하세요. (1~5번 부스는 1대만 접속 가능)</p>
              </div>

              {userSession?.isAdmin && (
                <button
                  onClick={handleResetAllData}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>서버 & 기기 전체 초기화 (관리자)</span>
                </button>
              )}
            </div>

            {/* 실시간 파이어베이스 부스 연결 현황 */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi size={18} className="text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800">파이어베이스 실시간 부스 연결 상태</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
                {['register', 'timer', 'jegi', 'pron', 'relay', 'settlement'].map((r) => {
                  const isOccupied = isRoleOccupied(r);
                  const title = r === 'register' ? '정보입력대' : r === 'timer' ? '10초타이머' : r === 'jegi' ? '제기차기' : r === 'pron' ? '발음테스트' : r === 'relay' ? '사자성어' : '간식수령대';
                  return (
                    <div key={r} className={`p-3 rounded-2xl border ${isOccupied ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                      <span className="text-[10px] font-bold block mb-1">{title}</span>
                      <span className="text-xs font-extrabold">{isOccupied ? '🟢 사용 중' : '⚪ 대기 중'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-700 mb-4 ml-1">이 기기의 부스 역할을 선택하세요:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { role: 'register', num: '1', name: '학생 정보입력대', desc: '도전 학생의 학번, 이름, 성별을 등록합니다.', icon: User, color: 'blue' },
                { role: 'timer', num: '2', name: '10초 타이머 부스', desc: '10초 타이머를 측정하고 점수를 기록합니다.', icon: Timer, color: 'indigo' },
                { role: 'jegi', num: '3', name: '제기차기 부스', desc: '제기차기 성공 개수를 측정하고 채점합니다.', icon: Activity, color: 'amber' },
                { role: 'pron', num: '4', name: '발음 테스트 부스', desc: '제시어 읽기 정확도를 수동 채점합니다.', icon: MessageSquare, color: 'purple' },
                { role: 'relay', num: '5', name: '사자성어 부스', desc: '이어말하기 성공/실패를 판정합니다.', icon: HelpCircle, color: 'teal' },
                { role: 'settlement', num: '6', name: '간식 수령대', desc: '통합 점수 계산 및 간식을 수령 처리합니다.', icon: Gift, color: 'emerald' },
              ].map((item) => {
                const occupied = isRoleOccupied(item.role);
                const IconComponent = item.icon;

                return (
                  <button
                    key={item.role}
                    disabled={occupied}
                    onClick={() => {
                      setStationRole(item.role);
                      setSelectedStudentId('');
                      setActiveView('station_app');
                    }}
                    className={`p-5 rounded-3xl border shadow-sm text-left transition-all ${
                      occupied
                        ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200/80 hover:border-blue-400 cursor-pointer group'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 bg-${item.color}-50 text-${item.color}-600 rounded-xl flex items-center justify-center`}>
                        <IconComponent size={20} />
                      </div>
                      {occupied && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-md">
                          다른 기기 사용 중
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{item.num}. {item.name}</h4>
                    <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. 부스별 전용 앱 화면 (펼쳐진 학생 선택 카드 목록 적용) */}
        {activeView === 'station_app' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => {
                  setStationRole('');
                  setActiveView('network_menu');
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <ChevronLeft size={16} />
                <span>역할 선택으로 돌아가기</span>
              </button>

              <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-700">
                <Server size={14} />
                <span>현재 기기 역할: {
                  stationRole === 'register' ? '1. 정보입력대' :
                  stationRole === 'timer' ? '2. 10초 타이머' :
                  stationRole === 'jegi' ? '3. 제기차기' :
                  stationRole === 'pron' ? '4. 발음테스트' :
                  stationRole === 'relay' ? '5. 사자성어' : '6. 간식수령대'
                }</span>
              </div>
            </div>

            {/* 1번 정보 입력대 전용 */}
            {stationRole === 'register' && (
              <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <User size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">현장 학생 등록</h2>
                  <p className="text-xs text-slate-500 mt-1">등록된 학생은 모든 부스 기기에 즉시 동기화됩니다.</p>
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
                          participantGender === '남자' ? 'bg-blue-50 border-[#1a73e8] text-[#1a73e8]' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        남자
                      </button>
                      <button
                        type="button"
                        onClick={() => setParticipantGender('여자')}
                        className={`py-3.5 rounded-2xl text-sm font-semibold border ${
                          participantGender === '여자' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'
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
                    <span>중앙 서버에 학생 등록하기</span>
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* 2~5번 부스용 쫘라락 펼쳐진 학생 선택 카드 목록 */}
            {stationRole !== 'register' && stationRole !== 'settlement' && (
              <div className="max-w-2xl mx-auto mb-6 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-3 ml-1">
                  <span className="text-xs font-bold text-slate-700">
                    📋 도전 학생 선택 (이전 단계를 완료한 학생만 선택 가능)
                  </span>
                  <span className="text-[10px] text-slate-400">총 {Object.keys(globalParticipants).length}명</span>
                </div>

                {Object.keys(globalParticipants).length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-6">1번 정보입력대에서 등록된 학생이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto p-1">
                    {Object.values(globalParticipants).map((st) => {
                      const isCompleted = !!st.scores?.[stationRole];
                      const isEligible = canPlayStation(st, stationRole);
                      const isSelected = selectedStudentId === st.id;

                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            if (!isEligible && !isCompleted) {
                              alert('이전 미니게임을 완료해야 이 부스에 도전할 수 있습니다!');
                              return;
                            }
                            setSelectedStudentId(st.id);
                          }}
                          className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#1a73e8] bg-blue-50/80 ring-2 ring-blue-500/20'
                              : isCompleted
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : isEligible
                              ? 'border-slate-200 bg-white hover:border-blue-300'
                              : 'border-slate-100 bg-slate-100/60 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm">[{st.id}] {st.name}</span>
                            <span className="text-xs font-semibold text-slate-500">{st.gender}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            {isCompleted ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} /> 도전 완료
                              </span>
                            ) : isEligible ? (
                              <span className="text-[#1a73e8] font-bold">🎯 도전 가능 (클릭)</span>
                            ) : (
                              <span className="text-slate-400 font-medium">🔒 이전 게임 미완료</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2번 타이머 부스 */}
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
                  <button onClick={stopGame} className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-lg cursor-pointer">
                    정지 (STOP)
                  </button>
                ) : (
                  <button onClick={startGame} className="w-full py-5 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-2xl text-lg cursor-pointer">
                    시작 (START)
                  </button>
                )}

                {gameResult && (
                  <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-xs font-bold">
                    서버 저장 기록: {gameResult.stoppedTime}초 ({gameResult.rank} - 간식권 +{gameResult.coupons}개)
                  </div>
                )}
              </div>
            )}

            {/* 3번 제기차기 부스 */}
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

                <button onClick={handleSaveJegiScore} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm cursor-pointer">
                  제기차기 결과 서버 저장
                </button>
              </div>
            )}

            {/* 4번 발음 테스트 부스 */}
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

            {/* 5번 사자성어 부스 */}
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
                  <button onClick={() => handleSaveRelayScore(true)} className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl cursor-pointer">성공 (+1개)</button>
                  <button onClick={() => handleSaveRelayScore(false)} className="py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl cursor-pointer">실패 (+0개)</button>
                </div>
              </div>
            )}

            {/* 6번 간식 수령대 */}
            {stationRole === 'settlement' && (
              <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Gift size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">간식 수령대</h2>
                  <p className="text-xs text-slate-500 mt-1">모든 부스 도전 결과를 확인 후 간식을 지급 처리합니다.</p>
                </div>

                <div className="space-y-4">
                  {Object.values(globalParticipants).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-8">등록된 학생이 없습니다.</p>
                  ) : (
                    Object.values(globalParticipants).map((st) => {
                      const timerC = st.scores?.timer?.coupons || 0;
                      const jegiC = st.scores?.jegi?.coupons || 0;
                      const pronC = st.scores?.pron?.coupons || 0;
                      const relayC = st.scores?.relay?.coupons || 0;
                      const totalC = timerC + jegiC + pronC + relayC;
                      const isAllDone = canPlayStation(st, 'settlement');

                      return (
                        <div key={st.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-slate-900">[{st.id}] {st.name}</span>
                              <span className="text-xs text-slate-400">({st.gender})</span>
                              {st.settled ? (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 font-bold rounded text-[10px]">수령완료</span>
                              ) : isAllDone ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]">수령가능</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-bold rounded text-[10px]">진행중</span>
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
                              disabled={st.settled || !isAllDone}
                              onClick={() => handleSettleSnack(st.id)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                st.settled
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : isAllDone
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              {st.settled ? '지급 완료됨' : isAllDone ? '간식 지급하기' : '게임 진행 중'}
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

        {/* 5. 복원된 올인원 체험 풀코스 로직 */}
        {activeView === 'aio_register' && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <button onClick={() => setActiveView('treasure_menu')} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-6 cursor-pointer">
              <ChevronLeft size={16} /> <span>모드 선택으로 돌아가기</span>
            </button>
            <div className="mb-6 text-center">
              <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">올인원 참가 학생 등록</h2>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!participantId.trim() || !participantName.trim()) return;
              setJegiCount(0);
              setPronCoupons(null);
              setActiveView('aio_timer_guide');
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">학번</label>
                <input type="text" value={participantId} onChange={(e) => setParticipantId(e.target.value)} placeholder="예: 10101" className="w-full px-4 py-3.5 bg-slate-50 border rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">이름</label>
                <input type="text" value={participantName} onChange={(e) => setParticipantName(e.target.value)} placeholder="학생 이름" className="w-full px-4 py-3.5 bg-slate-50 border rounded-2xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2 ml-1">성별</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setParticipantGender('남자')} className={`py-3.5 rounded-2xl text-sm font-semibold border ${participantGender === '남자' ? 'bg-blue-50 border-[#1a73e8] text-[#1a73e8]' : 'bg-slate-50'}`}>남자</button>
                  <button type="button" onClick={() => setParticipantGender('여자')} className={`py-3.5 rounded-2xl text-sm font-semibold border ${participantGender === '여자' ? 'bg-rose-50 border-rose-500 text-rose-600' : 'bg-slate-50'}`}>여자</button>
                </div>
              </div>
              <button type="submit" className="w-full py-3.5 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm mt-2 cursor-pointer">올인원 테스트 시작</button>
            </form>
          </div>
        )}

        {activeView === 'aio_timer_guide' && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">1단계: 10초 타이머 맞추기</h2>
            <p className="text-xs text-slate-500 mb-8">마음속으로 초를 세어 10초에 가장 가까울 때 정지 버튼을 누르세요.</p>
            <button onClick={() => setActiveView('aio_timer_play')} className="w-full py-4 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm cursor-pointer">타이머 도전</button>
          </div>
        )}

        {activeView === 'aio_timer_play' && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <h3 className="text-lg font-bold text-slate-900 mb-6">10.00초에 맞춰 정지하세요!</h3>
            <div className="h-36 flex items-center justify-center my-4 bg-slate-50 rounded-3xl border">
              <div style={{ opacity: isRunning && time >= 1 ? 0 : 1 }} className="text-7xl font-black font-mono">{time.toFixed(2)}</div>
            </div>
            {isRunning ? (
              <button onClick={() => { stopGame(); setActiveView('aio_timer_result'); }} className="w-full py-5 bg-red-500 text-white font-bold rounded-2xl text-lg cursor-pointer">정지 (STOP)</button>
            ) : (
              <button onClick={startGame} className="w-full py-5 bg-[#1a73e8] text-white font-bold rounded-2xl text-lg cursor-pointer">시작 (START)</button>
            )}
          </div>
        )}

        {activeView === 'aio_timer_result' && gameResult && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">타이머 결과: {gameResult.stoppedTime}초</h2>
            <p className="text-xs text-slate-500 mb-6">{gameResult.rank} 판정 (간식권 +{gameResult.coupons}개)</p>
            <button onClick={() => setActiveView('aio_jegi_play')} className="w-full py-4 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm cursor-pointer">다음 (제기차기)</button>
          </div>
        )}

        {activeView === 'aio_jegi_play' && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <h2 className="text-xl font-bold text-slate-900 mb-2">2단계: 제기차기 개수 측정</h2>
            <div className="text-7xl font-black font-mono my-6">{jegiCount}개</div>
            <div className="flex justify-center gap-3 mb-6">
              <button onClick={() => setJegiCount((p) => Math.max(0, p - 1))} className="w-16 h-16 bg-slate-100 rounded-2xl font-bold text-2xl cursor-pointer">-</button>
              <button onClick={() => setJegiCount((p) => p + 1)} className="w-20 h-20 bg-[#1a73e8] text-white rounded-3xl font-bold text-3xl cursor-pointer">+</button>
            </div>
            <button onClick={() => { setTargetSentence(PRON_SENTENCES[0]); setActiveView('aio_pron_play'); }} className="w-full py-4 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm cursor-pointer">다음 (발음 테스트)</button>
          </div>
        )}

        {activeView === 'aio_pron_play' && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <h2 className="text-xl font-bold text-slate-900 mb-2">3단계: 발음 정확도 채점</h2>
            <div className="p-4 bg-slate-50 rounded-2xl border text-left text-sm font-bold my-4">"{targetSentence}"</div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button onClick={() => setPronCoupons(3)} className={`p-3 rounded-2xl text-xs font-bold border ${pronCoupons === 3 ? 'bg-amber-100 border-amber-400' : 'bg-slate-50'}`}>완벽 (+3개)</button>
              <button onClick={() => setPronCoupons(2)} className={`p-3 rounded-2xl text-xs font-bold border ${pronCoupons === 2 ? 'bg-emerald-100 border-emerald-400' : 'bg-slate-50'}`}>우수 (+2개)</button>
              <button onClick={() => setPronCoupons(1)} className={`p-3 rounded-2xl text-xs font-bold border ${pronCoupons === 1 ? 'bg-blue-100 border-blue-400' : 'bg-slate-50'}`}>통과 (+1개)</button>
              <button onClick={() => setPronCoupons(0)} className={`p-3 rounded-2xl text-xs font-bold border ${pronCoupons === 0 ? 'bg-red-100 border-red-400' : 'bg-slate-50'}`}>실패 (+0개)</button>
            </div>
            <button disabled={pronCoupons === null} onClick={() => { setRelayScore(0); setActiveView('aio_relay_play'); }} className="w-full py-4 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm cursor-pointer">다음 (사자성어)</button>
          </div>
        )}

        {activeView === 'aio_relay_play' && (
          <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
            <h2 className="text-xl font-bold text-slate-900 mb-2">4단계: 사자성어 이어말하기</h2>
            <div className="p-6 bg-slate-50 rounded-3xl border my-4 space-y-3">
              <div className="text-4xl font-extrabold text-blue-600">제시어: 사자</div>
              <div className="text-4xl font-extrabold text-emerald-600">정답어: 성어</div>
            </div>
            <div className="grid grid-cols-2 gap-3 my-6">
              <button onClick={() => { setRelayScore(1); setActiveView('aio_settlement'); }} className="py-4 bg-emerald-600 text-white font-bold rounded-2xl cursor-pointer">성공 (+1개)</button>
              <button onClick={() => { setRelayScore(0); setActiveView('aio_settlement'); }} className="py-4 bg-rose-500 text-white font-bold rounded-2xl cursor-pointer">실패 (+0개)</button>
            </div>
          </div>
        )}

        {activeView === 'aio_settlement' && gameResult && (
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">올인원 최종 정산</h2>
            <p className="text-xs text-slate-500 mb-6">{participantId} {participantName} ({participantGender})</p>
            <div className="bg-slate-50 p-5 rounded-2xl text-sm space-y-2 mb-6">
              <div className="flex justify-between"><span>10초 타이머</span><b>+{gameResult.coupons}개</b></div>
              <div className="flex justify-between"><span>제기차기</span><b>+{jegiRes.coupons}개</b></div>
              <div className="flex justify-between"><span>발음 테스트</span><b>+{pronCoupons || 0}개</b></div>
              <div className="flex justify-between"><span>사자성어</span><b>+{relayScore}개</b></div>
              <div className="pt-2 border-t flex justify-between font-extrabold text-amber-600 text-base">
                <span>총 마이쮸 수령액</span>
                <span>{gameResult.coupons + jegiRes.coupons + (pronCoupons || 0) + relayScore}개</span>
              </div>
            </div>
            <button onClick={() => setActiveView('treasure_menu')} className="w-full py-4 bg-[#1a73e8] text-white font-medium rounded-2xl text-sm cursor-pointer">메인 메뉴로 돌아가기</button>
          </div>
        )}
      </main>
    </div>
  );
}