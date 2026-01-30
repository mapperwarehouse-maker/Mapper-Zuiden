
export interface ProductLocation {
  ubicacionId: string;
  rolUbicacion: string;     // Picking / Rack / Pallet / etc
  prioridad: number;        // 1 = más importante
  activo: boolean;
}

export interface MapeoEntry {
  timestamp: string;
  usuario: string;
  ean: string;
  sku: string;
  descripcion: string;
  ubicacionId: string;
  rolUbicacion: string;
  prioridad: number;
  activo: boolean;
  motivo: string;
  observaciones: string;
}

export interface Product {
  id: string | number;
  sku: string;
  ean: string;
  descripcion: string;
  cliente: string;
  ubicaciones: ProductLocation[];
}

export interface LocationMaster {
  ubicacionId: string;
  deposito: string;
  pasillo: string;
  columna: string;
  nivel: string;
  tipo: string;     // Picking / Rack / etc
  activa: boolean;  // TRUE/FALSE
}

export type ViewMode = 'search' | 'assign' | 'locations' | 'admin';

export interface AppState {
  products: Product[];
  locations: LocationMaster[];
  mapeoHistory: MapeoEntry[];
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
}
