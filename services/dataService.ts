
import { API_URL } from '../constants';
import { LocationMaster, Product, ProductLocation, MapeoEntry } from '../types';

async function fetchSheet(sheet: string): Promise<any[]> {
  const url = `${API_URL}?sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error cargando sheet ${sheet}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function pick(obj: any, keys: string[]) {
  for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k];
  return '';
}

function toBool(v: any): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'y' || v === true;
}

function toNum(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function fetchLocations(): Promise<LocationMaster[]> {
  const rows = await fetchSheet('UBICACIONES');
  return (rows || []).map((r: any) => ({
    ubicacionId: String(pick(r, ['UbicacionID', 'ubicacionId'])).trim(),
    deposito: String(pick(r, ['Deposito', 'deposito'])).trim(),
    pasillo: String(pick(r, ['Pasillo', 'pasillo'])).trim(),
    columna: String(pick(r, ['Columna', 'columna'])).trim(),
    nivel: String(pick(r, ['Nivel', 'nivel'])).trim(),
    tipo: String(pick(r, ['Tipo', 'tipo'])).trim(), 
    activa: toBool(pick(r, ['Activa', 'activa', 'Activo', 'activo']) ?? true),
  })).filter(x => x.ubicacionId);
}

export async function fetchMapeoHistory(): Promise<MapeoEntry[]> {
  const rows = await fetchSheet('MAPEO');
  return (rows || []).map(m => ({
    timestamp: String(pick(m, ['Timestamp', 'timestamp'])),
    usuario: String(pick(m, ['Usuario', 'usuario'])),
    ean: String(pick(m, ['EAN', 'ean'])),
    sku: String(pick(m, ['SKU', 'sku'])),
    descripcion: String(pick(m, ['Descripcion', 'descripcion'])),
    ubicacionId: String(pick(m, ['UbicacionID', 'ubicacionId'])),
    rolUbicacion: String(pick(m, ['RolUbicacion', 'rolUbicacion'])),
    prioridad: toNum(pick(m, ['Prioridad', 'prioridad'])),
    activo: toBool(pick(m, ['Activo', 'activo'])),
    motivo: String(pick(m, ['Motivo', 'motivo'])),
    observaciones: String(pick(m, ['Observaciones', 'observaciones'])),
  })).reverse(); 
}

export async function fetchWarehouseData(): Promise<Product[]> {
  const productos = await fetchSheet('PRODUCTOS');
  const mapeo = await fetchSheet('MAPEO');

  const stateMap = new Map<string, ProductLocation>();

  for (const m of (mapeo || [])) {
    const sku = String(pick(m, ['SKU', 'sku'])).trim();
    const locId = String(pick(m, ['UbicacionID', 'ubicacionId'])).trim();
    const activo = toBool(pick(m, ['Activo', 'activo']));
    const key = `${sku}|${locId}`;

    const rol = String(pick(m, ['RolUbicacion', 'rolUbicacion'])).trim() || 'Picking';
    // Ignoramos la prioridad cargada en la columna H
    const prioridad = 0; 

    stateMap.set(key, {
      ubicacionId: locId,
      rolUbicacion: rol,
      prioridad,
      activo
    });
  }

  return (productos || []).map((p: any, idx: number) => {
    const sku = String(pick(p, ['SKU', 'sku'])).trim();
    const ean = String(pick(p, ['EAN', 'ean'])).trim();
    
    const activeLocs: ProductLocation[] = [];
    stateMap.forEach((val, key) => {
      if (key.startsWith(`${sku}|`) && val.activo) {
        activeLocs.push(val);
      }
    });

    if (activeLocs.length === 0) {
      const defLoc = String(pick(p, ['UbicacionID', 'Ubicacion', 'ubicacion'])).trim();
      if (defLoc) {
        activeLocs.push({ ubicacionId: defLoc, rolUbicacion: 'Picking', prioridad: 0, activo: true });
      }
    }

    return {
      id: String(pick(p, ['id']) || idx),
      sku,
      ean,
      descripcion: String(pick(p, ['Descripcion', 'descripcion'])) || '',
      cliente: String(pick(p, ['Cliente', 'cliente'])) || '',
      ubicaciones: activeLocs,
    } as Product;
  });
}

export async function appendMapeoRow(row: Record<string, any>): Promise<boolean> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ sheet: 'MAPEO', row }),
  });
  if (!res.ok) return false;
  const data = await res.json().catch(() => ({}));
  return Boolean((data as any).ok);
}
