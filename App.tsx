
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Package,
  MapPin,
  Settings,
  RefreshCcw,
  Loader2,
  Box,
  AlertCircle,
  CheckCircle2,
  Maximize,
  Minimize,
  Clock,
  History,
  ShieldCheck,
  ShieldAlert,
  Info,
  Trash2,
  Filter,
  Layers,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  AlertTriangle,
  Lock,
  User,
  LogOut
} from 'lucide-react';

import { fetchWarehouseData, fetchLocations, fetchMapeoHistory, appendMapeoRow } from './services/dataService';
import { LocationMaster, Product, ViewMode, MapeoEntry, ProductLocation } from './types';

// Definición de Usuarios y Roles
const USERS = [
  { username: 'Mapperadmin', password: 'Hudson2125', role: 'admin', label: 'Supervisor' },
  { username: 'Mapper', password: 'Zuiden26', role: 'operator', label: 'Operario Mapeo' },
  { username: 'Despacho', password: 'Zuiden26', role: 'operator', label: 'Operario Despacho' },
];

const App: React.FC = () => {
  // Login State
  const [currentUser, setCurrentUser] = useState<typeof USERS[0] | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');

  // App Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [history, setHistory] = useState<MapeoEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('assign');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; prod: Product | null; locId: string } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());

  // Location Consult
  const [searchLocQuery, setSearchLocQuery] = useState<string>('');
  const [showLocHistory, setShowLocHistory] = useState(false);

  // Assign
  const [scanProductCode, setScanProductCode] = useState<string>('');
  const [scanLocationCode, setScanLocationCode] = useState<string>('');
  const [assignObs, setAssignObs] = useState<string>('');
  const [assignStatus, setAssignStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Admin Search
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');

  const productInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const [prod, locs, hist] = await Promise.all([
        fetchWarehouseData(), 
        fetchLocations(),
        fetchMapeoHistory()
      ]);
      setProducts(prod);
      setLocations(locs);
      setHistory(hist);
      setLastSync(new Date());
    } catch (err) {
      setError('Error al sincronizar datos.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
    const handleFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [loadData, currentUser]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(u => u.username === loginForm.user && u.password === loginForm.pass);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
    } else {
      setLoginError('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ user: '', pass: '' });
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Se ignora prioridad y rol, se ordenan alfabéticamente para una vista clara
  const getSortedUbicaciones = (locs: ProductLocation[]) => {
    return [...locs]
      .filter(u => u.activo)
      .sort((a, b) => a.ubicacionId.localeCompare(b.ubicacionId));
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p => 
      p.sku.toLowerCase().includes(q) || 
      p.ean.toLowerCase().includes(q) || 
      p.descripcion.toLowerCase().includes(q) ||
      p.cliente.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  const toggleHistory = (sku: string) => {
    const newSet = new Set(expandedHistories);
    if (newSet.has(sku)) newSet.delete(sku);
    else newSet.add(sku);
    setExpandedHistories(newSet);
  };

  const getProductHistory = (sku: string) => {
    return history.filter(h => h.sku === sku);
  };

  const adminFilteredList = useMemo(() => {
    const q = adminSearchQuery.trim().toLowerCase();
    const list = products.flatMap(p => 
      p.ubicaciones.map(u => ({ product: p, location: u }))
    );
    if (!q) return list;
    return list.filter(item => 
      item.product.sku.toLowerCase().includes(q) ||
      item.product.ean.toLowerCase().includes(q) ||
      item.product.descripcion.toLowerCase().includes(q) ||
      item.location.ubicacionId.toLowerCase().includes(q)
    );
  }, [products, adminSearchQuery]);

  const scannedProductInfo = useMemo(() => {
    const code = scanProductCode.trim().toLowerCase();
    if (!code) return null;
    return products.find(p => p.sku.toLowerCase() === code || p.ean.toLowerCase() === code);
  }, [products, scanProductCode]);

  const scannedLocationInfo = useMemo(() => {
    const code = scanLocationCode.trim().toUpperCase();
    if (!code) return null;
    const master = locations.find(l => l.ubicacionId.toUpperCase() === code);
    const productsInLoc = products.filter(p => 
      p.ubicaciones.some(u => u.ubicacionId.toUpperCase() === code && u.activo)
    );
    return { master, products: productsInLoc };
  }, [locations, products, scanLocationCode]);

  const selectedLocData = useMemo(() => {
    const q = searchLocQuery.trim().toUpperCase();
    if (!q) return null;
    const loc = locations.find(l => l.ubicacionId.toUpperCase() === q);
    if (!loc) return null;
    const productsHere = products.filter(p => 
      p.ubicaciones.some(u => u.ubicacionId.toUpperCase() === q && u.activo)
    );
    const locHistory = history.filter(h => h.ubicacionId.toUpperCase() === q);
    return { loc, productsHere, locHistory };
  }, [locations, products, history, searchLocQuery]);

  const handleToggleActive = async (prod: Product, locId: string, targetActive: boolean) => {
    if (!targetActive && currentUser?.role !== 'admin') {
      setConfirmModal({ show: true, prod, locId });
      return;
    }
    
    executeToggleActive(prod, locId, targetActive);
  };

  const executeToggleActive = async (prod: Product, locId: string, targetActive: boolean) => {
    setIsAssigning(true);
    try {
      const ok = await appendMapeoRow({
        Timestamp: new Date().toISOString(),
        Usuario: currentUser?.username || 'Sistema',
        EAN: prod.ean,
        SKU: prod.sku,
        Descripcion: prod.descripcion,
        UbicacionID: locId,
        RolUbicacion: prod.ubicaciones.find(u => u.ubicacionId === locId)?.rolUbicacion || 'Picking',
        Prioridad: 0,
        Activo: targetActive,
        Motivo: targetActive ? 'Habilitación manual' : 'Desactivación manual',
        Observaciones: 'Cambio de estado desde panel ' + (currentUser?.role === 'admin' ? 'admin' : 'mapeo')
      });
      if (ok) await loadData();
    } finally {
      setIsAssigning(false);
      setConfirmModal(null);
    }
  };

  const handleAssignCommit = async () => {
    setAssignStatus(null);
    const code = scanProductCode.trim();
    const locId = scanLocationCode.trim().toUpperCase();

    const prod = products.find(p => p.sku === code || p.ean === code);
    if (!prod) {
      setAssignStatus({ ok: false, msg: 'Producto no encontrado.' });
      return;
    }

    const locExists = locations.find(l => l.ubicacionId.toUpperCase() === locId);
    if (!locExists) {
      setAssignStatus({ ok: false, msg: 'Ubicación no existe en el maestro.' });
      return;
    }

    if (!locExists.tipo) {
      setAssignStatus({ ok: false, msg: 'Falta cargar Rol en esa ubicación (Sheet UBICACIONES Col F).' });
      return;
    }

    const alreadyThere = prod.ubicaciones.some(u => u.ubicacionId.toUpperCase() === locId && u.activo);
    if (alreadyThere) {
      setAssignStatus({ ok: false, msg: 'El producto ya está activo en esta ubicación.' });
      return;
    }

    setIsAssigning(true);
    try {
      const ok = await appendMapeoRow({
        Timestamp: new Date().toISOString(),
        Usuario: currentUser?.username || 'operario',
        EAN: prod.ean,
        SKU: prod.sku,
        Descripcion: prod.descripcion,
        UbicacionID: locId,
        RolUbicacion: locExists.tipo,
        Prioridad: 0,
        Activo: true,
        Motivo: 'Asignación manual',
        Observaciones: assignObs
      });
      if (ok) {
        setAssignStatus({ ok: true, msg: 'Asignación completada con éxito.' });
        setScanProductCode('');
        setScanLocationCode('');
        setAssignObs('');
        await loadData();
        productInputRef.current?.focus();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-['Inter']">
        <div className="mb-12 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <h1 className="text-white text-6xl font-bold tracking-tight leading-none">Zuiden</h1>
            <div className="w-5 h-5 bg-orange-500 rounded-full mb-1"></div>
          </div>
          <p className="text-white text-sm tracking-[0.8em] font-light uppercase mt-4 opacity-80">Fulfillment</p>
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-sm bg-zinc-900/50 p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl backdrop-blur-xl">
          <h2 className="text-white font-black text-xl mb-8 flex items-center gap-3">
            <Lock className="text-orange-500" size={24} /> Acceso al Sistema
          </h2>
          
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  type="text" 
                  value={loginForm.user}
                  onChange={e => setLoginForm({ ...loginForm, user: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold"
                  placeholder="ID de usuario"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                <input 
                  type="password" 
                  value={loginForm.pass}
                  onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs font-bold text-center animate-in fade-in zoom-in">
                {loginError}
              </div>
            )}

            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/10 transition-all mt-4 flex items-center justify-center gap-2">
              Ingresar <ChevronDown className="-rotate-90" size={18} />
            </button>
          </div>
        </form>
        <p className="mt-8 text-zinc-600 text-[10px] uppercase font-bold tracking-[0.2em]">© 2024 Zuiden Logistics • Warehouse Mapping System</p>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'assign', label: 'Asignar / Mover', icon: Box, activeColor: 'bg-orange-500', roles: ['admin', 'operator'] },
    { id: 'search', label: 'Buscar Producto', icon: Search, activeColor: 'bg-black', roles: ['admin', 'operator'] },
    { id: 'locations', label: 'Consultar Ubic.', icon: MapPin, activeColor: 'bg-black', roles: ['admin', 'operator'] },
    { id: 'admin', label: 'Administración', icon: Settings, activeColor: 'bg-black', roles: ['admin'] }
  ].filter(item => item.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-[#f1f4f9] flex flex-col font-['Inter']">
      <header className="bg-black h-20 flex items-center justify-between px-8 z-20 shrink-0 shadow-xl">
        <div className="flex flex-col items-start">
          <div className="flex items-baseline gap-0.5">
            <h1 className="text-white text-3xl font-bold tracking-tight leading-none">Zuiden</h1>
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full mb-1"></div>
          </div>
          <p className="text-white text-[10px] tracking-[0.4em] font-light uppercase mt-1 opacity-90">Fulfillment</p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block border-r border-white/20 pr-6 mr-6">
            <p className="text-xs font-black text-orange-500 uppercase tracking-[0.2em]">Mapper Pro</p>
            <div className="flex items-center gap-2 justify-end mt-1">
              <span className="text-[10px] font-bold text-white uppercase tracking-widest">{currentUser.username}</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={loadData} 
              className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/10"
              title="Sincronizar Datos"
            >
              <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={handleLogout} 
              className="p-2.5 text-rose-500 hover:text-white hover:bg-rose-600/20 rounded-xl transition-all border border-rose-500/20"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {confirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 border border-slate-200 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="bg-rose-50 p-4 rounded-3xl text-rose-500 mb-6">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-4">Confirmación</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                ¿Estás seguro de que deseas <span className="text-rose-600 font-black">DESHABILITAR</span> este producto de la ubicación <span className="text-slate-800 font-black">{confirmModal.locId}</span>?
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmModal.prod && executeToggleActive(confirmModal.prod, confirmModal.locId, false)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-rose-200 transition-all"
                >
                  Sí, Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        <aside className="w-[280px] border-r border-slate-200 p-6 flex flex-col bg-white">
          <div className="flex-1 space-y-3">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id as ViewMode)}
                className={`w-full flex items-center p-4 rounded-2xl transition-all border ${
                  viewMode === item.id 
                    ? `${item.activeColor} text-white shadow-lg scale-[1.02] border-transparent` 
                    : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                }`}
              >
                <item.icon size={20} className="mr-3" />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}
          </div>
          
          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mt-auto">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Última Sincro</p>
            <p className="text-xs font-bold text-slate-600">{lastSync ? lastSync.toLocaleTimeString() : '---'}</p>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 bg-[#f8fafc]">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <Loader2 className="animate-spin text-orange-500" size={40} />
              <p className="font-bold uppercase text-[10px] tracking-[0.2em]">Cargando base de datos...</p>
            </div>
          )}

          {!loading && viewMode === 'assign' && (
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm h-fit">
                <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center">
                  <Box className="mr-3 text-orange-500" /> Registro de Mapeo
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">1. Escanear Producto</label>
                    <input
                      ref={productInputRef}
                      value={scanProductCode}
                      onChange={e => setScanProductCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && locationInputRef.current?.focus()}
                      placeholder="SKU o EAN..."
                      className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 text-xl outline-none focus:ring-4 focus:ring-orange-500/30 shadow-lg"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">2. Escanear Ubicación</label>
                    <input
                      ref={locationInputRef}
                      value={scanLocationCode}
                      onChange={e => setScanLocationCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAssignCommit()}
                      placeholder="UbicacionID..."
                      className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 text-xl outline-none focus:ring-4 focus:ring-orange-500/30 shadow-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">3. Rol de Ubicación</label>
                    <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-center min-h-[56px]">
                      {scannedLocationInfo?.master ? (
                        scannedLocationInfo.master.tipo ? (
                          <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-sm">
                            {scannedLocationInfo.master.tipo.toLowerCase().includes('picking') ? <Layers className="text-emerald-500" size={18} /> : <LayoutGrid className="text-orange-500" size={18} />}
                            {scannedLocationInfo.master.tipo}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-500 font-black uppercase text-[10px]">
                            <AlertTriangle size={16} /> Falta definir rol en base
                          </div>
                        )
                      ) : (
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest italic opacity-50">Esperando escaneo...</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">4. Observaciones</label>
                    <textarea 
                      value={assignObs}
                      onChange={e => setAssignObs(e.target.value)}
                      placeholder="Comentarios adicionales..."
                      rows={2}
                      className="w-full bg-slate-50 text-slate-800 font-bold rounded-2xl px-5 py-4 outline-none border border-slate-200 focus:ring-4 focus:ring-orange-500/10 text-sm"
                    />
                  </div>

                  <button
                    onClick={handleAssignCommit}
                    disabled={isAssigning || !scanProductCode || !scanLocationCode || !scannedLocationInfo?.master?.tipo}
                    className="w-full bg-black text-white font-black rounded-2xl py-5 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl flex items-center justify-center border border-white/10"
                  >
                    {isAssigning ? <Loader2 className="animate-spin" /> : 'Confirmar Registro'}
                  </button>
                </div>
                {assignStatus && (
                  <div className={`mt-6 p-4 rounded-2xl border font-bold text-sm flex items-center animate-in fade-in ${assignStatus.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800'}`}>
                    {assignStatus.ok ? <CheckCircle2 size={18} className="mr-2" /> : <AlertCircle size={18} className="mr-2" />}
                    {assignStatus.msg}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {scannedProductInfo && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-orange-50 rounded-2xl text-orange-600"><Package size={24} /></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Producto</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase leading-tight">{scannedProductInfo.descripcion}</h3>
                    <div className="flex gap-4 mt-2 mb-6 border-b border-slate-100 pb-4">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">SKU: {scannedProductInfo.sku}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">EAN: {scannedProductInfo.ean}</p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ubicaciones Vigentes</p>
                      {scannedProductInfo.ubicaciones.length > 0 ? (
                        getSortedUbicaciones(scannedProductInfo.ubicaciones).map((u, i) => (
                          <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${u.activo ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100 opacity-60'}`}>
                            <div className="flex items-center">
                              <MapPin size={18} className={u.activo ? 'text-emerald-500 mr-3' : 'text-rose-500 mr-3'} />
                              <div>
                                <p className="font-black text-slate-800 leading-none">{u.ubicacionId}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{u.rolUbicacion}</p>
                              </div>
                            </div>
                            {u.activo && (
                              <button onClick={() => handleToggleActive(scannedProductInfo, u.ubicacionId, false)} disabled={isAssigning} className="p-2 text-rose-500 hover:bg-rose-100 rounded-xl transition-all" title="Deshabilitar"><Trash2 size={18} /></button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-bold uppercase italic text-center py-4 opacity-50">Sin registros.</p>
                      )}
                    </div>
                  </div>
                )}

                {scannedLocationInfo && (
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-slate-900 rounded-2xl text-white"><MapPin size={24} /></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Ubicación</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-black text-slate-800 uppercase leading-tight tracking-tight">{scanLocationCode.toUpperCase()}</h3>
                      {scannedLocationInfo.master ? (
                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${scannedLocationInfo.products.length > 0 ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                          {scannedLocationInfo.products.length > 0 ? 'Ocupada' : 'Disponible'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-400 border border-slate-200">No Registrada</span>
                      )}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Contenido ({scannedLocationInfo.products.length})</p>
                      {scannedLocationInfo.products.length > 0 ? (
                        scannedLocationInfo.products.map((p, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400"><Box size={14} /></div>
                              <div>
                                <p className="text-[10px] font-black text-orange-600 leading-none mb-1">{p.sku}</p>
                                <p className="text-[11px] font-bold text-slate-800 uppercase truncate max-w-[150px]">{p.descripcion}</p>
                              </div>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{p.cliente}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 font-bold uppercase italic text-center py-4 opacity-50">Lista para asignación.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && viewMode === 'search' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                  <Search className="mr-3 text-orange-500" /> Búsqueda de Inventario
                </h2>
                <input
                  type="text"
                  placeholder="SKU, EAN o Descripción..."
                  className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 text-xl outline-none focus:ring-4 focus:ring-orange-500/20 shadow-inner"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {searchQuery && (
                <div className="grid grid-cols-1 gap-4">
                  {filteredProducts.map(p => {
                    const activeLocs = getSortedUbicaciones(p.ubicaciones);
                    const prodHist = getProductHistory(p.sku);
                    const isExpanded = expandedHistories.has(p.sku);

                    return (
                      <div key={p.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className="p-6">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{p.sku}</span>
                                <span className="text-[10px] font-mono text-slate-400">{p.ean}</span>
                              </div>
                              <h3 className="text-lg font-black text-slate-800 uppercase leading-tight">{p.descripcion}</h3>
                              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{p.cliente}</p>
                            </div>
                            
                            <button 
                              onClick={() => toggleHistory(p.sku)}
                              className={`p-2.5 rounded-xl transition-all ${isExpanded ? 'bg-orange-500 text-white shadow-lg shadow-orange-100' : 'bg-slate-100 text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}
                            >
                              <PlusCircle size={20} className={isExpanded ? 'rotate-45 transition-transform' : 'transition-transform'} />
                            </button>
                          </div>

                          <div className="mt-6">
                            {activeLocs.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {activeLocs.map((u, i) => (
                                  <div key={i} className="flex items-center px-4 py-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 font-bold">
                                    <MapPin size={14} className="mr-2 opacity-50" />
                                    <span className="text-sm mr-2">{u.ubicacionId}</span>
                                    <span className="text-[9px] font-black uppercase opacity-40">{u.rolUbicacion}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                                <AlertTriangle size={18} className="text-amber-500" />
                                <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Sin ubicación activa</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="bg-slate-50 border-t border-slate-100 p-6 animate-in slide-in-from-top-2 duration-200">
                             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                               <History size={12} className="mr-2" /> Trazabilidad de Movimientos
                             </h4>
                             {prodHist.length > 0 ? (
                               <div className="space-y-2">
                                 {prodHist.map((h, i) => (
                                   <div key={i} className="flex items-center justify-between text-[11px] bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${h.activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <span className="font-bold text-slate-700">{h.activo ? 'ALTA' : 'BAJA'} • {h.ubicacionId}</span>
                                      </div>
                                      <span className="text-slate-400 font-medium opacity-60">{new Date(h.timestamp).toLocaleString()}</span>
                                   </div>
                                 ))}
                               </div>
                             ) : (
                               <p className="text-xs text-slate-400 italic">No hay historial disponible.</p>
                             )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loading && viewMode === 'locations' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center">
                  <MapPin className="mr-3 text-rose-500" /> Auditoría de Ubicación
                </h2>
                <input
                  type="text"
                  placeholder="Ej: RACK-A-01..."
                  className="w-full bg-slate-900 text-white rounded-2xl px-6 py-5 text-xl outline-none focus:ring-4 focus:ring-rose-500/20 shadow-inner"
                  value={searchLocQuery}
                  onChange={e => setSearchLocQuery(e.target.value)}
                />
              </div>

              {selectedLocData ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Disponibilidad</p>
                      {selectedLocData.productsHere.length > 0 ? (
                        <div className="flex items-center text-rose-600"><ShieldAlert size={20} className="mr-2" /><span className="font-black text-lg uppercase">Ocupada</span></div>
                      ) : (
                        <div className="flex items-center text-emerald-600"><ShieldCheck size={20} className="mr-2" /><span className="font-black text-lg uppercase">Libre</span></div>
                      )}
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Configuración</p>
                      <span className="font-black text-lg text-slate-800 uppercase tracking-tight">Multi-SKU</span>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
                       <button onClick={() => setShowLocHistory(!showLocHistory)} className="flex items-center text-orange-600 hover:text-orange-700 font-bold transition-all"><History size={18} className="mr-2" /> {showLocHistory ? 'Stock' : 'Historial'}</button>
                    </div>
                  </div>
                  {!showLocHistory ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center">
                          <Package size={16} className="text-slate-400 mr-2" />
                          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Contenido actual</h3>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border shadow-sm">{selectedLocData.productsHere.length} Items</span>
                      </div>
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                          {selectedLocData.productsHere.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-8 py-5">
                                <p className="text-xs font-black text-orange-600">{p.sku}</p>
                                <p className="text-sm font-bold text-slate-800 uppercase leading-none mt-1">{p.descripcion}</p>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-3 py-1.5 rounded-lg">{p.cliente}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b">
                          <tr>
                            <th className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest">Fecha/Hora</th>
                            <th className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest">SKU</th>
                            <th className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest">Operación</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedLocData.locHistory.map((h, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-8 py-4 font-medium text-slate-500 opacity-60">{new Date(h.timestamp).toLocaleString()}</td>
                              <td className="px-8 py-4 font-bold text-slate-700">{h.sku}</td>
                              <td className="px-8 py-4">
                                <span className={`px-2 py-1 rounded-lg font-black text-[9px] uppercase border ${h.activo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>{h.activo ? 'Alta' : 'Baja'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {!loading && viewMode === 'admin' && currentUser.role === 'admin' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Panel Administrativo</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Sincronización con Base Única Zuiden</p>
                </div>
                <div className="relative">
                  <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="EAN, SKU o Ubicación..."
                    className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-5 w-full md:w-[450px] outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold text-sm shadow-sm"
                    value={adminSearchQuery}
                    onChange={e => setAdminSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificación</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Producto / Cliente</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Espacio / Rol</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                      <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminFilteredList.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 transition-colors ${!item.location.activo ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-orange-600">{item.product.sku}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-1 opacity-60 tracking-wider">{item.product.ean}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-slate-800 uppercase truncate max-w-[200px] leading-tight">{item.product.descripcion}</p>
                          <p className="text-[9px] font-black text-slate-400 uppercase mt-1 opacity-60">{item.product.cliente}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-2 rounded-xl font-black text-xs border ${item.location.activo ? 'bg-black text-white border-transparent shadow-sm' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                              {item.location.ubicacionId}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{item.location.rolUbicacion}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${
                            item.location.activo 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' 
                              : 'bg-rose-100 border-rose-200 text-rose-600 shadow-sm'
                          }`}>
                            {item.location.activo ? 'Activa' : 'Baja'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button
                            disabled={isAssigning}
                            onClick={() => handleToggleActive(item.product, item.location.ubicacionId, !item.location.activo)}
                            className={`px-5 py-2.5 rounded-xl font-black text-[10px] border transition-all shadow-sm ${
                              item.location.activo 
                                ? 'bg-white text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-transparent' 
                                : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-transparent'
                            }`}
                          >
                            {item.location.activo ? 'DESHABILITAR' : 'HABILITAR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
      <footer className="bg-white border-t border-slate-200 h-10 flex items-center justify-between px-8 shrink-0">
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Zuiden Fulfillment Systems • Mapper Pro v1.6
        </p>
        <div className="flex items-center gap-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase">{currentUser.label}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase">© 2024 Logística Inteligente</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
