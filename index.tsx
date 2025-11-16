import React, { useState, useEffect, useRef, useCallback, memo, Dispatch, SetStateAction, RefObject, ElementType, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { MessageCircle, Target, TrendingUp, Calendar, Clock, Brain, Coffee, Moon, Sun, CheckCircle2, ChevronDown, ChevronUp, Code, FileText, Upload, Play, BarChart3, Heart, Briefcase, Sparkles, Award, Flame, BookOpen, Activity, AlertCircle, X, Check, Pause, Flag, ShieldCheck, Zap, HelpCircle, Paperclip, Eye, EyeOff, Bell, PlusCircle, Trash2, Pencil, Plus } from 'lucide-react';
import { GoogleGenAI, Chat, Type } from '@google/genai';

// Fix: Add type definitions for component props
// Type definitions for component props
interface Habit {
  id: number;
  name: string;
  icon: string;
  completed: boolean;
  streak: number;
}

interface SubTask {
  id: number;
  title: string;
  completed: boolean;
}

interface CoreCircle {
  id: number;
  name: string;
  value: number;
  icon: ElementType;
  color: string;
}

interface DailyScheduleItem {
  id: number;
  time: string;
  title: string;
  description?: string;
  type: string;
  completed: boolean;
  duration: number;
  isFixed: boolean;
  category?: 'worship' | 'health' | 'work' | 'learning' | 'other' | string;
  reminderMinutes?: number;
  reminderSent?: boolean;
  subTasks?: SubTask[];
}

interface MonthlyGoal {
  id: number;
  title: string;
  deadline: string;
  roadmap: { title: string; completed: boolean }[];
}

interface TaskTemplate {
    id: string;
    title: string;
    duration: number;
    type: string;
    icon: string;
    category: 'worship' | 'health' | 'work' | 'learning';
}

interface TaskCategory {
    id: string;
    name: string;
    icon: ElementType;
    tasks: TaskTemplate[];
}


interface DailyViewProps {
  currentTime: Date;
  stats: { streak: number; points: number; };
  coreCircles: CoreCircle[];
  dailySchedule: DailyScheduleItem[];
  toggleScheduleItem: (id: number) => void;
  deleteScheduleItem: (id: number) => void;
  toggleSubTask: (taskId: number, subTaskId: number) => void;
  activePomodoroTask: DailyScheduleItem | null;
  startPomodoro: (task: DailyScheduleItem) => void;
  showCompletedTasks: boolean;
  setShowCompletedTasks: Dispatch<SetStateAction<boolean>>;
  queryTaskDetails: (task: DailyScheduleItem) => Promise<void>;
  taskCategories: TaskCategory[];
  handleAddTaskFromTemplate: (task: TaskTemplate) => void;
  setReminderTask: Dispatch<SetStateAction<DailyScheduleItem | null>>;
  onAddTask: () => void;
  onEditTask: (task: DailyScheduleItem) => void;
}

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  attachment?: string;
}

interface SuggestedTask {
  id: string;
  title: string;
  time: string;
  duration: number;
  category?: string;
  subTasks?: { title: string; completed: boolean }[];
}

interface ChatViewProps {
  messages: Message[];
  suggestedTasks: SuggestedTask[];
  confirmTask: (taskId: string) => void;
  confirmAllTasks: () => void;
  rejectTask: (taskId: string) => void;
  rejectAllTasks: () => void;
  isLoading: boolean;
  chatEndRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLTextAreaElement>;
  inputMessage: string;
  setInputMessage: Dispatch<SetStateAction<string>>;
  handleSendMessage: (messageToSend?: string) => Promise<void>;
  attachedFile: { data: string; mimeType: string; } | null;
  setAttachedFile: Dispatch<SetStateAction<{ data: string; mimeType: string; } | null>>;
}

interface ReviewResult {
  type: 'success' | 'error';
  message: string;
  score?: number;
  errors?: { line: number; message: string; severity: 'error' | 'warning' }[];
  suggestions?: string[];
}

interface ReviewViewProps {
  codeToReview: string;
  setCodeToReview: Dispatch<SetStateAction<string>>;
  reviewCode: () => Promise<void>;
  isLoading: boolean;
  reviewResult: ReviewResult | null;
}

interface GoalsViewProps {
  monthlyGoals: MonthlyGoal[];
  isLoading: boolean;
  generateLongTermGoals: () => Promise<void>;
  toggleGoalStep: (goalId: number, stepIndex: number) => void;
  deleteGoal: (goalId: number) => void;
}

interface UserProfile {
  name: string;
  goals: any[];
  wakeTime: string;
  sleepTime: string;
}

interface OnboardingFlowProps {
  userProfile: UserProfile;
  setUserProfile: Dispatch<SetStateAction<UserProfile>>;
  setShowOnboarding: Dispatch<SetStateAction<boolean>>;
  addNotification: (message: string, type?: string) => void;
}

interface PomodoroTimerProps {
  activePomodoroTask: DailyScheduleItem | null;
  pomodoroPhase: 'work' | 'break';
  pomodoroTimeLeft: number;
  isPomodoroRunning: boolean;
  pomodoroSessions: number;
  formatPomodoroTime: (seconds: number) => string;
  togglePomodoro: () => void;
  stopPomodoro: () => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  unlocked: boolean;
}

interface ProgressViewProps {
  userProfile: UserProfile;
  stats: { points: number; streak: number };
  dailySchedule: DailyScheduleItem[];
  achievements: Achievement[];
}

const formatTo12Hour = (timeString: string): string => {
  if (!timeString || !timeString.includes(':')) {
    return timeString; // Return original string if format is unexpected
  }
  const [hour, minute] = timeString.split(':').map(Number);
  const ampm = hour >= 12 ? 'م' : 'ص';
  let hour12 = hour % 12;
  if (hour12 === 0) {
    hour12 = 12; // Handle midnight and noon
  }
  const minutePadded = minute.toString().padStart(2, '0');
  const hourPadded = hour12.toString().padStart(2, '0');
  
  return `${hourPadded}:${minutePadded} ${ampm}`;
};

const CoreHabitsView = memo(({ categories, onAddTask }: { categories: TaskCategory[]; onAddTask: (task: TaskTemplate) => void; }) => {
    const [openCategory, setOpenCategory] = useState<string | null>(null);

    return (
        <div className="space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5" />
                عادات أساسية
            </h3>
            {categories.map(category => {
                const Icon = category.icon;
                const isOpen = openCategory === category.id;
                return (
                    <div key={category.id} className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700">
                        <button
                            onClick={() => setOpenCategory(isOpen ? null : category.id)}
                            className="w-full p-4 flex items-center justify-between text-white hover:bg-gray-800/70"
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-purple-400" />
                                <span className="font-semibold">{category.name}</span>
                            </div>
                            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                        {isOpen && (
                            <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {category.tasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                                        <span className="text-2xl">{task.icon}</span>
                                        <div className="flex-1">
                                            <p className="font-medium text-white">{task.title}</p>
                                        </div>
                                        <button 
                                            onClick={() => onAddTask(task)}
                                            className="p-2 text-gray-400 hover:text-white hover:bg-purple-600/50 rounded-full transition-colors"
                                            aria-label={`إضافة ${task.title}`}
                                        >
                                            <PlusCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});


const DailyView = memo(({
  currentTime,
  stats,
  coreCircles,
  dailySchedule,
  toggleScheduleItem,
  deleteScheduleItem,
  toggleSubTask,
  activePomodoroTask,
  startPomodoro,
  showCompletedTasks,
  setShowCompletedTasks,
  queryTaskDetails,
  taskCategories,
  handleAddTaskFromTemplate,
  setReminderTask,
  onAddTask,
  onEditTask,
}: DailyViewProps) => (
    <div className="relative h-full overflow-y-auto pb-24">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">يومك</h2>
            <p className="text-gray-400 text-sm">{currentTime.toLocaleDateString('ar-EG')}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 rounded-full flex items-center gap-1">
              <Flame className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">{stats.streak}</span>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full flex items-center gap-1">
              <Award className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">{stats.points}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {coreCircles.map(circle => {
            const Icon = circle.icon;
            return (
              <div key={circle.id} className="flex flex-col items-center">
                <div className="relative w-16 h-16">
                  <svg className="transform -rotate-90 w-16 h-16">
                    <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="6" fill="none" />
                    <circle 
                      cx="32" cy="32" r="28" 
                      stroke={circle.color === 'green' ? 'rgb(34,197,94)' : circle.color === 'blue' ? 'rgb(59,130,246)' : circle.color === 'purple' ? 'rgb(168,85,247)' : 'rgb(234,179,8)'}
                      strokeWidth="6" 
                      fill="none"
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - circle.value / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1">{circle.name}</p>
                <p className="text-xs font-bold text-white">{Math.round(circle.value)}%</p>
              </div>
            );
          })}
        </div>

        <CoreHabitsView categories={taskCategories} onAddTask={handleAddTaskFromTemplate} />

        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                جدول اليوم
            </h3>
            <button onClick={() => setShowCompletedTasks(!showCompletedTasks)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-gray-700/50">
                {showCompletedTasks ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showCompletedTasks ? 'إخفاء المكتمل' : 'إظهار المكتمل'}</span>
            </button>
          </div>
           {dailySchedule.length === 0 && (
                <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                    <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">جدولك فارغ اليوم.</p>
                    <p className="text-sm text-gray-500">استخدم المحادثة أو قسم العادات الأساسية لتبدأ!</p>
                </div>
            )}
          <div className="space-y-2">
            {dailySchedule.filter(item => showCompletedTasks || !item.completed).map((item, index) => {
              const isNext = !item.completed && (index === 0 || dailySchedule.filter(i => showCompletedTasks || !i.completed)[index - 1]?.completed);
              const totalSubTasks = item.subTasks?.length || 0;
              const completedSubTasks = item.subTasks?.filter(st => st.completed).length || 0;
              return (
                <div
                  key={item.id}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    item.completed 
                      ? 'bg-gray-800/30 border-gray-700 opacity-60'
                      : isNext
                      ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500 shadow-lg'
                      : 'bg-gray-800/50 border-gray-700'
                  }`}
                >
                  {isNext && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  )}
                  
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleScheduleItem(item.id)}
                      className={`mt-1 w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                        item.completed 
                          ? 'bg-green-500 border-green-500'
                          : isNext
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-600'
                      }`}
                    >
                      {item.completed && <CheckCircle2 className="w-5 h-5 text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-purple-400">{formatTo12Hour(item.time)}</span>
                        <span className="text-xs text-gray-500">({item.duration} دقيقة)</span>
                      </div>
                      <p className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {item.title}
                      </p>
                      {item.description && (
                          <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      )}
                      {item.subTasks && item.subTasks.length > 0 && (
                          <div className="mt-2 space-y-1.5 pl-2 border-r-2 border-gray-700 mr-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-gray-400">مهام فرعية</span>
                                <span className="text-xs text-gray-500">{completedSubTasks}/{totalSubTasks}</span>
                            </div>
                            {item.subTasks.map(subTask => (
                                <div key={subTask.id} className="flex items-center gap-2 text-sm cursor-pointer" onClick={() => toggleSubTask(item.id, subTask.id)}>
                                    <div className={`w-4 h-4 flex-shrink-0 rounded-md flex items-center justify-center ${subTask.completed ? 'bg-green-500' : 'border-2 border-gray-500'}`}>
                                        {subTask.completed && <Check className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className={`${subTask.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                        {subTask.title}
                                    </span>
                                </div>
                            ))}
                          </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.type === 'prayer' ? 'bg-green-500/20 text-green-400' :
                          item.type === 'habit' ? 'bg-blue-500/20 text-blue-400' :
                          item.type === 'task' ? 'bg-purple-500/20 text-purple-400' :
                          item.type === 'break' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {item.type === 'prayer' ? '🕌 صلاة' :
                           item.type === 'habit' ? '✨ عادة' :
                           item.type === 'task' ? '📝 مهمة' :
                           item.type === 'break' ? '☕ استراحة' :
                           '🍽️ وجبة'}
                        </span>
                         <button
                            onClick={() => queryTaskDetails(item)}
                            className="p-1 text-gray-500 rounded-full hover:bg-gray-700 hover:text-white transition-colors"
                            aria-label={`اسأل عن ${item.title}`}
                          >
                           <HelpCircle className="w-4 h-4" />
                          </button>
                           <button
                              onClick={() => onEditTask(item)}
                              className="p-1 text-gray-500 rounded-full hover:bg-gray-700 hover:text-white transition-colors"
                              aria-label={`تعديل ${item.title}`}
                            >
                             <Pencil className="w-4 h-4" />
                            </button>
                          <button
                            onClick={() => setReminderTask(item)}
                            className={`p-1 rounded-full hover:bg-gray-700 transition-colors ${item.reminderMinutes ? 'text-yellow-400' : 'text-gray-500'}`}
                            aria-label={`ضبط تذكير لـ ${item.title}`}
                          >
                           <Bell className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteScheduleItem(item.id)}
                            className="p-1 text-gray-500 rounded-full hover:bg-gray-700 hover:text-red-400 transition-colors"
                            aria-label={`حذف ${item.title}`}
                           >
                           <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                    </div>
                     <div className="self-center flex-shrink-0">
                      {activePomodoroTask?.id === item.id ? (
                        <div className="flex items-center gap-1.5 text-purple-400 text-xs font-semibold py-2 px-3 bg-purple-500/10 rounded-full">
                          <Activity className="w-4 h-4 animate-pulse" />
                          <span>جاري</span>
                        </div>
                      ) : (!item.completed && item.type === 'task' ? (
                        <button
                          onClick={() => startPomodoro(item)}
                          className="p-3 bg-gray-700/60 text-gray-300 rounded-full hover:bg-purple-600/40 hover:text-white transition-colors"
                          aria-label={`بدء Pomodoro لـ ${item.title}`}
                        >
                          <Play className="w-5 h-5" />
                        </button>
                      ) : null)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <button
        onClick={onAddTask}
        className="fixed bottom-24 right-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-105 transition-transform z-30"
        aria-label="إضافة مهمة جديدة"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  ));

const ChatView = memo(({
  messages,
  suggestedTasks,
  confirmTask,
  confirmAllTasks,
  rejectTask,
  rejectAllTasks,
  isLoading,
  chatEndRef,
  inputRef,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  attachedFile,
  setAttachedFile,
}: ChatViewProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const textarea = inputRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [inputMessage, inputRef]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedFile({
            data: reader.result as string,
            mimeType: file.type,
          });
        };
        reader.readAsDataURL(file);
      }
    };

    return (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">مرحباً! 👋</h3>
                <p className="text-gray-400">أنا هنا لمساعدتك. اسألني أي حاجة!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-gray-800 text-white'
                }`}>
                  {msg.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <span className="font-semibold text-purple-400">AI Coach</span>
                    </div>
                  )}
                  {msg.attachment && (
                      <img src={msg.attachment} alt="attachment" className="rounded-lg mb-2 max-h-64" />
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {msg.timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </span>
                </div>
              </div>
            ))}
            
            {suggestedTasks.length > 0 && (
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-purple-400">مهام مقترحة</span>
                  </div>
                   <div className="flex items-center gap-2">
                    <button 
                        onClick={confirmAllTasks}
                        className="text-xs text-green-400 hover:text-white hover:bg-green-600/50 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                        <Check className="w-3 h-3" />
                        إضافة الكل
                    </button>
                    <button 
                        onClick={rejectAllTasks} 
                        className="text-xs text-gray-400 hover:text-white hover:bg-gray-700 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                    >
                        <X className="w-3 h-3" />
                        مسح الكل
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {suggestedTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-white">{task.title}</p>
                        <p className="text-xs text-gray-400">{formatTo12Hour(task.time)} - {task.duration} دقيقة</p>
                         {task.subTasks && task.subTasks.length > 0 && (
                            <p className="text-xs text-purple-400 mt-1">+{task.subTasks.length} مهام فرعية</p>
                         )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmTask(task.id)}
                          className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center"
                          aria-label="Confirm Task"
                        >
                          <Check className="w-5 h-5 text-white" />
                        </button>
                        <button
                          onClick={() => rejectTask(task.id)}
                          className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center"
                          aria-label="Reject Task"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm text-gray-400">بفكر...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t border-gray-800 bg-gray-900">
             {attachedFile && (
                <div className="mb-2 p-2 bg-gray-800 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src={attachedFile.data} className="w-12 h-12 object-cover rounded" />
                        <span className="text-sm text-gray-400">ملف مرفق</span>
                    </div>
                    <button onClick={() => setAttachedFile(null)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                        <X className="w-4 h-4" />
                    </button>
                </div>
              )}
             <div className="flex gap-2 items-start">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="self-end p-3 bg-gray-800 border-2 border-gray-700 text-gray-400 rounded-xl hover:border-purple-500 hover:text-white"
                aria-label="Attach file"
              >
                  <Paperclip className="w-5 h-5" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              <div className="flex-1">
                 <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder="اكتب رسالتك..."
                  className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none resize-none"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  autoComplete="off"
                />
              </div>
              <button
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                className="self-end px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                إرسال
              </button>
            </div>

            <div className="flex gap-2 mt-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {['راجع يومي معايا', 'اقترح لي مهام', 'حمسني شوية'].map((quick, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputMessage(quick);
                    setTimeout(() => {
                      handleSendMessage();
                    }, 100);
                  }}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm whitespace-nowrap hover:bg-gray-700 border border-gray-700 flex-shrink-0"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>
        </div>
    );
});

const ReviewView = memo(({
  codeToReview,
  setCodeToReview,
  reviewCode,
  isLoading,
  reviewResult
}: ReviewViewProps) => (
    <div className="h-full overflow-y-auto pb-20 p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-3 rounded-xl">
            <Code className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">مراجع الكود</h2>
            <p className="text-gray-400 text-sm">ارفع كودك وأنا هراجعه معاك</p>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <label className="block text-white font-semibold mb-2">الكود:</label>
          <textarea
            value={codeToReview}
            onChange={(e) => setCodeToReview(e.target.value)}
            placeholder="الصق الكود هنا..."
            className="w-full h-64 p-3 bg-gray-900 border-2 border-gray-700 rounded-xl text-white font-mono text-sm placeholder-gray-600 focus:border-cyan-500 outline-none resize-none"
            autoComplete="off"
          />
          
          <button
            onClick={reviewCode}
            disabled={isLoading}
            className="w-full mt-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Activity className="w-5 h-5 animate-spin" />
                جاري المراجعة...
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                راجع الكود
              </>
            )}
          </button>
        </div>

        {reviewResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border-2 ${
              reviewResult.type === 'success' ? 'bg-green-900/20 border-green-600' : 'bg-red-900/20 border-red-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {reviewResult.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <X className="w-5 h-5 text-red-400" />
                )}
                <span className="font-bold text-white">نتيجة المراجعة</span>
              </div>
              <p className="text-gray-300">{reviewResult.message}</p>
              {reviewResult.score && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">التقييم:</span>
                    <span className="text-lg font-bold text-white">{reviewResult.score}/100</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${reviewResult.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {reviewResult.errors && reviewResult.errors.length > 0 && (
              <div className="bg-red-900/20 border-2 border-red-600 rounded-xl p-4">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  الأخطاء المكتشفة:
                </h3>
                <div className="space-y-2">
                  {reviewResult.errors.map((error, idx) => (
                    <div key={idx} className="p-3 bg-gray-900/50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          error.severity === 'error' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'
                        }`}>
                          السطر {error.line}
                        </span>
                        <p className="flex-1 text-sm text-gray-300">{error.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewResult.suggestions && reviewResult.suggestions.length > 0 && (
              <div className="bg-blue-900/20 border-2 border-blue-600 rounded-xl p-4">
                <h3 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  اقتراحات للتحسين:
                </h3>
                <div className="space-y-2">
                  {reviewResult.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2" />
                      <p className="text-sm text-gray-300">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            رفع ملف
          </h3>
          <div className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 transition-colors">
            <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 mb-2">ارفع ملف كود (.js, .py, .java)</p>
            <p className="text-xs text-gray-600">أو اسحبه هنا</p>
          </div>
        </div>
      </div>
    </div>
  ));

const GoalsView = memo(({ monthlyGoals, isLoading, generateLongTermGoals, toggleGoalStep, deleteGoal }: GoalsViewProps) => {
    return (
        <div className="h-full overflow-y-auto pb-20 p-4">
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl">
                        <Flag className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">أهدافي</h2>
                        <p className="text-gray-400 text-sm">خطط وحقق أحلامك الكبيرة</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        اقتراح أهداف طويلة المدى
                    </h3>
                     <p className="text-sm text-gray-400">
                        دع مساعدك الذكي يحلل أنشطتك ويقترح عليك أهدافًا ملهمة وطويلة المدى لمساعدتك على النمو.
                    </p>
                    <button
                        onClick={generateLongTermGoals}
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Activity className="w-5 h-5 animate-spin" />
                                جاري تحليل أنشطتك...
                            </>
                        ) : (
                            "اقترح لي أهداف"
                        )}
                    </button>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        أهدافي الحالية
                    </h3>
                    {isLoading && monthlyGoals.length === 0 && (
                        <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-700">
                             <div className="flex justify-center items-center gap-2">
                                <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                                <span className="text-sm text-gray-400">جاري إنشاء الخطة...</span>
                            </div>
                        </div>
                    )}
                    {monthlyGoals.length === 0 && !isLoading && (
                        <div className="text-center py-8 bg-gray-800/50 rounded-xl border border-gray-700">
                            <Flag className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                            <p className="text-gray-400">لم تقم بإضافة أي أهداف بعد.</p>
                            <p className="text-sm text-gray-500">استخدم المساعد الذكي بالأعلى لتبدأ!</p>
                        </div>
                    )}
                    {monthlyGoals.map(goal => {
                        const completedSteps = goal.roadmap.filter(step => step.completed).length;
                        const totalSteps = goal.roadmap.length;
                        const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

                        return (
                            <div key={goal.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 group relative">
                                 <button
                                    onClick={() => deleteGoal(goal.id)}
                                    className="absolute top-3 left-3 p-1.5 bg-gray-700/50 text-gray-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-red-400 transition-all"
                                    aria-label="Delete goal"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-bold text-white">{goal.title}</span>
                                    <span className="text-xs text-gray-400">الديدلاين: {goal.deadline}</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-3">
                                    <div
                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                                <div className="space-y-2">
                                    {goal.roadmap.map((step, index) => (
                                        <div key={index} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-800 p-1 rounded-md" onClick={() => toggleGoalStep(goal.id, index)}>
                                            <div className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center ${step.completed ? 'bg-green-500' : 'border-2 border-gray-500'}`}>
                                                {step.completed && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={`${step.completed ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                                                {step.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    )
});

const ProgressView = memo(({ userProfile, stats, dailySchedule, achievements }: ProgressViewProps) => {
    const level = Math.floor(stats.points / 1000);
    const progressToNextLevel = (stats.points % 1000) / 10; // Percentage
    
    const habits = dailySchedule.filter(item => item.type === 'habit');

    return (
        <div className="h-full overflow-y-auto pb-20 p-4">
            <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-gradient-to-r from-green-500 to-cyan-500 p-3 rounded-xl">
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">مستوى تقدمك</h2>
                        <p className="text-gray-400 text-sm">إنجازاتك وعاداتك في مكان واحد</p>
                    </div>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-4">
                         <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                            {level}
                         </div>
                        <div className="flex-1">
                            <p className="text-lg font-bold text-white">{userProfile.name}</p>
                            <p className="text-sm text-purple-400">المستوى الحالي</p>
                        </div>
                    </div>
                    <div className="mt-4">
                         <div className="flex justify-between items-center mb-1 text-xs text-gray-400">
                            <span>التقدم للمستوى التالي ({level + 1})</span>
                            <span>{stats.points % 1000}/1000</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-gradient-to-r from-green-500 to-cyan-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${progressToNextLevel}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
                         <div className="p-3 bg-orange-500/20 rounded-lg">
                            <Flame className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.streak}</p>
                            <p className="text-sm text-gray-400">يوم استمرارية</p>
                        </div>
                    </div>
                     <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center gap-3">
                         <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Award className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{stats.points}</p>
                            <p className="text-sm text-gray-400">نقطة إنجاز</p>
                        </div>
                    </div>
                </div>
                
                <div className="space-y-4">
                     <h3 className="font-bold text-white flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-400" />
                        العادات المكتملة اليوم
                    </h3>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-3">
                        {habits.length > 0 ? habits.map(habit => (
                            <div key={habit.id} className="flex items-center gap-3">
                                <p className={`flex-1 font-medium ${habit.completed ? 'text-white' : 'text-gray-500'}`}>{habit.title}</p>
                                {habit.completed && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                            </div>
                        )) : <p className="text-sm text-gray-500 text-center">لم تكمل أي عادات اليوم.</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Award className="w-5 h-5 text-yellow-400" />
                        الإنجازات
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        {achievements.map(ach => {
                            const Icon = ach.icon;
                            return (
                                <div key={ach.id} className={`p-3 rounded-xl ${ach.unlocked ? 'bg-yellow-500/20 border-2 border-yellow-500' : 'bg-gray-800/50 border border-gray-700 opacity-60'}`}>
                                    <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-2 ${ach.unlocked ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                                        <Icon className={`w-6 h-6 ${ach.unlocked ? 'text-white' : 'text-gray-500'}`} />
                                    </div>
                                    <p className={`text-xs font-bold ${ach.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}>{ach.title}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    )
});

const OnboardingFlow = memo(({ userProfile, setUserProfile, setShowOnboarding, addNotification }: OnboardingFlowProps) => {
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [tempProfile, setTempProfile] = useState(userProfile);

    const steps = [
      {
        title: 'أهلاً بيك! 👋',
        content: (
          <div className="space-y-4">
            <p className="text-gray-400">أنا AI Coach - مساعدك الشخصي للإنتاجية والتعلم!</p>
            <input
              type="text"
              placeholder="إيه اسمك؟"
              className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none"
              value={tempProfile.name}
              onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
            />
          </div>
        )
      },
      {
        title: 'نظم يومك ⏰',
        content: (
          <div className="space-y-4">
            <p className="text-gray-400">متى بتصحى ومتى بتنام؟</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">الصحيان</label>
                <input
                  type="time"
                  className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
                  value={tempProfile.wakeTime}
                  onChange={(e) => setTempProfile({ ...tempProfile, wakeTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">النوم</label>
                <input
                  type="time"
                  className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
                  value={tempProfile.sleepTime}
                  onChange={(e) => setTempProfile({ ...tempProfile, sleepTime: e.target.value })}
                />
              </div>
            </div>
          </div>
        )
      },
      {
        title: 'جاهز! 🚀',
        content: (
          <div className="space-y-4 text-center">
            <div className="text-6xl mb-4">✨</div>
            <p className="text-lg text-white font-bold">
              ممتاز يا {tempProfile.name}!
            </p>
            <p className="text-gray-400">
              دلوقتي أنا جاهز لمساعدتك تنظم يومك وتحقق أهدافك!
            </p>
          </div>
        )
      }
    ];

    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-8 border border-gray-700">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">{steps[onboardingStep].title}</h2>
              <span className="text-sm text-gray-400">{onboardingStep + 1}/{steps.length}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((onboardingStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {steps[onboardingStep].content}

          <div className="flex gap-3 mt-6">
            {onboardingStep > 0 && (
              <button
                onClick={() => setOnboardingStep(onboardingStep - 1)}
                className="flex-1 py-3 border-2 border-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-700"
              >
                رجوع
              </button>
            )}
            <button
              onClick={() => {
                if (onboardingStep < steps.length - 1) {
                  setOnboardingStep(onboardingStep + 1);
                } else {
                  setUserProfile(tempProfile);
                  setShowOnboarding(false);
                  addNotification(`أهلاً ${tempProfile.name}! 🚀`, 'success');
                }
              }}
              className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg"
              disabled={onboardingStep === 0 && !tempProfile.name}
            >
              {onboardingStep === steps.length - 1 ? 'يلا نبدأ!' : 'التالي'}
            </button>
          </div>
        </div>
      </div>
    );
  });
  
const PomodoroTimer = memo(({
    activePomodoroTask,
    pomodoroPhase,
    pomodoroTimeLeft,
    isPomodoroRunning,
    pomodoroSessions,
    formatPomodoroTime,
    togglePomodoro,
    stopPomodoro,
}: PomodoroTimerProps) => {
    if (!activePomodoroTask) return null;

    const totalDuration = pomodoroPhase === 'work' 
        ? activePomodoroTask.duration * 60
        : (pomodoroSessions % 4 === 0 ? 15 * 60 : 5 * 60);

    const progress = totalDuration > 0 ? (1 - (pomodoroTimeLeft / totalDuration)) * 100 : 0;

    return (
        <div className="fixed top-20 sm:top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-gray-800/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg z-40 border border-gray-700">
            <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                    <svg className="transform -rotate-90 w-full h-full">
                        <circle cx="50%" cy="50%" r="28" stroke="rgba(255,255,255,0.1)" strokeWidth="5" fill="none" />
                        <circle
                            cx="50%" cy="50%" r="28"
                            stroke={pomodoroPhase === 'work' ? 'rgb(168,85,247)' : 'rgb(34,197,94)'}
                            strokeWidth="5" fill="none"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - progress / 100)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
                        {formatPomodoroTime(pomodoroTimeLeft)}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                         <span className={`text-xs px-2 py-1 rounded-full ${
                             pomodoroPhase === 'work' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                         }`}>
                             {pomodoroPhase === 'work' ? 'جلسة عمل' : 'استراحة'}
                         </span>
                        <div className="flex items-center gap-1">
                             {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i < pomodoroSessions ? 'bg-purple-400' : 'bg-gray-600'}`}></div>
                             ))}
                        </div>
                    </div>
                    <p className="font-bold text-white truncate mt-1">{activePomodoroTask.title}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={togglePomodoro} className="p-3 bg-gray-700/50 rounded-full text-white hover:bg-gray-700">
                        {isPomodoroRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <button onClick={stopPomodoro} className="p-3 bg-red-500/20 rounded-full text-red-400 hover:bg-red-500/40">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});

const ReminderModal = memo(({ task, onSet, onCancel }: { task: DailyScheduleItem | null; onSet: (minutes: number | undefined) => void; onCancel: () => void; }) => {
    if (!task) return null;
    const reminderOptions = [5, 10, 15, 30];

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">ضبط تذكير</h3>
                    <button onClick={onCancel} className="p-1 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-gray-400 mb-4 text-sm">اختر متى تريد أن يتم تذكيرك قبل مهمة: <span className="font-bold text-purple-400">"{task.title}"</span>.</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {reminderOptions.map(min => (
                        <button
                            key={min}
                            onClick={() => onSet(min)}
                            className={`p-3 rounded-lg font-semibold text-white transition-colors ${task.reminderMinutes === min ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                            قبل {min} دقائق
                        </button>
                    ))}
                </div>
                {task.reminderMinutes && (
                    <button
                        onClick={() => onSet(undefined)}
                        className="w-full p-3 rounded-lg font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                        إزالة التذكير
                    </button>
                )}
            </div>
        </div>
    );
});

const TaskModal = memo(({ task, onSave, onCancel }: { task: DailyScheduleItem | null; onSave: (task: DailyScheduleItem) => void; onCancel: () => void; }) => {
    if (!task) return null;
    
    const [taskData, setTaskData] = useState<DailyScheduleItem>(task);
    const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

    useEffect(() => {
        setTaskData(task);
    }, [task]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTaskData(prev => ({ ...prev, [name]: name === 'duration' ? Number(value) : value }));
    };
    
    const handleAddSubTask = () => {
        if (!newSubTaskTitle.trim()) return;
        const newSubTask: SubTask = {
            id: Date.now(),
            title: newSubTaskTitle.trim(),
            completed: false,
        };
        setTaskData(prev => ({ ...prev, subTasks: [...(prev.subTasks || []), newSubTask] }));
        setNewSubTaskTitle('');
    };
    
    const handleDeleteSubTask = (subTaskId: number) => {
        setTaskData(prev => ({ ...prev, subTasks: prev.subTasks?.filter(st => st.id !== subTaskId) }));
    };
    
    const handleSubmit = () => {
        onSave(taskData);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-700" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">{task.id !== 0 ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-sm text-gray-400">العنوان</label>
                        <input type="text" name="title" value={taskData.title} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:border-purple-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm text-gray-400">الوقت</label>
                            <input type="time" name="time" value={taskData.time} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:border-purple-500" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-400">المدة (دقائق)</label>
                            <input type="number" name="duration" value={taskData.duration} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:border-purple-500" />
                        </div>
                    </div>
                    <div>
                         <label className="text-sm text-gray-400">التصنيف</label>
                         <select name="category" value={taskData.category} onChange={handleChange} className="w-full mt-1 p-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:border-purple-500">
                            <option value="work">عمل</option>
                            <option value="learning">تعلم</option>
                            <option value="health">صحة</option>
                            <option value="worship">عبادة</option>
                            <option value="other">أخرى</option>
                         </select>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white mb-2">مهام فرعية</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                          {taskData.subTasks?.map(sub => (
                             <div key={sub.id} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded">
                                <span className="flex-1 text-gray-300 text-sm">{sub.title}</span>
                                <button onClick={() => handleDeleteSubTask(sub.id)} className="p-1 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                             </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                            <input
                                type="text"
                                value={newSubTaskTitle}
                                onChange={(e) => setNewSubTaskTitle(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubTask() }}
                                placeholder="إضافة مهمة فرعية..."
                                className="flex-1 p-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white focus:border-purple-500"
                            />
                            <button onClick={handleAddSubTask} className="px-4 bg-purple-600 text-white rounded-lg">إضافة</button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onCancel} className="flex-1 py-2 border-2 border-gray-700 text-gray-300 rounded-xl font-semibold hover:bg-gray-700">إلغاء</button>
                    <button onClick={handleSubmit} className="flex-1 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg">حفظ</button>
                </div>
            </div>
        </div>
    );
});


const AICoachPro = () => {
  const [currentView, setCurrentView] = useState('daily');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('hasOnboarded'));
  
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleItem[]>(() => {
    try {
        const saved = localStorage.getItem('dailySchedule');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });

  // Pomodoro State
  const [activePomodoroTask, setActivePomodoroTask] = useState<DailyScheduleItem | null>(null);
  const [pomodoroTimeLeft, setPomodoroTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'break'>('work'); // 'work' | 'break'
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);

  // Suggested Tasks State
  const [suggestedTasks, setSuggestedTasks] = useState<SuggestedTask[]>([]);
  
  const [monthlyGoals, setMonthlyGoals] = useState<MonthlyGoal[]>(() => {
    try {
        const saved = localStorage.getItem('monthlyGoals');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
  });

  const [pointsAndStreak, setPointsAndStreak] = useState(() => {
      try {
          const saved = localStorage.getItem('pointsAndStreak');
          return saved ? JSON.parse(saved) : { points: 0, streak: 0 };
      } catch {
          return { points: 0, streak: 0 };
      }
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: string; timestamp: Date; }[]>([]);
  const [codeToReview, setCodeToReview] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);
  const [attachedFile, setAttachedFile] = useState<{data: string; mimeType: string;} | null>(null);
  const [reminderTask, setReminderTask] = useState<DailyScheduleItem | null>(null);
  const [editingTask, setEditingTask] = useState<DailyScheduleItem | null>(null);
  
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : { name: '', goals: [], wakeTime: '07:00', sleepTime: '23:00' };
    } catch {
        return { name: '', goals: [], wakeTime: '07:00', sleepTime: '23:00' };
    }
  });
  
  const initialAchievements: Achievement[] = [
    { id: 'streak_7', title: 'المستمر', description: 'حافظ على عادة لمدة 7 أيام', icon: Flame, unlocked: false },
    { id: 'morning_3', title: 'المتألق', description: 'أكمل كل عادات الصباح 3 أيام', icon: Sun, unlocked: false },
    { id: 'tasks_10', title: 'المنجز', description: 'أكمل 10 مهام في يوم واحد', icon: CheckCircle2, unlocked: false },
    { id: 'pomodoro_5', title: 'المركز', description: 'أكمل 5 جلسات بومودورو', icon: Activity, unlocked: false },
    { id: 'perfect_day', title: 'يوم مثالي', description: 'أكمل كل مهامك وعاداتك', icon: Sparkles, unlocked: false },
    { id: 'level_5', title: 'الخبير', description: 'وصل للمستوى 5', icon: ShieldCheck, unlocked: false },
  ];

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
        const saved = localStorage.getItem('achievements');
        return saved ? JSON.parse(saved) : initialAchievements;
    } catch {
        return initialAchievements;
    }
  });
  
  // Persist state to localStorage
  useEffect(() => { if (!showOnboarding) localStorage.setItem('hasOnboarded', 'true'); }, [showOnboarding]);
  useEffect(() => { localStorage.setItem('userProfile', JSON.stringify(userProfile)); }, [userProfile]);
  useEffect(() => { localStorage.setItem('dailySchedule', JSON.stringify(dailySchedule)); }, [dailySchedule]);
  useEffect(() => { localStorage.setItem('monthlyGoals', JSON.stringify(monthlyGoals)); }, [monthlyGoals]);
  useEffect(() => { localStorage.setItem('pointsAndStreak', JSON.stringify(pointsAndStreak)); }, [pointsAndStreak]);
  useEffect(() => { localStorage.setItem('achievements', JSON.stringify(achievements)); }, [achievements]);


  const taskCategories: TaskCategory[] = [
      {
        id: 'worship', name: 'عبادة وروحانيات', icon: Sparkles,
        tasks: [
          { id: 'w1', title: 'صلاة الفجر', duration: 15, type: 'prayer', icon: '🕌', category: 'worship' },
          { id: 'w5', title: 'صلاة الظهر', duration: 15, type: 'prayer', icon: '🕌', category: 'worship' },
          { id: 'w6', title: 'صلاة العصر', duration: 15, type: 'prayer', icon: '🕌', category: 'worship' },
          { id: 'w7', title: 'صلاة المغرب', duration: 15, type: 'prayer', icon: '🕌', category: 'worship' },
          { id: 'w8', title: 'صلاة العشاء', duration: 15, type: 'prayer', icon: '🕌', category: 'worship' },
          { id: 'w2', title: 'قراءة قرآن', duration: 20, type: 'habit', icon: '📖', category: 'worship' },
          { id: 'w3', title: 'أذكار الصباح والمساء', duration: 10, type: 'habit', icon: '📿', category: 'worship' },
          { id: 'w4', title: 'صلاة الضحى', duration: 10, type: 'prayer', icon: '☀️', category: 'worship' },
        ]
      },
      {
        id: 'health', name: 'صحة ولياقة', icon: Heart,
        tasks: [
          { id: 'h1', title: 'شرب كوب ماء', duration: 5, type: 'habit', icon: '💧', category: 'health' },
          { id: 'h2', title: 'تمرين صباحي خفيف', duration: 15, type: 'habit', icon: '💪', category: 'health' },
          { id: 'h3', title: 'إفطار صحي', duration: 20, type: 'meal', icon: '🍎', category: 'health' },
          { id: 'h4', title: 'تأمل واسترخاء', duration: 10, type: 'habit', icon: '🧘', category: 'health' },
        ]
      },
      {
        id: 'work', name: 'العمل والإنتاجية', icon: Briefcase,
        tasks: [
            { id: 'p1', title: 'جلسة عمل مركز', duration: 90, type: 'task', icon: '🎯', category: 'work' },
            { id: 'p2', title: 'مراجعة البريد الإلكتروني', duration: 15, type: 'task', icon: '📧', category: 'work' },
            { id: 'p3', title: 'التخطيط لليوم التالي', duration: 10, type: 'habit', icon: '📋', category: 'work' },
        ]
      },
      {
        id: 'learning', name: 'التعلم والتطوير', icon: BookOpen,
        tasks: [
            { id: 'l1', title: 'قراءة 10 صفحات من كتاب', duration: 20, type: 'habit', icon: '📚', category: 'learning' },
            { id: 'l2', title: 'مشاهدة كورس تعليمي', duration: 45, type: 'task', icon: '💻', category: 'learning' },
            { id: 'l3', title: 'ممارسة مهارة جديدة', duration: 30, type: 'task', icon: '✍️', category: 'learning' },
        ]
      }
    ];

  const coreCircles = useMemo(() => {
    const categories: ('health' | 'learning' | 'work' | 'worship')[] = ['health', 'learning', 'work', 'worship'];
    const circleData = categories.map(cat => {
        const tasks = dailySchedule.filter(t => t.category === cat);
        const completed = tasks.filter(t => t.completed).length;
        const value = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
        
        let icon: ElementType = Zap;
        let name = '';
        let color = '';

        switch(cat) {
            case 'health': icon = Heart; name = 'صحة'; color='green'; break;
            case 'learning': icon = BookOpen; name = 'تعلم'; color='blue'; break;
            case 'work': icon = Briefcase; name = 'عمل'; color='purple'; break;
            case 'worship': icon = Sparkles; name = 'روحانيات'; color='yellow'; break;
        }
        return { id: categories.indexOf(cat) + 1, name, value, icon, color };
    });
    return circleData;
  }, [dailySchedule]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ai = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<Chat | null>(null);
  
  const sortSchedule = useCallback((schedule: DailyScheduleItem[]) => {
    return [...schedule].sort((a, b) => {
        const [hA, mA] = a.time.split(':').map(Number);
        const [hB, mB] = b.time.split(':').map(Number);
        return (hA * 60 + mA) - (hB * 60 + mB);
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    
    // Initialize the AI client and chat session only once
    if (!ai.current) {
        ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatRef.current = ai.current.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `أنت 'AI Coach'، مساعد إنتاجي شخصي ومتخصص في إدارة وتنظيم الوقت بكفاءة عالية. تحدث باللهجة المصرية العامية بأسلوب ودود ومختصر وعملي. مهمتك مساعدة المستخدم في تنظيم يومه وتحقيق أقصى استفادة من وقته.

دورك:
- فهم روتين المستخدم وأهدافه اليومية ونمط حياته.
- جدولة المهام بذكاء، مع تقدير الوقت اللازم لكل مهمة.
- تقسيم المهام الكبيرة إلى مهام فرعية أصغر قابلة للتنفيذ (subTasks).
- تقديم استراتيجيات مخصصة للمستخدم لتطوير إنتاجيته بناءً على تحليلك لجدوله واحتياجاته.
- تحفيز المستخدم بأسلوب مزيج من (محفز، صارم عند اللزوم، داعم).
- تحليل الأنماط واقتراح تحسينات لمنع التشتت وإدارة الوقت بفعالية.

قواعد:
- اعتمد فقط على المهام التي يؤكدها المستخدم أو الموجودة بالفعل في جدوله.
- لا تفترض أي مهام غير موجودة.
- اقترح مهام جديدة بناءً على طلب المستخدم فقط، وعند إضافتها، اقترح وقتاً مناسباً لا يتعارض مع المهام الحالية.
- استخدم العامية المصرية.
- كن مباشر وواضح وقدم خيارات محددة (أ، ب، ج) عند اللزوم.
- استخدم emojis بذكاء.
- اسأل أسئلة للفهم الأعمق.
- حافظ على ردودك قصيرة ومباشرة.`,
            },
        });
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (currentView === 'chat' && messages.length > 0) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, currentView]);
  
  const addNotification = useCallback((message: string, type = 'info') => {
    const notif = { id: Date.now(), message, type, timestamp: new Date() };
    setNotifications(prev => [notif, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    }, 4000);
  }, []);

  // Achievement checking logic
  useEffect(() => {
    setAchievements(prevAchievements => {
      let changed = false;
      const newAchievements = prevAchievements.map(ach => {
        if (ach.unlocked) return ach; // Already unlocked
        
        let shouldUnlock = false;
        switch(ach.id) {
          case 'level_5':
            if (Math.floor(pointsAndStreak.points / 1000) >= 5) shouldUnlock = true;
            break;
          case 'perfect_day':
            const allTasksDone = dailySchedule.length > 0 && dailySchedule.every(t => t.completed);
            if(allTasksDone) shouldUnlock = true;
            break;
          // Add more checks for other achievements here...
        }

        if (shouldUnlock) {
          changed = true;
          addNotification(`🏆 إنجاز جديد: ${ach.title}!`, 'success');
          return { ...ach, unlocked: true };
        }
        return ach;
      });

      return changed ? newAchievements : prevAchievements;
    });
  }, [dailySchedule, pointsAndStreak, addNotification]);
  
  // Reminder checking logic
  useEffect(() => {
    const checkReminders = () => {
        const now = new Date();
        now.setSeconds(0, 0); // For minute-level comparison

        setDailySchedule(prevSchedule => {
            let scheduleChanged = false;
            const updatedSchedule = prevSchedule.map(task => {
                if (task.reminderMinutes && !task.completed && !task.reminderSent) {
                    const [hour, minute] = task.time.split(':').map(Number);
                    const taskTime = new Date();
                    taskTime.setHours(hour, minute, 0, 0);

                    const reminderTime = new Date(taskTime.getTime() - task.reminderMinutes * 60000);

                    if (now.getTime() === reminderTime.getTime()) {
                        addNotification(`🔔 تذكير: "${task.title}" سيبدأ خلال ${task.reminderMinutes} دقائق!`, 'info');
                        scheduleChanged = true;
                        return { ...task, reminderSent: true };
                    }
                }
                return task;
            });
            return scheduleChanged ? updatedSchedule : prevSchedule;
        });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [addNotification]);

  const handlePomodoroPhaseComplete = useCallback(() => {
    setIsPomodoroRunning(false);
    
    if (pomodoroPhase === 'work') {
      const newSessions = pomodoroSessions + 1;
      setPomodoroSessions(newSessions);
      
      const breakDuration = newSessions % 4 === 0 ? 15 * 60 : 5 * 60;
      setPomodoroTimeLeft(breakDuration);
      setPomodoroPhase('break');
      
      addNotification(`🎉 جلسة عمل مكتملة! وقت الاستراحة (${breakDuration / 60} دقائق)`, 'success');
    } else {
      setPomodoroTimeLeft((activePomodoroTask?.duration || 25) * 60);
      setPomodoroPhase('work');
      addNotification('✨ استراحة منتهية! جاهز للجلسة القادمة؟', 'info');
    }
  }, [pomodoroPhase, pomodoroSessions, addNotification, activePomodoroTask]);

  // Pomodoro Timer Effect
  useEffect(() => {
    let interval: number | null = null;
    
    if (isPomodoroRunning && pomodoroTimeLeft > 0) {
      interval = window.setInterval(() => {
        setPomodoroTimeLeft(time => time - 1);
      }, 1000);
    } else if (isPomodoroRunning && pomodoroTimeLeft === 0) {
      handlePomodoroPhaseComplete();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroRunning, pomodoroTimeLeft, handlePomodoroPhaseComplete]);

  const startPomodoro = useCallback((task: DailyScheduleItem) => {
    setActivePomodoroTask(task);
    setPomodoroTimeLeft(task.duration * 60);
    setPomodoroPhase('work');
    setIsPomodoroRunning(true);
    setPomodoroSessions(0);
    addNotification(`⏱️ بدأت جلسة Pomodoro: ${task.title}`, 'info');
  }, [addNotification]);

  const togglePomodoro = useCallback(() => {
    setIsPomodoroRunning(prev => !prev);
  }, []);

  const stopPomodoro = useCallback(() => {
    setIsPomodoroRunning(false);
    setActivePomodoroTask(null);
    setPomodoroTimeLeft(25 * 60);
    setPomodoroPhase('work');
    setPomodoroSessions(0);
    addNotification('تم إيقاف جلسة Pomodoro', 'warning');
  }, [addNotification]);

  const formatPomodoroTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const toggleScheduleItem = useCallback((id: number) => {
    setDailySchedule(prev => prev.map(item => {
      if (item.id === id) {
        const newCompleted = !item.completed;
        if (newCompleted) {
          addNotification(`✅ رائع! أكملت: ${item.title}`, 'success');
          setPointsAndStreak(s => ({ ...s, points: s.points + 10 }));
        } else {
           setPointsAndStreak(s => ({ ...s, points: Math.max(0, s.points - 10) }));
        }
        return { ...item, completed: newCompleted };
      }
      return item;
    }));
  }, [addNotification]);
  
  const deleteScheduleItem = useCallback((id: number) => {
    setDailySchedule(prev => prev.filter(item => item.id !== id));
    addNotification('🗑️ تم حذف المهمة', 'info');
  }, [addNotification]);

  const toggleSubTask = useCallback((taskId: number, subTaskId: number) => {
    setDailySchedule(prev => prev.map(task => {
        if (task.id === taskId && task.subTasks) {
            const newSubTasks = task.subTasks.map(subTask => {
                if (subTask.id === subTaskId) {
                    const newCompleted = !subTask.completed;
                    if(newCompleted) {
                        setPointsAndStreak(s => ({ ...s, points: s.points + 2 }));
                    } else {
                        setPointsAndStreak(s => ({ ...s, points: Math.max(0, s.points - 2) }));
                    }
                    return { ...subTask, completed: newCompleted };
                }
                return subTask;
            });
            return { ...task, subTasks: newSubTasks };
        }
        return task;
    }));
  }, []);

  const confirmTask = useCallback((taskId: string) => {
    const task = suggestedTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newTask: DailyScheduleItem = {
      id: Date.now() + Math.random(),
      title: task.title,
      time: task.time,
      duration: task.duration,
      category: task.category,
      type: 'task',
      completed: false,
      isFixed: false,
      subTasks: task.subTasks?.map(st => ({...st, id: Date.now() + Math.random()})) || []
    };
    
    setDailySchedule(prev => sortSchedule([...prev, newTask]));
    
    setSuggestedTasks(prev => prev.filter(t => t.id !== taskId));
    addNotification(`✅ تمت إضافة: ${task.title}`, 'success');
  }, [suggestedTasks, addNotification, sortSchedule]);

  const confirmAllTasks = useCallback(() => {
    const newTasks: DailyScheduleItem[] = suggestedTasks.map(task => ({
        id: Date.now() + Math.random(),
        title: task.title,
        time: task.time,
        duration: task.duration,
        category: task.category,
        type: 'task',
        completed: false,
        isFixed: false,
        subTasks: task.subTasks?.map(st => ({...st, id: Date.now() + Math.random()})) || []
    }));

    setDailySchedule(prev => sortSchedule([...prev, ...newTasks]));

    setSuggestedTasks([]);
    addNotification(`✅ تمت إضافة ${newTasks.length} مهام جديدة.`, 'success');

  }, [suggestedTasks, addNotification, sortSchedule]);

  const rejectTask = useCallback((taskId: string) => {
    setSuggestedTasks(prev => prev.filter(t => t.id !== taskId));
    addNotification('تم إلغاء المهمة', 'info');
  }, [addNotification]);

  const rejectAllTasks = useCallback(() => {
    setSuggestedTasks([]);
    addNotification('تم مسح جميع الاقتراحات', 'info');
  }, [addNotification]);

  const handleSendMessage = useCallback(async (messageToSend?: string) => {
    const textToSend = messageToSend || inputMessage;
    if (!textToSend.trim() && !attachedFile) return;

    const currentInput = textToSend;
    const currentFile = attachedFile;

    setInputMessage('');
    setAttachedFile(null);
    setIsLoading(true);
    setSuggestedTasks([]);

    try {
        if (!ai.current || !chatRef.current) throw new Error("AI not initialized");

        const context = {
            userProfile,
            dailySchedule,
            monthlyGoals,
            stats: pointsAndStreak,
            currentTime: new Date().toLocaleString('ar-EG'),
        };

        let response;
        if (currentFile) {
            const userMsg: Message = { role: 'user', text: currentInput, timestamp: new Date(), attachment: currentFile.data };
            setMessages(prev => [...prev, userMsg]);
            
            const messageWithContext = `معلومات المستخدم الحالية:\n${JSON.stringify(context, null, 2)}\n\nرسالة المستخدم:\n${currentInput}`;

            const imagePart = {
                inlineData: {
                    mimeType: currentFile.mimeType,
                    data: currentFile.data.split(',')[1] // Remove base64 prefix
                }
            };
            const textPart = { text: messageWithContext };
            
            const contents = { parts: [textPart, imagePart] };
            const result = await ai.current.models.generateContent({ model: 'gemini-2.5-flash', contents });
            response = result;

        } else if (currentInput.includes('خطة') || currentInput.includes('جدول') || currentInput.includes('مهام')) {
           const userMsg: Message = { role: 'user', text: currentInput, timestamp: new Date() };
           setMessages(prev => [...prev, userMsg]);

           const fullHistory = [...messages, userMsg];
           const chatHistory = fullHistory.map(msg => `${msg.role === 'user' ? 'المستخدم' : 'AI Coach'}: ${msg.text}`).join('\n\n');

           const model = 'gemini-2.5-flash';
           const promptResponse = await ai.current.models.generateContent({
             model: model,
             contents: `أنت AI Coach. مهمتك هي استخلاص المهام من محادثة. بناءً على سياق المحادثة الكامل التالي:
---
${chatHistory}
---
وبناءً على طلب المستخدم الأخير: "${currentInput}",
وسياق المستخدم العام: ${JSON.stringify(context)},

الرجاء استخلاص واقتراح مهام محددة وقابلة للتنفيذ تم ذكرها أو التلميح إليها في المحادثة.
يجب أن تكون المهام مرتبطة بشكل مباشر بالنقاش. 
كل مهمة يجب أن تحتوي على:
1. 'title': عنوان واضح للمهمة.
2. 'time': وقت مقترح (بصيغة HH:MM) بناءً على جدول المستخدم الحالي.
3. 'duration': مدة بالدقائق.
4. 'category': تصنيف مناسب (work, learning, health, worship).
5. 'subTasks' (اختياري): لو المهمة معقدة، قسمها لمهام فرعية هنا. لازم تكون array of objects، كل object فيه 'title' و 'completed' (قيمتها false).

الرد يجب أن يكون بتنسيق JSON فقط. لا تقم بتضمين أي نص آخر أو علامات markdown.`,
             config: {
               responseMimeType: "application/json",
               responseSchema: {
                 type: Type.OBJECT,
                 properties: {
                   tasks: {
                     type: Type.ARRAY,
                     items: {
                       type: Type.OBJECT,
                       properties: {
                         title: { type: Type.STRING },
                         time: { type: Type.STRING },
                         duration: { type: Type.NUMBER },
                         category: { type: Type.STRING },
                         subTasks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    completed: { type: Type.BOOLEAN }
                                },
                                required: ["title", "completed"]
                            }
                         }
                       },
                       required: ["title", "time", "duration", "category"]
                     }
                   }
                 }
               }
             }
           });
          const jsonResponse = JSON.parse(promptResponse.text);
          const suggestedTasksList = jsonResponse.tasks.map((task: any, index: number) => ({
             ...task,
             id: `sug_${index + 1}`
           }));
           setSuggestedTasks(suggestedTasksList);
           const aiMsg: Message = { role: 'ai', text: `📋 تمام! بناءً على نقاشنا، دي المهام اللي أقترحها ليك:\n\nاختار المهام اللي عايز تنفذها من القائمة تحت، وأنا هضيفها تلقائياً في جدولك اليومي! ✅`, timestamp: new Date() };
           setMessages(prev => [...prev, aiMsg]);
           setIsLoading(false);
           return; // Exit early as we've sent our messages
        } else {
          const userMsg: Message = { role: 'user', text: currentInput, timestamp: new Date() };
          setMessages(prev => [...prev, userMsg]);
          
          const messageWithContext = `معلومات المستخدم الحالية:\n${JSON.stringify(context, null, 2)}\n\nرسالة المستخدم:\n${currentInput}`;

          const result = await chatRef.current.sendMessage({ message: messageWithContext });
          response = result;
        }
        
        if(response){
            const aiMsg: Message = { role: 'ai', text: response.text, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        const errorMsg: Message = { role: 'ai', text: 'عفواً، حدث خطأ أثناء التواصل مع الذكاء الاصطناعي. حاول مرة أخرى.', timestamp: new Date() };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  }, [inputMessage, attachedFile, userProfile, dailySchedule, monthlyGoals, pointsAndStreak, messages, sortSchedule]);
  
  const queryTaskDetails = useCallback(async (task: DailyScheduleItem) => {
    setCurrentView('chat');
    const prompt = `اديني تفاصيل اكتر عن المهمة دي: "${task.title}"${task.description ? ` - الوصف: "${task.description}"` : ''}`;
    // Use a timeout to ensure the view has switched before sending the message
    setTimeout(() => {
        handleSendMessage(prompt);
    }, 100);
  }, [handleSendMessage]);

  const reviewCode = useCallback(async () => {
    if (!codeToReview.trim()) {
      setReviewResult({ type: 'error', message: 'اكتب الكود الأول!' });
      return;
    }

    setIsLoading(true);
    setReviewResult(null);

    try {
        if (!ai.current) throw new Error("AI not initialized");
        const model = 'gemini-2.5-pro';
        const prompt = `أنت مراجع أكواد خبير. قم بمراجعة الكود التالي:\n\n\`\`\`javascript\n${codeToReview}\n\`\`\`\n\nأريد منك أن تعيد الرد بصيغة JSON فقط بدون أي نص آخر أو علامات markdown. يجب أن يحتوي الـ JSON على الحقول التالية: 'type' (دائماً 'success' إذا نجحت المراجعة), 'errors' (مصفوفة من الأخطاء، كل خطأ يحتوي على 'line', 'message', 'severity' ('error' أو 'warning')), 'suggestions' (مصفوفة من الاقتراحات النصية لتحسين الكود), 'score' (رقم من 0 إلى 100 يمثل جودة الكود), و 'message' (رسالة نصية قصيرة تلخص المراجعة).`;
        
        const response = await ai.current.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                errors: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      line: { type: Type.NUMBER },
                      message: { type: Type.STRING },
                      severity: { type: Type.STRING }
                    },
                    required: ["line", "message", "severity"]
                  }
                },
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                score: { type: Type.NUMBER },
                message: { type: Type.STRING }
              },
              required: ["type", "errors", "suggestions", "score", "message"]
            }
          }
        });

        const review = JSON.parse(response.text);
        setReviewResult(review);
    } catch (error) {
        console.error("Gemini code review error:", error);
        setReviewResult({ type: 'error', message: 'فشلت مراجعة الكود. حاول مرة أخرى.' });
    } finally {
        setIsLoading(false);
    }
  }, [codeToReview]);

  const generateLongTermGoals = useCallback(async () => {
    setIsLoading(true);
    try {
        if (!ai.current) throw new Error("AI not initialized");
        const model = 'gemini-2.5-flash';
        const context = `
            Daily Schedule: ${dailySchedule.map(t => t.title).join(', ')}.
        `;
        const prompt = `بناءً على الأنشطة اليومية للمستخدم: "${context}". اقترح 3 أهداف طويلة المدى ذات صلة يمكن للمستخدم العمل عليها.
        لكل هدف، قم بتقسيمه إلى خريطة طريق واضحة وقابلة للتنفيذ من 3-5 خطوات.
        أريدك أن تعيد الرد بصيغة JSON فقط بدون أي نص آخر أو علامات markdown.
        يجب أن يكون الرد مصفوفة من الأهداف. كل هدف يجب أن يكون كائنًا يحتوي على الحقول التالية:
        - 'title': عنوان الهدف.
        - 'deadline': موعد نهائي مقترح ومنطقي.
        - 'roadmap': مصفوفة من الخطوات. كل خطوة يجب أن تكون كائنًا يحتوي على 'title' (وصف قصير ومحدد للخطوة) و 'completed' (دائمًا false).`;

        const response = await ai.current.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            deadline: { type: Type.STRING },
                            roadmap: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        title: { type: Type.STRING },
                                        completed: { type: Type.BOOLEAN }
                                    },
                                    required: ["title", "completed"]
                                }
                            }
                        },
                        required: ["title", "deadline", "roadmap"]
                    }
                }
            }
        });

        const newGoalsData = JSON.parse(response.text);
        const newGoals: MonthlyGoal[] = newGoalsData.map((goal: any) => ({
            id: Date.now() + Math.random(),
            ...goal
        }));

        setMonthlyGoals(prev => [...prev, ...newGoals]);
        addNotification(`🎉 تم إنشاء ${newGoals.length} أهداف جديدة!`, 'success');

    } catch (error) {
        console.error("Gemini goal generation error:", error);
        addNotification('حدث خطأ أثناء اقتراح الأهداف. حاول مرة أخرى.', 'error');
    } finally {
        setIsLoading(false);
    }
  }, [addNotification, dailySchedule]);
  
  const toggleGoalStep = useCallback((goalId: number, stepIndex: number) => {
    setMonthlyGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
            const newRoadmap = [...goal.roadmap];
            const step = newRoadmap[stepIndex];
            step.completed = !step.completed;
            if (step.completed) {
                addNotification(`👍 خطوة جديدة مكتملة!`, 'success');
                setPointsAndStreak(s => ({ ...s, points: s.points + 20 }));
            } else {
                 setPointsAndStreak(s => ({ ...s, points: Math.max(0, s.points - 20) }));
            }
            return { ...goal, roadmap: newRoadmap };
        }
        return goal;
    }));
  }, [addNotification]);
  
  const deleteGoal = useCallback((goalId: number) => {
    setMonthlyGoals(prev => prev.filter(goal => goal.id !== goalId));
    addNotification('🗑️ تم حذف الهدف', 'info');
  }, [addNotification]);
  
  const handleAddTaskFromTemplate = useCallback((task: TaskTemplate) => {
    let newTime = userProfile.wakeTime;
    if(dailySchedule.length > 0) {
        const lastTask = [...dailySchedule].pop();
        
        if (lastTask) {
            const [h, m] = lastTask.time.split(':').map(Number);
            const lastEndTime = new Date();
            lastEndTime.setHours(h, m + lastTask.duration, 0, 0);
            newTime = `${String(lastEndTime.getHours()).padStart(2, '0')}:${String(lastEndTime.getMinutes()).padStart(2, '0')}`;
        }
    }
    
    const newTask: DailyScheduleItem = {
        id: Date.now(),
        title: task.title,
        time: newTime,
        duration: task.duration,
        category: task.category,
        type: task.type as any,
        completed: false,
        isFixed: false,
    };

    setDailySchedule(prev => sortSchedule([...prev, newTask]));
    addNotification(`✅ تمت إضافة: ${task.title}`, 'success');
  }, [addNotification, userProfile.wakeTime, dailySchedule, sortSchedule]);

  const handleSetReminder = useCallback((minutes: number | undefined) => {
    if (!reminderTask) return;
    setDailySchedule(prev => prev.map(item =>
        item.id === reminderTask.id
            ? { ...item, reminderMinutes: minutes, reminderSent: false }
            : item
    ));
    addNotification(minutes ? `تم ضبط التذكير لـ "${reminderTask.title}"` : `تم إزالة التذكير من "${reminderTask.title}"`, 'success');
    setReminderTask(null);
  }, [reminderTask, addNotification]);

  const handleOpenEditModal = (task: DailyScheduleItem) => {
      setEditingTask(task);
  };

  const handleOpenAddModal = () => {
      setEditingTask({
          id: 0, // 0 indicates a new task
          title: '',
          time: '12:00',
          duration: 30,
          type: 'task',
          category: 'work',
          completed: false,
          isFixed: false,
          subTasks: [],
          description: '',
      });
  };

  const handleSaveTask = (taskToSave: DailyScheduleItem) => {
      setDailySchedule(prev => {
          let updatedSchedule;
          if (taskToSave.id !== 0) { // Existing task
              updatedSchedule = prev.map(t => t.id === taskToSave.id ? taskToSave : t);
              addNotification(`✅ تم تعديل: ${taskToSave.title}`, 'success');
          } else { // New task
              const newTask = { ...taskToSave, id: Date.now() };
              updatedSchedule = [...prev, newTask];
              addNotification(`✅ تمت إضافة: ${newTask.title}`, 'success');
          }
          return sortSchedule(updatedSchedule);
      });
      setEditingTask(null);
  };

  if (showOnboarding) {
    return <OnboardingFlow 
      userProfile={userProfile} 
      setUserProfile={setUserProfile} 
      setShowOnboarding={setShowOnboarding}
      addNotification={addNotification}
    />;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900" dir="rtl">
      <div className="fixed top-4 left-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg animate-slide-in ${
              notif.type === 'success' ? 'bg-green-600' :
              notif.type === 'warning' ? 'bg-orange-600' :
              notif.type === 'info' ? 'bg-yellow-600' :
              'bg-blue-600'
            } text-white`}
          >
            {notif.message}
          </div>
        ))}
      </div>
      
      <ReminderModal
        task={reminderTask}
        onSet={handleSetReminder}
        onCancel={() => setReminderTask(null)}
      />

      <TaskModal 
          task={editingTask}
          onSave={handleSaveTask}
          onCancel={() => setEditingTask(null)}
      />

      <PomodoroTimer 
        activePomodoroTask={activePomodoroTask}
        pomodoroPhase={pomodoroPhase}
        pomodoroTimeLeft={pomodoroTimeLeft}
        isPomodoroRunning={isPomodoroRunning}
        pomodoroSessions={pomodoroSessions}
        formatPomodoroTime={formatPomodoroTime}
        togglePomodoro={togglePomodoro}
        stopPomodoro={stopPomodoro}
      />

      <div className="flex-1 overflow-hidden pt-2">
        {currentView === 'daily' && <DailyView 
          currentTime={currentTime}
          stats={pointsAndStreak}
          coreCircles={coreCircles}
          dailySchedule={dailySchedule}
          toggleScheduleItem={toggleScheduleItem}
          deleteScheduleItem={deleteScheduleItem}
          toggleSubTask={toggleSubTask}
          activePomodoroTask={activePomodoroTask}
          startPomodoro={startPomodoro}
          showCompletedTasks={showCompletedTasks}
          setShowCompletedTasks={setShowCompletedTasks}
          queryTaskDetails={queryTaskDetails}
          taskCategories={taskCategories}
          handleAddTaskFromTemplate={handleAddTaskFromTemplate}
          setReminderTask={setReminderTask}
          onAddTask={handleOpenAddModal}
          onEditTask={handleOpenEditModal}
        />}
        {currentView === 'chat' && <ChatView
          messages={messages}
          suggestedTasks={suggestedTasks}
          confirmTask={confirmTask}
          confirmAllTasks={confirmAllTasks}
          rejectTask={rejectTask}
          rejectAllTasks={rejectAllTasks}
          isLoading={isLoading}
          chatEndRef={chatEndRef}
          inputRef={inputRef}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSendMessage={handleSendMessage}
          attachedFile={attachedFile}
          setAttachedFile={setAttachedFile}
        />}
        {currentView === 'goals' && <GoalsView
          monthlyGoals={monthlyGoals}
          isLoading={isLoading}
          generateLongTermGoals={generateLongTermGoals}
          toggleGoalStep={toggleGoalStep}
          deleteGoal={deleteGoal}
        />}
        {currentView === 'review' && <ReviewView
          codeToReview={codeToReview}
          setCodeToReview={setCodeToReview}
          reviewCode={reviewCode}
          isLoading={isLoading}
          reviewResult={reviewResult}
        />}
        {currentView === 'progress' && <ProgressView
            userProfile={userProfile}
            stats={pointsAndStreak}
            dailySchedule={dailySchedule}
            achievements={achievements}
        />}
      </div>

      <div className="bg-gray-800 border-t border-gray-700">
        <div className="flex justify-around p-2">
          {[
            { id: 'chat', icon: MessageCircle, label: 'المحادثة' },
            { id: 'daily', icon: Calendar, label: 'المهام' },
            { id: 'goals', icon: Flag, label: 'الأهداف' },
            { id: 'progress', icon: TrendingUp, label: 'التقدم' },
            { id: 'review', icon: Code, label: 'المراجع' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setCurrentView(id)}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                currentView === id
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        /* For Webkit-based browsers (Chrome, Safari) */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #1f2937; /* bg-gray-800 */
        }

        ::-webkit-scrollbar-thumb {
          background: #4b5563; /* bg-gray-600 */
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280; /* bg-gray-500 */
        }
      `}</style>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <AICoachPro />
    </React.StrictMode>
  );
}