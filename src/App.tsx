import { useState, useMemo, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  LogIn, 
  LogOut, 
  Clock, 
  Coffee, 
  AlertTriangle, 
  History as HistoryIcon, 
  User as UserIcon,
  QrCode,
  MapPin,
  Smartphone,
  Settings as SettingsIcon,
  Users,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  Calendar as CalendarIcon,
  Search,
  Home,
  X,
  Trash2,
  Filter,
  CheckCircle2,
  Plus,
  ListTodo,
  MoreVertical
} from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { QRScanner } from './components/QRScanner';
import { AttendanceType, UserProfile, AttendanceLog } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { Download } from 'lucide-react';

function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  };

  return { isInstallable, install };
}

// --- Styles for Calendar Overrides ---
const calendarStyles = `
  .react-calendar {
    width: 100%;
    border: none;
    background: white;
    font-family: inherit;
    border-radius: 24px;
    padding: 16px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }
  .react-calendar__tile--active {
    background: black !important;
    border-radius: 12px;
  }
  .react-calendar__tile--now {
    background: #f3f4f6;
    border-radius: 12px;
    color: black;
  }
  .react-calendar__navigation button {
    font-weight: bold;
    color: black;
  }
  .has-logs {
    position: relative;
  }
  .has-logs::after {
    content: '';
    position: absolute;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 4px;
    background: #10b981;
    border-radius: 50%;
  }
  .has-anomaly::after {
    background: #f59e0b;
  }
`;

function AdminDashboard() {
  const { allUsers, attendanceLogs, settings, tasks, updateCompanySettings, updateUserSettings, createTask, updateTask } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'tasks' | 'settings'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userSchedule, setUserSchedule] = useState({ workStart: '09:00', workEnd: '18:00', tolerance: 15 });
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '', priority: 'medium' as const, dueDate: format(new Date(), 'yyyy-MM-dd') });

  const stats = useMemo(() => {
    const today = new Date();
    const todayLogs = attendanceLogs.filter(log => 
      isWithinInterval(new Date(log.timestamp), { start: startOfDay(today), end: endOfDay(today) })
    );
    const anomalies = todayLogs.filter(l => l.isAnomaly).length;
    return {
      totalToday: todayLogs.length,
      anomalies,
      activeUsers: allUsers.filter(u => u.status === 'active').length
    };
  }, [attendanceLogs, allUsers]);

  const filteredUsers = allUsers.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingAdmins = allUsers.filter(u => u.role === 'pending-admin');

  return (
    <div className="space-y-8 pb-24 text-white">
      {/* Premium Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hoy', value: stats.totalToday, icon: HistoryIcon, gradient: 'from-blue-500 to-indigo-600' },
          { label: 'Alertas', value: stats.anomalies, icon: AlertTriangle, gradient: 'from-orange-500 to-red-600' },
          { label: 'Staff', value: stats.activeUsers, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
        ].map((s, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative overflow-hidden bg-zinc-900/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white/5 shadow-2xl"
          >
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-3 shadow-lg shadow-black/20`}>
              <s.icon size={16} className="text-white" />
            </div>
            <p className="text-2xl font-black tracking-tighter">{s.value}</p>
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Glassmorphism Tab Bar */}
      <div className="sticky top-0 z-30 py-2 bg-black/20 backdrop-blur-md -mx-6 px-6">
        <div className="flex gap-2 bg-zinc-900/80 p-1.5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar shadow-xl">
          {(['users', 'logs', 'tasks', 'settings'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap relative ${
                activeTab === tab 
                  ? 'bg-white text-black shadow-lg scale-[1.02]' 
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'users' ? 'Staff' : tab === 'logs' ? 'Logs' : tab === 'tasks' ? 'Tareas' : 'Config'}
              {tab === 'users' && pendingAdmins.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-zinc-900 animate-bounce">
                  {pendingAdmins.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
            {pendingAdmins.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Solicitudes Pendientes</h3>
                </div>
                {pendingAdmins.map(u => (
                  <div key={u.uid} className="bg-gradient-to-br from-red-500/10 to-transparent p-5 rounded-[2.5rem] border border-red-500/20 flex items-center justify-between backdrop-blur-sm">
                    <div>
                      <p className="font-black text-sm">{u.displayName}</p>
                      <p className="text-[10px] text-zinc-500 font-bold">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updateUserSettings(u.uid, { role: 'employee' })}
                        className="w-10 h-10 bg-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center hover:bg-zinc-700 transition-colors"
                      >
                        <X size={18} />
                      </button>
                      <button 
                        onClick={() => updateUserSettings(u.uid, { role: 'admin' })}
                        className="w-10 h-10 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-white transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar en el equipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/5 rounded-[2rem] py-4 pl-14 pr-6 text-sm outline-none focus:border-white/20 focus:bg-zinc-900 transition-all placeholder:text-zinc-700"
              />
            </div>

            <div className="space-y-3">
              {filteredUsers.filter(u => u.role !== 'pending-admin').map(u => (
                <div key={u.uid} className="bg-zinc-900/40 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between hover:bg-zinc-900/60 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-500 font-black group-hover:bg-zinc-700 group-hover:text-white transition-all">
                      {u.displayName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-sm">{u.displayName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-zinc-500 font-bold">{u.email}</p>
                        <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full ${
                          u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-500'
                        }`}>
                          {u.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setUserSchedule({ 
                          workStart: u.workStart || settings?.workStart || '09:00', 
                          workEnd: u.workEnd || settings?.workEnd || '18:00', 
                          tolerance: u.tolerance !== undefined ? u.tolerance : (settings?.tolerance || 15)
                        });
                        setShowScheduleModal(true);
                      }}
                      className="p-2 bg-zinc-800 text-zinc-400 rounded-xl hover:text-white transition-colors"
                      title="Editar Horario"
                    >
                      <Clock size={14} />
                    </button>
                    <select 
                      value={u.status || 'active'}
                      onChange={(e) => updateUserSettings(u.uid, { status: e.target.value as any })}
                      className="text-[10px] font-black uppercase bg-zinc-800 border-none rounded-xl px-3 py-2 outline-none appearance-none cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Baja</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {showScheduleModal && editingUser && (
              <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 border border-white/10 shadow-2xl space-y-6">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black tracking-tighter">Horario Personalizado</h3>
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{editingUser.displayName}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Entrada</label>
                        <input 
                          type="time" 
                          value={userSchedule.workStart}
                          onChange={e => setUserSchedule({...userSchedule, workStart: e.target.value})}
                          className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Salida</label>
                        <input 
                          type="time" 
                          value={userSchedule.workEnd}
                          onChange={e => setUserSchedule({...userSchedule, workEnd: e.target.value})}
                          className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white/20 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tolerancia (minutos)</label>
                      <input 
                        type="number" 
                        value={userSchedule.tolerance}
                        onChange={e => setUserSchedule({...userSchedule, tolerance: parseInt(e.target.value) || 0})}
                        className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowScheduleModal(false)} className="flex-1 py-4 text-zinc-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button 
                      onClick={async () => {
                        await updateUserSettings(editingUser.uid, userSchedule);
                        setShowScheduleModal(false);
                        toast.success('Horario actualizado');
                      }}
                      className="flex-1 bg-white text-black py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-white/5 active:scale-95 transition-all"
                    >
                      Guardar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {(Object.entries(
              attendanceLogs.reduce((acc, log) => {
                const date = format(new Date(log.timestamp), 'yyyy-MM-dd');
                const key = `${log.uid}_${date}`;
                if (!acc[key]) acc[key] = { userName: log.userName, date, logs: [] };
                acc[key].logs.push(log);
                return acc;
              }, {} as Record<string, { userName: string, date: string, logs: AttendanceLog[] }>)
            ) as [string, { userName: string, date: string, logs: AttendanceLog[] }][])
              .sort((a, b) => b[1].date.localeCompare(a[1].date))
              .map(([key, group]) => {
              const sortedLogs = [...group.logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              const clockIn = sortedLogs.find(l => l.type === 'clock-in');
              const clockOut = [...sortedLogs].reverse().find(l => l.type === 'clock-out');
              const lunchOut = sortedLogs.find(l => l.type === 'lunch-out');
              const lunchIn = sortedLogs.find(l => l.type === 'lunch-in');

              let workMs = 0;
              let lunchMs = 0;
              if (clockIn && clockOut) workMs = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
              if (lunchOut && lunchIn) lunchMs = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
              const effectiveMs = workMs > 0 ? Math.max(0, workMs - lunchMs) : 0;

              const formatMs = (ms: number) => {
                const h = Math.floor(ms / 3600000);
                const m = Math.floor((ms % 3600000) / 60000);
                return `${h}h ${m}m`;
              };

              return (
                <div key={key} className="bg-zinc-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-[10px] font-black">
                        {group.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{group.userName}</p>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">{format(parseISO(group.date), 'd MMM yyyy', { locale: es })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400">{formatMs(effectiveMs)}</p>
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Efectivo</p>
                    </div>
                  </div>
                  <div className="p-6 space-y-3">
                    {sortedLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            log.type === 'clock-in' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                            log.type === 'clock-out' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 
                            'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                          }`} />
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{log.type.replace('-', ' ')}</span>
                        </div>
                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md">{format(new Date(log.timestamp), 'HH:mm')}</span>
                      </div>
                    ))}
                    {lunchMs > 0 && (
                      <div className="pt-3 mt-3 border-t border-dashed border-white/5 flex justify-between items-center">
                        <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">Tiempo Comida</span>
                        <span className="text-[10px] font-black text-amber-500">{formatMs(lunchMs)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'tasks' && (
          <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Gestión de Tareas</h3>
              <button 
                onClick={() => setShowTaskModal(true)}
                className="bg-white text-black px-4 py-2 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
              >
                <Plus size={14} /> Nueva
              </button>
            </div>

            <div className="space-y-4">
              {tasks.map(task => (
                <div key={task.id} className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    task.priority === 'high' ? 'bg-rose-500' : 
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-indigo-500'
                  }`} />
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        task.priority === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                        task.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      }`}>
                        {task.priority}
                      </span>
                      <span className={`text-[7px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        task.status === 'done' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        task.status === 'in-progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-zinc-800 text-zinc-500 border-white/5'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                    <button className="text-zinc-700 hover:text-white transition-colors"><MoreVertical size={16} /></button>
                  </div>

                  <h4 className="font-black text-white text-base mb-2 group-hover:text-indigo-400 transition-colors">{task.title}</h4>
                  <p className="text-xs text-zinc-500 mb-6 line-clamp-2 leading-relaxed">{task.description}</p>
                  
                  <div className="flex justify-between items-center pt-5 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-xl flex items-center justify-center text-[10px] font-black text-zinc-400 border border-white/5">
                        {task.assignedToName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white">{task.assignedToName}</p>
                        <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Asignado</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-400">{format(parseISO(task.dueDate), 'd MMM')}</p>
                      <p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Límite</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {showTaskModal && (
              <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 w-full max-w-md rounded-[3rem] p-10 border border-white/10 shadow-2xl space-y-6">
                  <h3 className="text-2xl font-black tracking-tighter">Asignar Tarea</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Título</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Reporte Mensual"
                        value={newTask.title}
                        onChange={e => setNewTask({...newTask, title: e.target.value})}
                        className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Descripción</label>
                      <textarea 
                        placeholder="Detalles de la tarea..."
                        value={newTask.description}
                        onChange={e => setNewTask({...newTask, description: e.target.value})}
                        className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none h-28 resize-none focus:border-white/20 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Responsable</label>
                      <select 
                        value={newTask.assignedTo}
                        onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                        className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none focus:border-white/20 transition-all appearance-none"
                      >
                        <option value="">Seleccionar staff...</option>
                        {allUsers.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Prioridad</label>
                        <select 
                          value={newTask.priority}
                          onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                          className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none appearance-none"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Fecha</label>
                        <input 
                          type="date"
                          value={newTask.dueDate}
                          onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                          className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl p-4 text-sm font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button onClick={() => setShowTaskModal(false)} className="flex-1 py-4 text-zinc-500 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button 
                      onClick={async () => {
                        const assignedUser = allUsers.find(u => u.uid === newTask.assignedTo);
                        await createTask({
                          ...newTask,
                          assignedToName: assignedUser?.displayName || 'N/A',
                          status: 'todo'
                        });
                        setShowTaskModal(false);
                        toast.success('Tarea asignada con éxito');
                      }}
                      className="flex-1 bg-white text-black py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-white/5 active:scale-95 transition-all"
                    >
                      Crear Tarea
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-zinc-900/50 p-8 rounded-[3rem] border border-white/5 space-y-8 backdrop-blur-sm">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Entrada</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input type="time" value={settings?.workStart} onChange={(e) => updateCompanySettings({ workStart: e.target.value })} className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-white/20 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Salida</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input type="time" value={settings?.workEnd} onChange={(e) => updateCompanySettings({ workEnd: e.target.value })} className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-black outline-none focus:border-white/20 transition-all" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Secreto QR de Oficina</label>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <QrCode className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input type="text" value={settings?.qrSecret} readOnly className="w-full bg-zinc-800/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-xs font-mono text-zinc-400 outline-none" />
                  </div>
                  <button 
                    onClick={() => updateCompanySettings({ qrSecret: uuidv4().slice(0, 8).toUpperCase() })} 
                    className="bg-zinc-800 text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-colors border border-white/5"
                  >
                    Girar
                  </button>
                </div>
                
                {settings?.qrSecret && (
                  <div className="bg-white p-6 rounded-[2rem] flex flex-col items-center gap-4 shadow-2xl">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${settings.qrSecret}`} 
                      alt="QR Code"
                      className="w-40 h-40"
                      referrerPolicy="no-referrer"
                    />
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest text-center">
                      Escanea este código o imprímelo para la oficina
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Nota de Seguridad</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed">Solo los administradores autorizados pueden ver y modificar estos ajustes. El código QR debe ser escaneado físicamente en la oficina.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AttendanceApp() {
  const { user, profile, settings, loading, login, logout, registerAttendance, attendanceLogs, tasks, updateTask, setUserRole } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const [showScanner, setShowScanner] = useState(false);
  const [selectedType, setSelectedType] = useState<AttendanceType | null>(null);
  const [activeView, setActiveView] = useState<'home' | 'calendar' | 'tasks' | 'history' | 'admin'>('home');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dismissedLogs, setDismissedLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissed_logs');
    return saved ? JSON.parse(saved) : [];
  });

  // Redirect admin home to admin dashboard
  useEffect(() => {
    if (profile?.role === 'admin' && activeView === 'home') {
      setActiveView('admin');
    }
  }, [profile, activeView]);

  useEffect(() => {
    localStorage.setItem('dismissed_logs', JSON.stringify(dismissedLogs));
  }, [dismissedLogs]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-4 border-black border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6"><Clock size={40} /></div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tracker de Ingreso</h1>
          <p className="text-gray-600 mb-8">Inicia sesión para registrar tu jornada laboral.</p>
          <button onClick={login} className="w-full bg-black text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 active:scale-95 transition-all"><LogIn size={20} />Continuar con Google</button>
        </motion.div>
      </div>
    );
  }

  // Role Selection View
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-10 text-center">
          <h2 className="text-2xl font-black mb-2">Bienvenido</h2>
          <p className="text-gray-400 text-sm mb-8">Selecciona tu tipo de acceso para continuar</p>
          
          <div className="space-y-4">
            <button 
              onClick={async () => {
                try {
                  await setUserRole('employee');
                } catch (e) {
                  toast.error('Error al seleccionar rol');
                }
              }}
              className="w-full p-6 bg-gray-50 hover:bg-gray-100 rounded-3xl border border-gray-100 flex items-center gap-4 transition-all group"
            >
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                <UserIcon className="text-gray-400" />
              </div>
              <div className="text-left">
                <p className="font-black text-gray-900">Empleado</p>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Acceso estándar</p>
              </div>
              <ChevronRight className="ml-auto text-gray-300" size={20} />
            </button>

            <button 
              onClick={async () => {
                try {
                  await setUserRole('pending-admin');
                } catch (e) {
                  toast.error('Error al solicitar acceso');
                }
              }}
              className="w-full p-6 bg-black text-white rounded-3xl flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-95"
            >
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <ShieldCheck className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-black">Administrador</p>
                <p className="text-[10px] text-white/40 uppercase font-bold">Requiere autorización</p>
              </div>
              <ChevronRight className="ml-auto text-white/20" size={20} />
            </button>
          </div>

          <button onClick={logout} className="mt-8 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cerrar Sesión</button>
        </motion.div>
      </div>
    );
  }

  // Pending Approval View
  if (profile.role === 'pending-admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-10 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Clock size={40} className="animate-pulse" />
          </div>
          <h2 className="text-2xl font-black mb-2">Acceso Pendiente</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Tu solicitud de administrador ha sido enviada. <br />
            Por favor, espera a que el administrador principal autorice tu cuenta.
          </p>
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Usuario</p>
            <p className="text-sm font-bold text-gray-900">{profile.displayName}</p>
            <p className="text-xs text-gray-500">{profile.email}</p>
          </div>
          <button onClick={logout} className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors">Cerrar Sesión</button>
        </motion.div>
      </div>
    );
  }

  const handleScan = async (data: string) => {
    if (selectedType) {
      try {
        await registerAttendance(selectedType, data);
        toast.success('Registro exitoso');
        setShowScanner(false);
        setSelectedType(null);
      } catch (error: any) {
        toast.error(error.message || 'Error al registrar');
      }
    }
  };

  const dismissLog = (id: string) => {
    setDismissedLogs(prev => [...prev, id]);
    toast.success('Registro ocultado de la app');
  };

  const visibleLogs = attendanceLogs.filter(log => !dismissedLogs.includes(log.id!));
  
  const calculateDayDurations = (logs: AttendanceLog[]) => {
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const clockIn = sorted.find(l => l.type === 'clock-in');
    const clockOut = [...sorted].reverse().find(l => l.type === 'clock-out');
    const lunchOut = sorted.find(l => l.type === 'lunch-out');
    const lunchIn = sorted.find(l => l.type === 'lunch-in');

    let totalShiftMs = 0;
    let lunchMs = 0;

    if (clockIn && clockOut) {
      totalShiftMs = new Date(clockOut.timestamp).getTime() - new Date(clockIn.timestamp).getTime();
    }

    if (lunchOut && lunchIn) {
      lunchMs = new Date(lunchIn.timestamp).getTime() - new Date(lunchOut.timestamp).getTime();
    }

    const effectiveWorkMs = totalShiftMs > 0 ? Math.max(0, totalShiftMs - lunchMs) : 0;

    const formatMs = (ms: number) => {
      if (ms <= 0) return '--:--';
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    return {
      totalShift: formatMs(totalShiftMs),
      lunchTime: formatMs(lunchMs),
      effectiveWork: formatMs(effectiveWorkMs),
      hasClockOut: !!clockOut
    };
  };

  const todayLogs = visibleLogs.filter(l => isSameDay(new Date(l.timestamp), new Date()));
  const todayStats = calculateDayDurations(todayLogs);
  const logsForSelectedDate = visibleLogs.filter(log => isSameDay(new Date(log.timestamp), selectedDate));
  const selectedDateStats = calculateDayDurations(logsForSelectedDate);

  const attendanceButtons = [
    { type: 'clock-in' as AttendanceType, label: 'Entrada', icon: LogIn, color: 'bg-green-500' },
    { type: 'lunch-out' as AttendanceType, label: 'Comida (S)', icon: Coffee, color: 'bg-orange-500' },
    { type: 'lunch-in' as AttendanceType, label: 'Comida (R)', icon: Clock, color: 'bg-blue-500' },
    { type: 'clock-out' as AttendanceType, label: 'Salida', icon: LogOut, color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans selection:bg-indigo-500/30">
      <style>{calendarStyles}</style>
      
      {/* Premium Header */}
      <header className="bg-black/50 backdrop-blur-xl border-b border-white/5 px-6 py-5 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ rotate: 180 }}
              className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
            >
              <Clock size={24} />
            </motion.div>
            <div>
              <h2 className="font-black text-white text-lg tracking-tight leading-none">{profile?.displayName}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <p className="text-[9px] text-zinc-500 uppercase font-black tracking-[0.2em]">{profile?.role}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isInstallable && (
              <button 
                onClick={install} 
                className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-90 flex items-center gap-2"
              >
                <Download size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Instalar App</span>
              </button>
            )}
            <button onClick={logout} className="p-2.5 bg-zinc-900 text-zinc-500 hover:text-rose-500 rounded-xl border border-white/5 transition-all active:scale-90">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className={`flex-1 max-w-2xl w-full mx-auto p-6 overflow-y-auto pb-32 ${profile?.role === 'admin' ? 'bg-black' : 'bg-gray-50'}`}>
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-8">
              {todayLogs.length > 0 && (
                <section className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Jornada Neta</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{todayStats.effectiveWork}</p>
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Total trabajado hoy</p>
                  </div>
                  <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Coffee size={12} className="text-orange-500" />
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Descanso</p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">{todayStats.lunchTime}</p>
                    <p className="text-[9px] text-gray-400 mt-1 font-medium">Tiempo de comida</p>
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Registro Rápido</h3>
                <div className="grid grid-cols-2 gap-4">
                  {attendanceButtons.map((btn) => (
                    <button
                      key={btn.type}
                      onClick={() => { setSelectedType(btn.type); setShowScanner(true); }}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center gap-3 hover:shadow-md transition-all active:scale-95 group"
                    >
                      <div className={`w-12 h-12 ${btn.color} text-white rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}><btn.icon size={24} /></div>
                      <span className="font-bold text-gray-700">{btn.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">Mi Horario</p>
                  <p className="text-lg font-black text-gray-900">
                    {profile?.workStart || settings?.workStart} - {profile?.workEnd || settings?.workEnd}
                  </p>
                  <p className="text-[9px] text-gray-400 mt-1 font-medium">
                    Tolerancia: {profile?.tolerance !== undefined ? profile.tolerance : settings?.tolerance} min
                  </p>
                </div>
                <div className="bg-black text-white p-5 rounded-[2rem] relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Dispositivo</p>
                    <p className="font-mono text-[10px] opacity-60">{profile?.deviceId?.slice(0, 12)}...</p>
                  </div>
                  <Smartphone className="absolute -right-2 -bottom-2 opacity-10" size={40} />
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actividad de Hoy</h3>
                  <HistoryIcon size={14} className="text-gray-300" />
                </div>
                <div className="space-y-3">
                  {visibleLogs.filter(l => isSameDay(new Date(l.timestamp), new Date())).length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200"><p className="text-gray-400 text-sm">Sin actividad hoy</p></div>
                  ) : (
                    visibleLogs.filter(l => isSameDay(new Date(l.timestamp), new Date())).map(log => (
                      <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type === 'clock-in' ? 'bg-green-50 text-green-600' : log.type === 'clock-out' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-600'}`}>
                            {log.type === 'clock-in' ? <LogIn size={18} /> : log.type === 'clock-out' ? <LogOut size={18} /> : <Coffee size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm capitalize">{log.type.replace('-', ' ')}</p>
                            <p className="text-[10px] text-gray-400 font-bold">{format(new Date(log.timestamp), "HH:mm 'hrs'")}</p>
                          </div>
                        </div>
                        <button onClick={() => dismissLog(log.id!)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeView === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <Calendar 
                onChange={(val) => setSelectedDate(val as Date)} 
                value={selectedDate}
                locale="es-ES"
                tileClassName={({ date }) => {
                  const dayLogs = visibleLogs.filter(l => isSameDay(new Date(l.timestamp), date));
                  if (dayLogs.length > 0) {
                    return dayLogs.some(l => l.isAnomaly) ? 'has-logs has-anomaly' : 'has-logs';
                  }
                  return '';
                }}
              />

              {logsForSelectedDate.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black text-white p-4 rounded-2xl">
                    <p className="text-[8px] uppercase font-bold opacity-60 mb-1">Jornada Efectiva</p>
                    <p className="text-lg font-black">{selectedDateStats.effectiveWork}</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-2xl">
                    <p className="text-[8px] uppercase font-bold text-gray-400 mb-1">Tiempo Comida</p>
                    <p className="text-lg font-black text-gray-900">{selectedDateStats.lunchTime}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(selectedDate, "d 'de' MMMM", { locale: es })}</h4>
                {logsForSelectedDate.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No hay registros para este día</p>
                ) : (
                  logsForSelectedDate.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${log.isAnomaly ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                          {log.isAnomaly ? <AlertTriangle size={14} /> : <Clock size={14} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold capitalize">{log.type.replace('-', ' ')}</p>
                          <p className="text-[10px] text-gray-400">{format(new Date(log.timestamp), 'HH:mm')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Mis Tareas</h3>
                <div className="flex gap-2">
                  <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-2 py-1 rounded-lg">
                    {tasks.filter(t => t.status !== 'done').length} PENDIENTES
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {tasks.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
                    <ListTodo size={40} className="mx-auto text-gray-200 mb-4" />
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Sin tareas asignadas</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        task.priority === 'high' ? 'bg-red-500' : 
                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">
                          Vence: {format(parseISO(task.dueDate), 'd MMM')}
                        </span>
                        <select 
                          value={task.status}
                          onChange={(e) => updateTask(task.id!, { status: e.target.value as any })}
                          className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg outline-none border-none ${
                            task.status === 'done' ? 'bg-green-100 text-green-600' : 
                            task.status === 'in-progress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <option value="todo">Pendiente</option>
                          <option value="in-progress">En Proceso</option>
                          <option value="done">Completada</option>
                        </select>
                      </div>

                      <h4 className={`font-bold text-gray-900 mb-1 ${task.status === 'done' ? 'line-through opacity-50' : ''}`}>
                        {task.title}
                      </h4>
                      <p className={`text-xs text-gray-500 line-clamp-2 ${task.status === 'done' ? 'opacity-50' : ''}`}>
                        {task.description}
                      </p>
                      
                      {task.status !== 'done' && (
                        <button 
                          onClick={() => updateTask(task.id!, { status: 'done' })}
                          className="mt-4 w-full py-2 bg-gray-50 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-black hover:text-white transition-all"
                        >
                          Marcar como lista
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black">Historial Completo</h3>
                <button onClick={() => setDismissedLogs([])} className="text-[10px] font-bold text-blue-500 uppercase">Restaurar Ocultos</button>
              </div>
              <div className="space-y-3">
                {visibleLogs.map(log => (
                  <div key={log.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[40px]">
                        <p className="text-xs font-black leading-none">{format(new Date(log.timestamp), 'dd')}</p>
                        <p className="text-[8px] uppercase font-bold text-gray-400">{format(new Date(log.timestamp), 'MMM', { locale: es })}</p>
                      </div>
                      <div className="h-8 w-px bg-gray-100" />
                      <div>
                        <p className="text-xs font-bold capitalize">{log.type.replace('-', ' ')}</p>
                        <p className="text-[10px] text-gray-400">{format(new Date(log.timestamp), 'HH:mm')} • {log.isAnomaly ? 'Anomalía' : 'Normal'}</p>
                      </div>
                    </div>
                    <button onClick={() => dismissLog(log.id!)} className="p-2 text-gray-200 hover:text-red-400 transition-all"><X size={16} /></button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeView === 'admin' && profile?.role === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <AdminDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-6 left-6 right-6 z-50">
        <div className="max-w-2xl mx-auto bg-zinc-900/80 backdrop-blur-2xl border border-white/10 px-4 py-3 rounded-[2.5rem] shadow-2xl flex items-center justify-between">
          {profile?.role !== 'admin' && (
            <NavBtn active={activeView === 'home'} onClick={() => setActiveView('home')} icon={Home} label="Inicio" />
          )}
          {profile?.role === 'admin' && (
            <NavBtn active={activeView === 'admin'} onClick={() => setActiveView('admin')} icon={ShieldCheck} label="Dashboard" />
          )}
          <NavBtn active={activeView === 'tasks'} onClick={() => setActiveView('tasks')} icon={ListTodo} label="Tareas" />
          <NavBtn active={activeView === 'calendar'} onClick={() => setActiveView('calendar')} icon={CalendarIcon} label="Agenda" />
          <NavBtn active={activeView === 'history'} onClick={() => setActiveView('history')} icon={HistoryIcon} label="Logs" />
        </div>
      </nav>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white w-full max-w-md rounded-[2.5rem] p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Validar QR</h3>
                <button onClick={() => setShowScanner(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <QRScanner onScan={handleScan} />
              <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-6">Escanea el código de la oficina</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toaster position="top-center" toastOptions={{ style: { borderRadius: '16px', background: '#000', color: '#fff', fontSize: '12px', fontWeight: 'bold' } }} />
    </div>
  );
}

function NavBtn({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all relative px-4 py-1 ${active ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}
    >
      <Icon size={20} className={active ? 'text-white' : 'text-zinc-400'} />
      <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -bottom-1 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]"
        />
      )}
    </button>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AttendanceApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
