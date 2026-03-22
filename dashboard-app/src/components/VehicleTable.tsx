import { useState, useMemo, useEffect } from 'react';
import type { VehicleStats } from '../types';

interface VehicleTableProps {
  vehicles: VehicleStats[];
  onVehicleSelect?: (registration: string) => void;
  selectedRegistration?: string | null;
}

interface FilterState {
  searchTerm: string;
  minLevel: number;
  maxLevel: number;
  showOnlyWithEvents: boolean;
}

type SortColumn = 'registration' | 'driverLevel' | 'totalDistance' | 'maxSpeed' | 'eventCount' | 'status';

export const VehicleTable: React.FC<VehicleTableProps> = ({ vehicles, onVehicleSelect, selectedRegistration }) => {
  const PAGE_SIZE = 25;
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    minLevel: 0,
    maxLevel: 4,
    showOnlyWithEvents: false
  });
  const [page, setPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<SortColumn>('eventCount');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(vehicle => {
      if (filters.searchTerm) {
        const searchable = `${vehicle.registration} ${vehicle.vehicleName}`.toLowerCase();
        if (!searchable.includes(filters.searchTerm.toLowerCase())) {
          return false;
        }
      }
      if (vehicle.driverLevel < filters.minLevel || vehicle.driverLevel > filters.maxLevel) {
        return false;
      }
      if (filters.showOnlyWithEvents && vehicle.eventCount === 0) {
        return false;
      }
      return true;
    });
  }, [vehicles, filters]);

  const sortedVehicles = useMemo(() => {
    const sorted = [...filteredVehicles];

    sorted.sort((a, b) => {
      switch (sortColumn) {
        case 'registration':
          return sortDirection === 'asc'
            ? a.registration.localeCompare(b.registration)
            : b.registration.localeCompare(a.registration);
        case 'status':
          return sortDirection === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        default: {
          const delta = a[sortColumn] - b[sortColumn];
          return sortDirection === 'asc' ? delta : -delta;
        }
      }
    });

    return sorted;
  }, [filteredVehicles, sortColumn, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedVehicles.length / PAGE_SIZE));
  const paginatedVehicles = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedVehicles.slice(start, start + PAGE_SIZE);
  }, [sortedVehicles, page, totalPages]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const LevelBadge: React.FC<{ level: number }> = ({ level }) => {
    const configs: Record<number, { color: string; bg: string; icon: string; label: string }> = {
      0: { color: '#34d399', bg: 'rgba(52,211,153,0.1)', icon: '🏅', label: 'Excelencia' },
      1: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', icon: 'i', label: 'Nivel 1' },
      2: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', icon: '⚠', label: 'Nivel 2' },
      3: { color: '#fb923c', bg: 'rgba(251,146,60,0.1)', icon: '⚠', label: 'Nivel 3' },
      4: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', icon: '⛔', label: 'Nivel 4' },
    };
    
    const config = configs[level] || configs[0];
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}20`
      }} title={`Nivel ${level}: ${config.label}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'registration' || column === 'status' ? 'asc' : 'desc');
  };

  const sortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const searchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    vehicles.slice(0, 100).forEach((vehicle) => {
      suggestions.add(vehicle.registration);
      suggestions.add(vehicle.vehicleName);
    });
    return Array.from(suggestions).slice(0, 30);
  }, [vehicles]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '1rem',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          list="vehicle-search-suggestions"
          placeholder="Buscar vehículo..."
          value={filters.searchTerm}
          onChange={(e) => {
            setFilters({ ...filters, searchTerm: e.target.value });
            setPage(1);
          }}
          style={{ 
            flex: 1,
            minWidth: '200px',
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '0.5rem', 
            padding: '0.375rem 0.75rem', 
            color: 'white',
            outline: 'none'
          }}
          title="Busca por patente o nombre de vehículo"
        />
        <datalist id="vehicle-search-suggestions">
          {searchSuggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#cbd5e1', fontSize: '0.875rem' }} title="Filtra rango de nivel conductual según protocolo">Nivel:</span>
          <select
            value={filters.minLevel}
            onChange={(e) => {
              setFilters({ ...filters, minLevel: parseInt(e.target.value) });
              setPage(1);
            }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', color: 'white' }}
          >
            {[0,1,2,3,4].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <span style={{ color: '#cbd5e1' }}>a</span>
          <select
            value={filters.maxLevel}
            onChange={(e) => {
              setFilters({ ...filters, maxLevel: parseInt(e.target.value) });
              setPage(1);
            }}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.375rem', padding: '0.25rem 0.5rem', color: 'white' }}
          >
            {[0,1,2,3,4].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#cbd5e1' }}>
          <input
            type="checkbox"
            checked={filters.showOnlyWithEvents}
            onChange={(e) => {
              setFilters({ ...filters, showOnlyWithEvents: e.target.checked });
              setPage(1);
            }}
            style={{ accentColor: '#c084fc' }}
          />
          <span style={{ fontSize: '0.875rem' }} title="Muestra solo vehículos con al menos un evento de exceso">Solo con eventos</span>
        </label>
      </div>
      <div style={{ padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', color: '#cbd5e1', fontSize: '0.78rem' }}>
        Ordena haciendo click en las cabeceras. Esta tabla prioriza evaluación operacional por nivel y eventos de velocidad.
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <th onClick={() => handleSort('registration')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }} title="Ordenar por patente/nombre">Vehículo/PPU {sortIndicator('registration')}</th>
              <th onClick={() => handleSort('driverLevel')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }} title="Ordenar por nivel">Nivel {sortIndicator('driverLevel')}</th>
              <th onClick={() => handleSort('totalDistance')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }} title="Ordenar por distancia">Distancia {sortIndicator('totalDistance')}</th>
              <th onClick={() => handleSort('maxSpeed')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }} title="Ordenar por velocidad maxima">V. Máx {sortIndicator('maxSpeed')}</th>
              <th onClick={() => handleSort('eventCount')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }} title="Ordenar por cantidad de eventos">Eventos {sortIndicator('eventCount')}</th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', padding: '1rem 1.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }} title="Ordenar por estado">Estado {sortIndicator('status')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredVehicles.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#cbd5e1' }}>
                  No se encontraron vehículos
                </td>
              </tr>
            ) : (
              paginatedVehicles.map((vehicle) => (
                <tr 
                  key={vehicle.registration} 
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: selectedRegistration === vehicle.registration
                      ? 'rgba(192,132,252,0.12)'
                      : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => onVehicleSelect?.(vehicle.registration)}
                >
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 'bold', color: 'white' }}>{vehicle.registration}</span>
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{vehicle.vehicleName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <LevelBadge level={vehicle.driverLevel} />
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center', color: '#cbd5e1', fontWeight: 500 }}>
                    {vehicle.totalDistance.toFixed(1)} km
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: 'bold', color: vehicle.maxSpeed > 80 ? '#f87171' : '#34d399' }}>
                    {vehicle.maxSpeed.toFixed(0)} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.5 }}>km/h</span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.125rem', fontWeight: 'bold', color: vehicle.eventCount > 0 ? '#fbbf24' : '#64748b' }}>
                      {vehicle.eventCount}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.625rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: vehicle.status === 'Active' ? 'rgba(52,211,153,0.2)' : 'rgba(100,116,139,0.2)',
                      color: vehicle.status === 'Active' ? '#34d399' : '#64748b'
                    }}>
                      {vehicle.status === 'Active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
          Mostrando {filteredVehicles.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredVehicles.length)} de {filteredVehicles.length} vehículos filtrados ({vehicles.length} total)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: page === 1 ? '#64748b' : '#cbd5e1',
              cursor: page === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '0.75rem', color: '#cbd5e1', minWidth: '5.5rem', textAlign: 'center' }}>
            Página {page}/{totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '0.5rem',
              color: page === totalPages ? '#64748b' : '#cbd5e1',
              cursor: page === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Siguiente
          </button>
        </div>
        <button
          onClick={() => {
            setFilters({ searchTerm: '', minLevel: 0, maxLevel: 4, showOnlyWithEvents: false });
            setPage(1);
          }}
          style={{
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.5rem',
            color: '#cbd5e1',
            cursor: 'pointer'
          }}
        >
          Limpiar Filtros
        </button>
      </div>
    </div>
  );
};