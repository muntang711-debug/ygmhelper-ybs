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
  AlertCircle,
  LogOut
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
  // 'main' | 'treasure_menu' | 'network_menu' | 'station_app' | 'aio_register' 등

  // 서비스 연동 기기 역할 상태
  const [stationRole, setStationRole] = useState('');

  // 역할 이탈 보호 모달 상태
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitCodeInput, setExitCodeInput] = useState('');
  const [exitError, setExitError] = useState('');

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
  const [relayScore, setRelayScore] = useState(0);

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const audioRef = useRef(null);

  // 파이어베이스 데이터 실시간 동기화
  useEffect(() => {
    const participantsRef = ref(db, 'participants');
    const stationsRef = ref(db, 'connectedStations');

    const unsub1 = onValue(participantsRef, (snapshot) => {
      setGlobalParticipants(snapshot.val() || {});
    });

    const unsub2 = onValue(stationsRef, (snapshot) => {
      setConnectedStations(snapshot.val() || {});
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // 기기 핑 및 실시간 서버 등록
  useEffect(() => {
    if (!stationRole) return;

    const deviceRef = ref(db, `connectedStations/${deviceId}`);

    set(deviceRef, {
      role: stationRole,
      lastActive: Date.now(),
    });

    onDisconnect(deviceRef).remove();

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

  // 부스 탈출/역할 변경 이탈 인증 처리
  const handleConfirmExitRole = (e) => {
    e.preventDefault();
    if (exitCodeInput.trim() === 'ybs2026') {
      setIsExitModalOpen(false);
      setExitCodeInput('');
      setExitError('');
      setStationRole('');
      setSelectedStudentId('');
      setActiveView('network_menu');
    } else {
      setExitError('인증 코드가 올바르지 않습니다.');
    }
  };

  // 부스별 플레이 자격 요건 검증 (앞 단계 완료 필수)
  const canPlayStation = (student, role) => {
    if (!student) return false;
    const scores = student.scores || {};
    if (role === 'timer') return true;
    if (role === 'jegi') return !!scores.timer;
    if (role === 'pron') return !!scores.jegi;
    if (role === 'relay') return !!scores.pron;
    if (role.startsWith('settlement')) return !!scores.relay;
    return false;
  };

  // 전체 초기화 (관리자 전용)
  const handleResetAllData = () => {
    if (!userSession?.isAdmin) {
      alert('관리자만 초기화할 수 있습니다.');
      return;
    }
    if (window.confirm('모든 참가자 데이터, 점수, 기기 역할까지 완전히 초기화하시겠습니까?')) {
      remove(ref(db, 'participants'));
      remove(ref(db, 'connectedStations'));
      setStationRole('');
      setSelectedStudentId('');
      setActiveView('network_menu');
      alert('모든 데이터가 성공적으로 초기화되었습니다.');
    }
  };

  // 1. 정보입력대: 학생 등록
  const handleRegisterStudent = (e) => {
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
    alert(`[${cleanName}] 학생이 등록되었습니다.`);
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
  };

  // 타이머 최종 완료 후 학생 목록으로 복귀
  const handleCompleteTimer = () => {
    if (!selectedStudentId || !gameResult) return;
    update(ref(db, `participants/${selectedStudentId}/scores/timer`), gameResult);
    setSelectedStudentId('');
    setTime(0);
    setGameResult(null);
  };

  // 제기차기 결과 완료 후 학생 목록으로 복귀
  const handleCompleteJegi = () => {
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

    setSelectedStudentId('');
    setJegiCount(0);
  };

  // 발음 테스트 결과 완료 후 학생 목록으로 복귀
  const handleCompletePron = (coupons, rankName) => {
    if (!selectedStudentId) return;
    update(ref(db, `participants/${selectedStudentId}/scores/pron`), {
      rankName,
      coupons,
    });

    setSelectedStudentId('');
    setPronCoupons(null);
    setPronRankName('');
  };

  // 사자성어 결과 저장 및 간식 수령대 배정 후 목록 복귀
  const handleCompleteRelay = (isSuccess) => {
    if (!selectedStudentId) return;
    const newScore = isSuccess ? 1 : 0;

    const now = Date.now();
    const activeSettlementRoles = Object.values(connectedStations)
      .filter((s) => s.role && s.role.startsWith('settlement_') && (now - s.lastActive < 5000))
      .map((s) => s.role);

    let assignedRole = null;
    let alertMsg = '';

    if (activeSettlementRoles.length > 0) {
      const randomIdx = Math.floor(Math.random() * activeSettlementRoles.length);
      assignedRole = activeSettlementRoles[randomIdx];
      const num = assignedRole.replace('settlement_', '');
      alertMsg = `사자성어 평가 완료! 🎉 간식 수령대 [${num}번 창구]로 이동하세요.`;
    } else {
      alertMsg = `사자성어 평가 완료! 수령대 기기가 등록되면 간식을 받을 수 있습니다.`;
    }

    update(ref(db, `participants/${selectedStudentId}/scores/relay`), {
      score: newScore,
      coupons: newScore,
    });

    update(ref(db, `participants/${selectedStudentId}`), {
      assignedSettlement: assignedRole,
    });

    alert(alertMsg);
    setSelectedStudentId('');
    setRelayScore(0);
  };

  // 간식 수령 완료
  const handleSettleSnack = (studentId) => {
    update(ref(db, `participants/${studentId}`), {
      settled: true,
      settledAt: Date.now(),
    });
    alert('간식 지급 처리가 완료되었습니다.');
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
            <p className="text-sm text-slate-500 mt-1">방송부 부원 신원 확인 후 접근 가능합니다.</p>
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

  // 부스 활성화 현황 집계
  const nowTime = Date.now();
  const activeStations = Object.values(connectedStations).filter((s) => nowTime - s.lastActive < 5000);
  const activeRolesCount = {
    register: activeStations.filter((s) => s.role === 'register').length,
    timer: activeStations.filter((s) => s.role === 'timer').length,
    jegi: activeStations.filter((s) => s.role === 'jegi').length,
    pron: activeStations.filter((s) => s.role === 'pron').length,
    relay: activeStations.filter((s) => s.role === 'relay').length,
    settlement_1: activeStations.filter((s) => s.role === 'settlement_1').length,
    settlement_2: activeStations.filter((s) => s.role === 'settlement_2').length,
    settlement_3: activeStations.filter((s) => s.role === 'settlement_3').length,
    settlement_4: activeStations.filter((s) => s.role === 'settlement_4').length,
  };

  const activeSettlementRoles = activeStations
    .filter((s) => s.role && s.role.startsWith('settlement_'))
    .map((s) => s.role);

  return (
    <div className="min-h-screen bg-[#f8fafd] text-slate-800 font-sans">
      {/* 일반 관리 모드일 때만 헤더 HUD 표시 (부스 진행 중일 때는 완전히 은폐) */}
      {activeView !== 'station_app' && (
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
      )}

      {/* 부스 운영 전용 탑 헤더 (학생들에게 개인정보 노출 방지 & 보안 잠금) */}
      {activeView === 'station_app' && (
        <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs sm:text-sm font-bold tracking-wide">
                부스 운영 중 : {
                  stationRole === 'register' ? '1. 학생 정보입력대' :
                  stationRole === 'timer' ? '2. 10초 타이머' :
                  stationRole === 'jegi' ? '3. 제기차기' :
                  stationRole === 'pron' ? '4. 발음 테스트' :
                  stationRole === 'relay' ? '5. 사자성어' :
                  `6. 간식 수령대 [${stationRole.replace('settlement_', '')}번 창구]`
                }
              </span>
            </div>

            <button
              onClick={() => setIsExitModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-slate-300 hover:text-white cursor-pointer"
            >
              <Lock size={13} />
              <span>역할 변경 (인증)</span>
            </button>
          </div>
        </header>
      )}

      {/* 메인 루프 관제 및 컨텐츠 */}
      <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
        {/* 메인 서비스 메뉴 */}
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

        {/* 보물찾기 모드 선택 */}
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
                onClick={() => setActiveView('network_menu')}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                      <Server size={24} />
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-xs font-semibold rounded-full">
                      연동 가능
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">
                    서비스 연동 테스트 (다중 기기)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    부스별 태블릿/스마트폰을 실시간으로 연결하여 데이터를 공유합니다.
                  </p>
                </div>
                <div className="mt-6">
                  <button className="w-full py-3 bg-[#1a73e8] text-white text-xs font-medium rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <span>부스 기기 역할 설정</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 기기 역할 설정 & 실시간 부스 현황판 */}
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
                <p className="text-sm text-slate-500 mt-1">이 기기에서 담당할 부스 역할을 선택하세요.</p>
              </div>

              {userSession?.isAdmin && (
                <button
                  onClick={handleResetAllData}
                  className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>데이터 전체 초기화 (관리자)</span>
                </button>
              )}
            </div>

            {/* 실시간 부스 현황판 */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wifi size={18} className="text-emerald-500 animate-pulse" />
                  <span className="text-sm font-bold text-slate-800">실시간 연결 부스 현황판</span>
                </div>
                <span className="text-xs text-slate-400 font-medium">실시간 동기화 중</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center mb-4">
                <div className={`p-3 rounded-2xl border ${activeRolesCount.register > 0 ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <span className="text-[10px] font-bold block">1. 정보입력대</span>
                  <span className="text-base font-black">{activeRolesCount.register}대 접속</span>
                </div>
                <div className={`p-3 rounded-2xl border ${activeRolesCount.timer > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <span className="text-[10px] font-bold block">2. 10초 타이머</span>
                  <span className="text-base font-black">{activeRolesCount.timer}대 접속</span>
                </div>
                <div className={`p-3 rounded-2xl border ${activeRolesCount.jegi > 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <span className="text-[10px] font-bold block">3. 제기차기</span>
                  <span className="text-base font-black">{activeRolesCount.jegi}대 접속</span>
                </div>
                <div className={`p-3 rounded-2xl border ${activeRolesCount.pron > 0 ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <span className="text-[10px] font-bold block">4. 발음 테스트</span>
                  <span className="text-base font-black">{activeRolesCount.pron}대 접속</span>
                </div>
                <div className={`p-3 rounded-2xl border ${activeRolesCount.relay > 0 ? 'bg-teal-50 border-teal-200 text-teal-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                  <span className="text-[10px] font-bold block">5. 사자성어</span>
                  <span className="text-base font-black">{activeRolesCount.relay}대 접속</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600 mb-2 block">6. 간식 수령대 연결 상황 (1~4번)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[1, 2, 3, 4].map((num) => {
                    const cnt = activeRolesCount[`settlement_${num}`];
                    return (
                      <div key={num} className={`p-2.5 rounded-xl border ${cnt > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                        <span className="text-[10px] font-bold block">수령대 {num}번</span>
                        <span className="text-xs font-extrabold">{cnt > 0 ? '🟢 접속됨' : '⚪ 미접속'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <h3 className="text-sm font-bold text-slate-700 mb-4 ml-1">이 기기의 부스 역할을 선택하세요:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <button
                onClick={() => { setStationRole('register'); setSelectedStudentId(''); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-blue-400 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-blue-50 text-[#1a73e8] rounded-xl flex items-center justify-center mb-3">
                  <User size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-[#1a73e8]">1. 학생 정보입력대</h4>
                <p className="text-xs text-slate-400 mt-1">도전 학생의 학번, 이름, 성별을 등록합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('timer'); setSelectedStudentId(''); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-indigo-400 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3">
                  <Timer size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600">2. 10초 타이머 부스</h4>
                <p className="text-xs text-slate-400 mt-1">10초 타이머를 측정하고 점수를 기록합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('jegi'); setSelectedStudentId(''); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-amber-400 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3">
                  <Activity size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-600">3. 제기차기 부스</h4>
                <p className="text-xs text-slate-400 mt-1">제기차기 성공 개수를 측정하고 채점합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('pron'); setSelectedStudentId(''); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-purple-400 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-purple-600">4. 발음 테스트 부스</h4>
                <p className="text-xs text-slate-400 mt-1">제시어 읽기 정확도를 채점합니다.</p>
              </button>

              <button
                onClick={() => { setStationRole('relay'); setSelectedStudentId(''); setActiveView('station_app'); }}
                className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-teal-400 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mb-3">
                  <HelpCircle size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-600">5. 사자성어 부스</h4>
                <p className="text-xs text-slate-400 mt-1">이어말하기 성공/실패를 판정합니다.</p>
              </button>

              {[1, 2, 3, 4].map((num) => (
                <button
                  key={`settlement_${num}`}
                  onClick={() => { setStationRole(`settlement_${num}`); setSelectedStudentId(''); setActiveView('station_app'); }}
                  className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:border-emerald-400 text-left transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                    <Gift size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-600">6. 간식 수령대 [{num}번]</h4>
                  <p className="text-xs text-slate-400 mt-1">{num}번 창구 배정 학생의 간식을 정산합니다.</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 부스 전용 애플리케이션 실행 화면 */}
        {activeView === 'station_app' && (
          <div>
            {/* 1번 정보 입력대 */}
            {stationRole === 'register' && (
              <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-[#1a73e8] rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <User size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">도전 학생 정보 등록</h2>
                  <p className="text-xs text-slate-500 mt-1">등록된 정보는 모든 부스 기기에 동기화됩니다.</p>
                </div>

                <form onSubmit={handleRegisterStudent} className="space-y-4">
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
                    <span>등록하기</span>
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* 2~5번 미니게임 부스: 학생 목록 선택 화면 (선택 전) */}
            {stationRole !== 'register' && !stationRole.startsWith('settlement') && selectedStudentId === '' && (
              <div className="max-w-2xl mx-auto bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">도전할 학생을 선택하세요</h3>
                    <p className="text-xs text-slate-500 mt-0.5">이전 단계를 완료한 학생만 도전이 가능합니다.</p>
                  </div>
                  <span className="text-xs bg-slate-100 px-3 py-1 rounded-full font-bold text-slate-600">
                    등록인원 {Object.keys(globalParticipants).length}명
                  </span>
                </div>

                {Object.keys(globalParticipants).length === 0 ? (
                  <div className="text-center py-12">
                    <User size={36} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">1번 정보입력대에서 등록된 학생이 아직 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[480px] overflow-y-auto p-1">
                    {Object.values(globalParticipants).map((st) => {
                      const isCompleted = !!st.scores?.[stationRole];
                      const isEligible = canPlayStation(st, stationRole);

                      return (
                        <div
                          key={st.id}
                          onClick={() => {
                            if (!isEligible && !isCompleted) {
                              alert('이전 미니게임을 먼저 완수해야 해당 부스에 도전할 수 있습니다!');
                              return;
                            }
                            setSelectedStudentId(st.id);
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all ${
                            isCompleted
                              ? 'border-emerald-200 bg-emerald-50/40 opacity-75'
                              : isEligible
                              ? 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-sm cursor-pointer'
                              : 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900 text-sm">[{st.id}] {st.name}</span>
                            <span className="text-xs font-semibold text-slate-500">{st.gender}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            {isCompleted ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 size={13} /> 도전 완료됨
                              </span>
                            ) : isEligible ? (
                              <span className="text-[#1a73e8] font-bold flex items-center gap-1">
                                🎯 도전 시작하기 <ArrowRight size={12} />
                              </span>
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

            {/* 2번 10초 타이머 전용 게임 창 (학생 선택 후 개인 화면) */}
            {stationRole === 'timer' && selectedStudentId !== '' && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-4 cursor-pointer"
                >
                  <ChevronLeft size={14} /> 학생 목록으로 돌아가기
                </button>

                <div className="p-3 bg-blue-50 rounded-2xl mb-6">
                  <span className="text-xs font-semibold text-[#1a73e8] block">도전 학생</span>
                  <span className="text-lg font-black text-slate-900">
                    [{selectedStudentId}] {globalParticipants[selectedStudentId]?.name} 학생
                  </span>
                </div>

                <div className="h-32 flex items-center justify-center my-4 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="text-6xl font-black text-slate-900 font-mono">
                    {time.toFixed(2)}s
                  </div>
                </div>

                {isRunning ? (
                  <button onClick={stopGame} className="w-full py-5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-lg cursor-pointer shadow-sm">
                    정지 (STOP)
                  </button>
                ) : (
                  <button onClick={startGame} className="w-full py-5 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-2xl text-lg cursor-pointer shadow-sm">
                    시작 (START)
                  </button>
                )}

                {gameResult && (
                  <div className="mt-6 space-y-3">
                    <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl text-sm font-bold">
                      측정 결과: {gameResult.stoppedTime}초 ({gameResult.rank} / 간식 +{gameResult.coupons}개)
                    </div>
                    <button
                      onClick={handleCompleteTimer}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm cursor-pointer shadow-sm flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      <span>완료하고 다음 학생 선택하기</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3번 제기차기 전용 게임 창 (학생 선택 후 개인 화면) */}
            {stationRole === 'jegi' && selectedStudentId !== '' && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-4 cursor-pointer"
                >
                  <ChevronLeft size={14} /> 학생 목록으로 돌아가기
                </button>

                <div className="p-3 bg-amber-50 rounded-2xl mb-6">
                  <span className="text-xs font-semibold text-amber-700 block">도전 학생</span>
                  <span className="text-lg font-black text-slate-900">
                    [{selectedStudentId}] {globalParticipants[selectedStudentId]?.name} ({globalParticipants[selectedStudentId]?.gender})
                  </span>
                  <span className="text-[11px] text-amber-600 block mt-0.5">
                    통과 목표: {globalParticipants[selectedStudentId]?.gender === '남자' ? '5개 이상' : '3개 이상'}
                  </span>
                </div>

                <div className="text-6xl font-black text-slate-900 font-mono my-6">
                  {jegiCount}<span className="text-xl font-normal text-slate-400">개</span>
                </div>

                <div className="flex justify-center gap-3 mb-6">
                  <button onClick={() => setJegiCount((p) => Math.max(0, p - 1))} className="w-14 h-14 bg-slate-100 rounded-2xl font-bold text-xl cursor-pointer">-</button>
                  <button onClick={() => setJegiCount((p) => p + 1)} className="w-20 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-xl cursor-pointer">+</button>
                </div>

                <button
                  onClick={handleCompleteJegi}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-sm cursor-pointer shadow-sm flex items-center justify-center gap-2"
                >
                  <Check size={16} />
                  <span>기록 완료하기</span>
                </button>
              </div>
            )}

            {/* 4번 발음 테스트 전용 게임 창 (학생 선택 후 개인 화면) */}
            {stationRole === 'pron' && selectedStudentId !== '' && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-4 cursor-pointer"
                >
                  <ChevronLeft size={14} /> 학생 목록으로 돌아가기
                </button>

                <div className="p-3 bg-purple-50 rounded-2xl mb-4">
                  <span className="text-xs font-semibold text-purple-700 block">도전 학생</span>
                  <span className="text-lg font-black text-slate-900">
                    [{selectedStudentId}] {globalParticipants[selectedStudentId]?.name} 학생
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border text-left text-sm font-bold my-4 leading-relaxed text-slate-800">
                  "{PRON_SENTENCES[0]}"
                </div>

                <p className="text-xs text-slate-500 mb-4">발음 정확도를 판단하여 해당 등급을 선택하세요:</p>

                <div className="grid grid-cols-2 gap-2.5 mb-6">
                  <button onClick={() => handleCompletePron(3, '완벽')} className="p-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-2xl text-xs font-bold border border-amber-200 cursor-pointer">
                    완벽 (+3개)
                  </button>
                  <button onClick={() => handleCompletePron(2, '우수')} className="p-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-200 cursor-pointer">
                    우수 (+2개)
                  </button>
                  <button onClick={() => handleCompletePron(1, '통과')} className="p-3.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-2xl text-xs font-bold border border-blue-200 cursor-pointer">
                    통과 (+1개)
                  </button>
                  <button onClick={() => handleCompletePron(0, '실패')} className="p-3.5 bg-red-50 hover:bg-red-100 text-red-900 rounded-2xl text-xs font-bold border border-red-200 cursor-pointer">
                    실패 (+0개)
                  </button>
                </div>
              </div>
            )}

            {/* 5번 사자성어 전용 게임 창 (학생 선택 후 개인 화면) */}
            {stationRole === 'relay' && selectedStudentId !== '' && (
              <div className="max-w-md mx-auto text-center bg-white rounded-3xl p-8 shadow-sm border border-slate-200/80">
                <button
                  onClick={() => setSelectedStudentId('')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 mb-4 cursor-pointer"
                >
                  <ChevronLeft size={14} /> 학생 목록으로 돌아가기
                </button>

                <div className="p-3 bg-teal-50 rounded-2xl mb-4">
                  <span className="text-xs font-semibold text-teal-700 block">도전 학생</span>
                  <span className="text-lg font-black text-slate-900">
                    [{selectedStudentId}] {globalParticipants[selectedStudentId]?.name} 학생
                  </span>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 my-4 space-y-3">
                  <div className="text-4xl font-extrabold text-blue-600">제시어: 사자</div>
                  <div className="text-4xl font-extrabold text-emerald-600">정답어: 성어</div>
                </div>

                <div className="grid grid-cols-2 gap-3 my-6">
                  <button onClick={() => handleCompleteRelay(true)} className="py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl cursor-pointer text-sm shadow-sm">
                    성공 (+1개)
                  </button>
                  <button onClick={() => handleCompleteRelay(false)} className="py-4 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl cursor-pointer text-sm shadow-sm">
                    실패 (+0개)
                  </button>
                </div>
              </div>
            )}

            {/* 6번 간식 수령대 (학생 맞춤형 성적표 인터페이스) */}
            {stationRole.startsWith('settlement') && (
              <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Gift size={24} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">
                    간식 정산 수령대 [{stationRole.replace('settlement_', '')}번 창구]
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    학생의 종목별 결과를 확인하고 간식을 수령 처리합니다.
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.values(globalParticipants).length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-10">등록된 학생이 없습니다.</p>
                  ) : (
                    Object.values(globalParticipants)
                      .filter((st) => {
                        if (!canPlayStation(st, stationRole)) return false;
                        const isOriginalAssignedAlive = activeSettlementRoles.includes(st.assignedSettlement);
                        if (st.assignedSettlement === stationRole) return true;
                        if (!isOriginalAssignedAlive && activeSettlementRoles[0] === stationRole) return true;
                        return false;
                      })
                      .map((st) => {
                        const timerC = st.scores?.timer?.coupons || 0;
                        const jegiC = st.scores?.jegi?.coupons || 0;
                        const pronC = st.scores?.pron?.coupons || 0;
                        const relayC = st.scores?.relay?.coupons || 0;
                        const totalC = timerC + jegiC + pronC + relayC;

                        return (
                          <div key={st.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                              <div>
                                <span className="text-base font-extrabold text-slate-900">[{st.id}] {st.name}</span>
                                <span className="text-xs text-slate-400 ml-2">({st.gender})</span>
                              </div>
                              {st.settled ? (
                                <span className="px-3 py-1 bg-gray-200 text-gray-700 font-bold rounded-full text-xs">
                                  수령 완료됨
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-xs">
                                  수령 대기 중
                                </span>
                              )}
                            </div>

                            {/* 미니게임 4종 성적 집계표 */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                                <span className="text-slate-400 font-medium block text-[10px]">⏱️ 10초 타이머</span>
                                <span className="font-bold text-slate-800 mt-1 block">+{timerC}개</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                                <span className="text-slate-400 font-medium block text-[10px]">🦵 제기차기</span>
                                <span className="font-bold text-slate-800 mt-1 block">+{jegiC}개</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                                <span className="text-slate-400 font-medium block text-[10px]">🗣️ 발음 테스트</span>
                                <span className="font-bold text-slate-800 mt-1 block">+{pronC}개</span>
                              </div>
                              <div className="p-2.5 bg-white rounded-xl border border-slate-200/70">
                                <span className="text-slate-400 font-medium block text-[10px]">📖 사자성어</span>
                                <span className="font-bold text-slate-800 mt-1 block">+{relayC}개</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <div>
                                <span className="text-xs text-slate-500 font-medium">최종 간식 수령액:</span>
                                <span className="text-lg font-black text-amber-600 ml-1.5">마이쮸 {totalC}개</span>
                              </div>

                              <button
                                disabled={st.settled}
                                onClick={() => handleSettleSnack(st.id)}
                                className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                                  st.settled
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                }`}
                              >
                                {st.settled ? '수령 완료' : '간식 수령 확인'}
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
      </main>

      {/* 역할 변경 이탈 보안 모달 (비밀번호 검증) */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center">부스 역할 변경 인증</h3>
            <p className="text-xs text-slate-500 text-center mt-1 mb-6">
              부스를 이탈하거나 역할을 변경하려면 인증 코드를 입력하세요.
            </p>

            <form onSubmit={handleConfirmExitRole} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={exitCodeInput}
                  onChange={(e) => setExitCodeInput(e.target.value)}
                  placeholder="인증 코드 입력"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/20 focus:border-[#1a73e8]"
                  autoFocus
                />
                {exitError && (
                  <p className="text-xs text-red-500 text-center mt-2 font-medium">{exitError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsExitModalOpen(false);
                    setExitCodeInput('');
                    setExitError('');
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs cursor-pointer transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="py-3 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold rounded-2xl text-xs cursor-pointer transition-colors"
                >
                  인증 및 이탈
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}