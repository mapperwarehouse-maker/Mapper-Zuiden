
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
  LogOut,
  Eraser,
  ArrowUpDown,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Download
} from 'lucide-react';

import { fetchWarehouseData, fetchLocations, fetchMapeoHistory, appendMapeoRow } from './services/dataService';
import { LocationMaster, Product, ViewMode, MapeoEntry, ProductLocation } from './types';

// Definición de Usuarios y Roles
const USERS = [
  { username: 'Mapperadmin', password: 'Hudson2125', role: 'admin', label: 'Supervisor' },
  { username: 'Mapper', password: 'Zuiden26', role: 'operator', label: 'Operario Mapeo' },
  { username: 'Despacho', password: 'Zuiden26', role: 'operator', label: 'Operario Despacho' },
];

type SortConfig = {
  key: 'sku' | 'descripcion' | 'ubicacionId' | 'activo' | 'cliente';
  direction: 'asc' | 'desc';
} | null;

const App: React.FC = () => {
  // Login State
  const [currentUser, setCurrentUser] = useState<typeof USERS[0] | null>(null);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; prod: Product | null; locId: string; isBatch?: boolean; count?: number; batchItems?: {prod: Product, locId: string}[] } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedHistories, setExpandedHistories] = useState<Set<string>>(new Set());

  // Location Consult
  const [searchLocQuery, setSearchLocQuery] = useState<string>('');
  const [showLocHistory, setShowLocHistory] = useState(false);
  const [selectedForEmpty, setSelectedForEmpty] = useState<Set<string>>(new Set()); // Almacena SKUs seleccionados en Consultar Ubic

  // Assign
  const [scanProductCode, setScanProductCode] = useState<string>('');
  const [scanLocationCode, setScanLocationCode] = useState<string>('');
  const [assignObs, setAssignObs] = useState<string>('');
  const [assignStatus, setAssignStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Admin Search, Sort & Multi-select
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');
  const [adminSort, setAdminSort] = useState<SortConfig>({ key: 'ubicacionId', direction: 'asc' });
  const [adminSelectedIndices, setAdminSelectedIndices] = useState<Set<number>>(new Set());

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

  // Limpiar selección cuando cambia la ubicación consultada o la búsqueda en admin
  useEffect(() => {
    setSelectedForEmpty(new Set());
  }, [searchLocQuery]);

  useEffect(() => {
    setAdminSelectedIndices(new Set());
  }, [adminSearchQuery, viewMode]);

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
    setShowPassword(false);
  };

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
    let list = products.flatMap(p => 
      p.ubicaciones.map(u => ({ product: p, location: u }))
    );
    
    if (q) {
      list = list.filter(item => 
        item.product.sku.toLowerCase().includes(q) ||
        item.product.ean.toLowerCase().includes(q) ||
        item.product.descripcion.toLowerCase().includes(q) ||
        item.product.cliente.toLowerCase().includes(q) ||
        item.location.ubicacionId.toLowerCase().includes(q)
      );
    }

    if (adminSort) {
      list.sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        
        if (adminSort.key === 'sku') { valA = a.product.sku; valB = b.product.sku; }
        else if (adminSort.key === 'descripcion') { valA = a.product.descripcion; valB = b.product.descripcion; }
        else if (adminSort.key === 'cliente') { valA = a.product.cliente; valB = b.product.cliente; }
        else if (adminSort.key === 'ubicacionId') { valA = a.location.ubicacionId; valB = b.location.ubicacionId; }
        else if (adminSort.key === 'activo') { valA = a.location.activo ? 1 : 0; valB = b.location.activo ? 1 : 0; }

        if (typeof valA === 'string') {
          const res = valA.localeCompare(valB as string, undefined, { numeric: true, sensitivity: 'base' });
          return adminSort.direction === 'asc' ? res : -res;
        } else {
          const res = (valA as number) - (valB as number);
          return adminSort.direction === 'asc' ? res : -res;
        }
      });
    }

    return list;
  }, [products, adminSearchQuery, adminSort]);

  const requestAdminSort = (key: 'sku' | 'descripcion' | 'ubicacionId' | 'activo' | 'cliente') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (adminSort && adminSort.key === key && adminSort.direction === 'asc') {
      direction = 'desc';
    }
    setAdminSort({ key, direction });
  };

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
    if (!targetActive) {
      setConfirmModal({ show: true, prod, locId });
      return;
    }
    executeToggleActive(prod, locId, targetActive);
  };

  const toggleSelectForEmpty = (sku: string) => {
    const next = new Set(selectedForEmpty);
    if (next.has(sku)) next.delete(sku);
    else next.add(sku);
    setSelectedForEmpty(next);
  };

  const toggleSelectAllForEmpty = () => {
    if (!selectedLocData) return;
    if (selectedForEmpty.size === selectedLocData.productsHere.length) {
      setSelectedForEmpty(new Set());
    } else {
      const next = new Set(selectedLocData.productsHere.map(p => p.sku));
      setSelectedForEmpty(next);
    }
  };

  // --- Selección Admin ---
  const toggleAdminSelection = (index: number) => {
    const next = new Set(adminSelectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setAdminSelectedIndices(next);
  };

  const toggleSelectAllAdmin = () => {
    if (adminSelectedIndices.size === adminFilteredList.length) {
      setAdminSelectedIndices(new Set());
    } else {
      const next = new Set(adminFilteredList.map((_, i) => i));
      setAdminSelectedIndices(next);
    }
  };

  const handleBulkDisableAdmin = () => {
    const itemsToDisable = adminFilteredList
      .filter((item, i) => adminSelectedIndices.has(i) && item.location.activo)
      .map(item => ({ prod: item.product, locId: item.location.ubicacionId }));
    
    if (itemsToDisable.length === 0) return;

    setConfirmModal({
      show: true,
      prod: null,
      locId: 'Panel Admin',
      isBatch: true,
      count: itemsToDisable.length,
      batchItems: itemsToDisable
    });
  };

  const handleEmptySelectedRequest = () => {
    if (!selectedLocData || selectedForEmpty.size === 0) return;
    const items = selectedLocData.productsHere
      .filter(p => selectedForEmpty.has(p.sku))
      .map(p => ({ prod: p, locId: selectedLocData.loc.ubicacionId }));

    setConfirmModal({ 
      show: true, 
      prod: null, 
      locId: selectedLocData.loc.ubicacionId, 
      isBatch: true,
      count: selectedForEmpty.size,
      batchItems: items
    });
  };

  const executeBatchDeactivation = async (items: {prod: Product, locId: string}[]) => {
    setIsAssigning(true);
    try {
      for (const item of items) {
        await appendMapeoRow({
          Timestamp: new Date().toISOString(),
          Usuario: currentUser?.username || 'Sistema',
          EAN: item.prod.ean,
          SKU: item.prod.sku,
          Descripcion: item.prod.descripcion,
          UbicacionID: item.locId,
          RolUbicacion: item.prod.ubicaciones.find(u => u.ubicacionId === item.locId)?.rolUbicacion || 'Picking',
          Prioridad: 0,
          Activo: false,
          Motivo: 'Acción masiva/selectiva',
          Observaciones: 'Baja masiva por ' + currentUser?.username
        });
      }
      setSelectedForEmpty(new Set());
      setAdminSelectedIndices(new Set());
      await loadData();
    } finally {
      setIsAssigning(false);
      setConfirmModal(null);
    }
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
        Observaciones: 'Cambio de estado desde panel ' + (viewMode)
      });
      if (ok) await loadData();
    } finally {
      setIsAssigning(false);
      setConfirmModal(null);
    }
  };

  const handleExportExcel = () => {
    const headers = ['SKU', 'EAN', 'Descripcion', 'Cliente', 'Ubicacion', 'Rol', 'Estado'];
    const rows = adminFilteredList.map(item => [
      item.product.sku,
      item.product.ean,
      item.product.descripcion,
      item.product.cliente,
      item.location.ubicacionId,
      item.location.rolUbicacion,
      item.location.activo ? 'ACTIVA' : 'BAJA'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `mapeo_zuiden_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      setAssignStatus({ ok: false, msg: 'Falta cargar Rol en esa ubicación.' });
      return;
    }

    const alreadyThere = prod.ubicaciones.some(u => u.ubicacionId.toUpperCase() === locId && u.activo);
    if (alreadyThere) {
      setAssignStatus({ ok: false, msg: 'Ya está activo en esta ubicación.' });
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
                  type={showPassword ? "text" : "password"} 
                  value={loginForm.pass}
                  onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-white outline-none focus:ring-2 focus:ring-orange-500/50 transition-all font-bold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-orange-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
              <div className={`p-4 rounded-3xl mb-6 ${confirmModal.isBatch ? 'bg-orange-50 text-orange-500' : 'bg-rose-50 text-rose-500'}`}>
                {confirmModal.isBatch ? <Trash2 size={48} /> : <AlertTriangle size={48} />}
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase mb-4">
                {confirmModal.isBatch ? 'Acción por Lote' : 'Confirmación'}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
                {confirmModal.isBatch 
                  ? `¿Estás seguro de que deseas DESHABILITAR (${confirmModal.count}) registros seleccionados de la ubicación/panel?`
                  : `¿Estás seguro de que deseas DESHABILITAR este producto de la ubicación ${confirmModal.locId}?`
                }
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-4 rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (confirmModal.isBatch && confirmModal.batchItems) {
                      executeBatchDeactivation(confirmModal.batchItems);
                    } else if (confirmModal.prod) {
                      executeToggleActive(confirmModal.prod, confirmModal.locId, false);
                    }
                  }}
                  className={`flex-1 text-white font-black py-4 rounded-2xl shadow-lg transition-all ${confirmModal.isBatch ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
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
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">1. Escanear Producto</label>
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
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">2. Escanear Ubicación</label>
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
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 block text-center">3. Rol de Ubicación</label>
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
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">4. Observaciones</label>
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
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg border border-slate-200 text-slate-400"><Box size={14} /></div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[10px] font-black text-orange-600 leading-none">{p.sku}</p>
                                  <p className="text-[9px] font-mono text-slate-400 opacity-60">EAN: {p.ean}</p>
                                </div>
                                <p className="text-[11px] font-bold text-slate-800 uppercase truncate max-w-[120px]">{p.descripcion}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleToggleActive(p, scanLocationCode.toUpperCase(), false)}
                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Desvincular de esta ubicación"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
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
                                    <span className="text-[9px] font-black uppercase opacity-40 mr-2">{u.rolUbicacion}</span>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleActive(p, u.ubicacionId, false);
                                      }}
                                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                                      title="Desvincular ubicación"
                                    >
                                      <Trash2 size={14} />
                                    </button>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                       <button onClick={() => setShowLocHistory(!showLocHistory)} className="flex items-center text-orange-600 hover:text-orange-700 font-bold transition-all"><History size={18} className="mr-2" /> {showLocHistory ? 'Stock' : 'Historial'}</button>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                       <button 
                        disabled={selectedForEmpty.size === 0 || isAssigning}
                        onClick={handleEmptySelectedRequest} 
                        className="flex flex-col items-center text-rose-600 hover:text-rose-700 font-bold transition-all disabled:opacity-30"
                       >
                         <div className="flex items-center">
                            <Trash2 size={18} className="mr-2" /> Vaciar Sel.
                         </div>
                         {selectedForEmpty.size > 0 && <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded-full mt-1">({selectedForEmpty.size})</span>}
                       </button>
                    </div>
                  </div>
                  {!showLocHistory ? (
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center">
                          <Package size={16} className="text-slate-400 mr-2" />
                          <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Contenido actual</h3>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                              onClick={toggleSelectAllForEmpty}
                              className="text-[10px] font-black uppercase text-orange-600 hover:underline"
                            >
                              {selectedForEmpty.size === selectedLocData.productsHere.length ? 'Desmarcar todo' : 'Marcar todo'}
                            </button>
                            <span className="text-[10px] font-black text-slate-400 bg-white px-3 py-1 rounded-lg border shadow-sm">{selectedLocData.productsHere.length} Items</span>
                        </div>
                      </div>
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                          {selectedLocData.productsHere.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="pl-8 py-5 w-10">
                                <button 
                                  onClick={() => toggleSelectForEmpty(p.sku)}
                                  className={`p-1 rounded-md transition-all ${selectedForEmpty.has(p.sku) ? 'text-rose-500 bg-rose-50 shadow-sm' : 'text-slate-300 bg-slate-100 group-hover:text-slate-400'}`}
                                  title={selectedForEmpty.has(p.sku) ? "Quitar de selección" : "Marcar para eliminar"}
                                >
                                  <Trash2 size={20} />
                                </button>
                              </td>
                              <td className="px-6 py-5">
                                <p className="text-xs font-black text-orange-600">
                                  SKU: {p.sku} <span className="text-slate-400 font-mono ml-3">EAN: {p.ean}</span>
                                </p>
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
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-800">Panel Administrativo</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">Gestión Centralizada Zuiden</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {adminSelectedIndices.size > 0 && (
                    <button 
                      onClick={handleBulkDisableAdmin}
                      className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-5 rounded-2xl font-black text-sm shadow-lg shadow-rose-100 transition-all border border-rose-500/20 animate-in fade-in zoom-in"
                    >
                      <Trash2 size={18} /> Deshabilitar ({adminSelectedIndices.size})
                    </button>
                  )}
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-5 rounded-2xl font-black text-sm shadow-lg shadow-emerald-100 transition-all border border-emerald-500/20"
                  >
                    <Download size={18} /> Exportar Excel
                  </button>
                  <div className="relative">
                    <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Buscar SKU, Cliente..."
                      className="bg-white border border-slate-200 rounded-2xl pl-12 pr-6 py-5 w-full md:w-[350px] outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold text-sm shadow-sm"
                      value={adminSearchQuery}
                      onChange={e => setAdminSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-6 text-center w-12">
                        <button onClick={toggleSelectAllAdmin} className="p-1 rounded-md bg-white border border-slate-200 text-slate-300 hover:text-orange-500 transition-all">
                          {adminSelectedIndices.size === adminFilteredList.length ? <CheckSquare className="text-orange-500" size={20} /> : <Square size={20} />}
                        </button>
                      </th>
                      <th 
                        className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 group transition-all"
                        onClick={() => requestAdminSort('sku')}
                      >
                        <div className="flex items-center gap-2">
                          Identificación
                          <ArrowUpDown size={12} className={adminSort?.key === 'sku' ? 'text-orange-500' : 'opacity-0 group-hover:opacity-100'} />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 group transition-all"
                        onClick={() => requestAdminSort('descripcion')}
                      >
                        <div className="flex items-center gap-2">
                          Producto
                          <ArrowUpDown size={12} className={adminSort?.key === 'descripcion' ? 'text-orange-500' : 'opacity-0 group-hover:opacity-100'} />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 group transition-all"
                        onClick={() => requestAdminSort('cliente')}
                      >
                        <div className="flex items-center gap-2">
                          Cliente
                          <ArrowUpDown size={12} className={adminSort?.key === 'cliente' ? 'text-orange-500' : 'opacity-0 group-hover:opacity-100'} />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 group transition-all"
                        onClick={() => requestAdminSort('ubicacionId')}
                      >
                        <div className="flex items-center gap-2">
                          Ubicación
                          <ArrowUpDown size={12} className={adminSort?.key === 'ubicacionId' ? 'text-orange-500' : 'opacity-0 group-hover:opacity-100'} />
                        </div>
                      </th>
                      <th 
                        className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 group transition-all"
                        onClick={() => requestAdminSort('activo')}
                      >
                        <div className="flex items-center justify-center gap-2">
                          Estado
                          <ArrowUpDown size={12} className={adminSort?.key === 'activo' ? 'text-orange-500' : 'opacity-0 group-hover:opacity-100'} />
                        </div>
                      </th>
                      <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminFilteredList.map((item, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 transition-colors group ${!item.location.activo ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-4 py-6 text-center">
                          <button onClick={() => toggleAdminSelection(idx)} className={`p-1 rounded-md transition-all ${adminSelectedIndices.has(idx) ? 'text-orange-500' : 'text-slate-200 hover:text-slate-400'}`}>
                            {adminSelectedIndices.has(idx) ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-xs font-black text-orange-600">{item.product.sku}</p>
                          <p className="text-[9px] font-mono text-slate-400 mt-0.5 opacity-60">{item.product.ean}</p>
                        </td>
                        <td className="px-6 py-6">
                          <p className="text-sm font-bold text-slate-800 uppercase truncate max-w-[180px] leading-tight">{item.product.descripcion}</p>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{item.product.cliente}</span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-2 rounded-xl font-black text-xs border ${item.location.activo ? 'bg-black text-white border-transparent' : 'bg-rose-100 text-rose-800 border-rose-200'}`}>
                              {item.location.ubicacionId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all ${
                            item.location.activo 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                              : 'bg-rose-100 border-rose-200 text-rose-600'
                          }`}>
                            {item.location.activo ? 'Activa' : 'Baja'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <button
                            disabled={isAssigning}
                            onClick={() => handleToggleActive(item.product, item.location.ubicacionId, !item.location.activo)}
                            className={`px-5 py-2.5 rounded-xl font-black text-[10px] border transition-all ${
                              item.location.activo 
                                ? 'bg-white text-rose-600 border-rose-100 hover:bg-rose-600 hover:text-white hover:border-transparent' 
                                : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-transparent'
                            }`}
                          >
                            {item.location.activo ? 'BAJA' : 'ALTA'}
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
          Zuiden Fulfillment Systems • Mapper Pro v2.3
        </p>
        <div className="flex items-center gap-4">
          <p className="text-[9px] font-bold text-slate-400 uppercase">{currentUser ? currentUser.label : ''}</p>
          <p className="text-[9px] font-bold text-slate-300 uppercase">© 2024 Logística Inteligente</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
