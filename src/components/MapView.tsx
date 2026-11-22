import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  CheckCircle2,
  Clock,
  Coins,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Plus,
  QrCode,
  RotateCcw,
  Route as RouteIcon,
  Search,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react';
import { COLLECTION_POINTS, WASTE_CATEGORIES } from '../data/ecotechData';
import type { CollectionPoint, DropOffRecord, WasteCategoryId } from '../types';

const PALMAS_CENTER: google.maps.LatLngLiteral = {
  lat: -10.1844,
  lng: -48.3336,
};

interface PalmasPlacePoint {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  location: google.maps.LatLngLiteral;
  rating?: number | null;
  userRatingCount?: number | null;
  isOpen?: boolean | null;
  coinsPerKg: number;
}

interface CheckinTarget {
  id: string;
  name: string;
  neighborhood: string;
  coinsPerKg: number;
  acceptedCategories?: WasteCategoryId[];
}

interface RouteSummary {
  distanceKm: string;
  durationMin: number;
}

interface MapViewProps {
  mapsApiKey: string;
  isDark: boolean;
  initialCategory?: WasteCategoryId | 'all';
  onRegisterDropOff: (
    pointId: string,
    pointName: string,
    pointNeighborhood: string,
    category: WasteCategoryId,
    weightKg: number
  ) => Promise<{ record: DropOffRecord; unlocks: string[] }>;
}

const CATEGORY_SEARCH_QUERIES: Record<WasteCategoryId | 'all', string> = {
  all: 'reciclagem lixo eletronico ecoponto Palmas TO',
  pilhas: 'coleta pilhas baterias farmacia supermercado Palmas TO',
  celulares: 'assistencia tecnica celular eletronicos Palmas TO',
  computadores: 'loja informatica computadores manutencao Palmas TO',
  monitores: 'assistencia tecnica tv eletronica Palmas TO',
  eletrodomesticos: 'assistencia eletrodomesticos reciclagem Palmas TO',
  lampadas: 'materiais eletricos lampadas construcao Palmas TO',
};

function isQuotaError(err: unknown): boolean {
  const msg = String(err || '');
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('QuotaExceeded')
  );
}

function estimateLocalTravelMinutes(
  distanceKm: number,
  mode: 'DRIVING' | 'WALKING' | 'BICYCLING'
): number {
  if (mode === 'WALKING') return Math.max(6, Math.round(distanceKm * 12.5));
  if (mode === 'BICYCLING') return Math.max(4, Math.round(distanceKm * 5.2));
  return Math.max(3, Math.round(distanceKm * 3.4));
}

interface PalmasMarkerProps {
  place: PalmasPlacePoint;
  isSelected: boolean;
  onSelect: (place: PalmasPlacePoint) => void;
  onRouteTo: (place: PalmasPlacePoint) => void;
  onOpenCheckin: (place: PalmasPlacePoint) => void;
}

const PalmasMarker: React.FC<PalmasMarkerProps> = ({
  place,
  isSelected,
  onSelect,
  onRouteTo,
  onOpenCheckin,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.location}
        title={place.name}
        onClick={() => onSelect(place)}
      >
        <Pin
          background={isSelected ? '#F59E0B' : '#0F9D58'}
          borderColor={isSelected ? '#B45309' : '#065F46'}
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.22 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow
          anchor={marker}
          maxWidth={260}
          onCloseClick={() => onSelect(place)}
        >
          <div className="p-1 text-slate-900 space-y-1.5">
            <p className="font-bold text-sm leading-snug">{place.name}</p>
            <p className="text-xs text-slate-600">{place.address}</p>
            {place.rating != null && (
              <p className="text-xs text-amber-600 font-semibold">
                ★ {place.rating.toFixed(1)}{' '}
                {place.userRatingCount ? `(${place.userRatingCount})` : ''}
              </p>
            )}
            <div className="flex items-center gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => onRouteTo(place)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-semibold cursor-pointer"
              >
                Traçar rota
              </button>
              <button
                type="button"
                onClick={() => onOpenCheckin(place)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0F9D58] text-white text-[11px] font-semibold cursor-pointer"
              >
                Check-in
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface PalmasMapInnerProps {
  isDark: boolean;
  filterCategory: WasteCategoryId | 'all';
  searchTriggerText: string;
  userOrigin: google.maps.LatLngLiteral;
  placesList: PalmasPlacePoint[];
  setPlacesList: React.Dispatch<React.SetStateAction<PalmasPlacePoint[]>>;
  selectedPlace: PalmasPlacePoint | null;
  setSelectedPlace: React.Dispatch<React.SetStateAction<PalmasPlacePoint | null>>;
  routeDestination: PalmasPlacePoint | null;
  travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING';
  onRouteComputed: (summary: RouteSummary | null, error: string | null) => void;
  onPlacesLoading: (loading: boolean) => void;
  onPlacesError: (err: string | null) => void;
  onOpenCheckin: (place: PalmasPlacePoint) => void;
  onRequestRoute: (place: PalmasPlacePoint) => void;
}

const PalmasMapInner: React.FC<PalmasMapInnerProps> = ({
  isDark,
  filterCategory,
  searchTriggerText,
  userOrigin,
  placesList,
  setPlacesList,
  selectedPlace,
  setSelectedPlace,
  routeDestination,
  travelMode,
  onRouteComputed,
  onPlacesLoading,
  onPlacesError,
  onOpenCheckin,
  onRequestRoute,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const routesLib = useMapsLibrary('routes');
  const coreLib = useMapsLibrary('core');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!placesLib || !coreLib) return;

    let cancelled = false;
    const query = searchTriggerText.trim()
      ? `${searchTriggerText.trim()} Palmas TO`
      : CATEGORY_SEARCH_QUERIES[filterCategory];

    onPlacesLoading(true);
    onPlacesError(null);

    const request: google.maps.places.SearchByTextRequest = {
      textQuery: query,
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'businessStatus',
      ],
      locationBias: {
        center: userOrigin,
        radius: 18000,
      },
      language: 'pt-BR',
      region: 'br',
      maxResultCount: 10,
    };

    placesLib.Place.searchByText(request)
      .then(({ places }) => {
        if (cancelled) return;
        const mapped: PalmasPlacePoint[] = (places || [])
          .filter((p) => p.location != null)
          .map((p, idx) => ({
            id: p.id || `palmas-pt-${idx}`,
            name: p.displayName || 'Ponto em Palmas',
            address: p.formattedAddress || 'Palmas - TO',
            location: {
              lat: p.location!.lat(),
              lng: p.location!.lng(),
            },
            rating: p.rating ?? null,
            userRatingCount: p.userRatingCount ?? null,
            isOpen: p.businessStatus === 'OPERATIONAL',
            coinsPerKg: 40 + (idx % 3) * 5,
          }));

        setPlacesList(mapped);
        if (mapped.length > 0) {
          setSelectedPlace(mapped[0]);
          if (map) {
            const bounds = new coreLib.LatLngBounds();
            bounds.extend(userOrigin);
            mapped.forEach((m) => bounds.extend(m.location));
            map.fitBounds(bounds, 56);
          }
        } else {
          setSelectedPlace(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onPlacesError('Não foi possível consultar novos locais no momento.');
      })
      .finally(() => {
        if (!cancelled) onPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    placesLib,
    coreLib,
    map,
    filterCategory,
    searchTriggerText,
    userOrigin,
    onPlacesLoading,
    onPlacesError,
    setPlacesList,
    setSelectedPlace,
  ]);

  useEffect(() => {
    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    if (!routesLib || !map || !routeDestination) {
      onRouteComputed(null, null);
      return;
    }

    let cancelled = false;

    const request = {
      origin: userOrigin,
      destination: routeDestination.location,
      travelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport'],
    };

    const RouteCtor = routesLib.Route as unknown as {
      computeRoutes?: (req: unknown) => Promise<{ routes?: unknown[] }>;
    };

    if (typeof RouteCtor?.computeRoutes !== 'function') {
      onRouteComputed(null, 'Serviço de rotas indisponível neste canal.');
      return;
    }

    RouteCtor.computeRoutes(request)
      .then((res) => {
        if (cancelled) return;
        const primaryRoute = res?.routes?.[0] as
          | {
              createPolylines?: () => google.maps.Polyline[];
              viewport?: google.maps.LatLngBounds;
              distanceMeters?: number;
              durationMillis?: number;
            }
          | undefined;

        if (!primaryRoute) {
          onRouteComputed(null, 'Nenhuma rota encontrada até este ponto.');
          return;
        }

        if (typeof primaryRoute.createPolylines === 'function') {
          const lines = primaryRoute.createPolylines();
          lines.forEach((line) => {
            line.setOptions({
              strokeColor: '#0F9D58',
              strokeWeight: 5,
              strokeOpacity: 0.92,
            });
            line.setMap(map);
          });
          polylinesRef.current = lines;
        }

        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport, 64);
        }

        onRouteComputed(
          {
            distanceKm: ((primaryRoute.distanceMeters ?? 0) / 1000).toFixed(1),
            durationMin: Math.max(1, Math.round((primaryRoute.durationMillis ?? 0) / 60000)),
          },
          null
        );
      })
      .catch((err) => {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        onRouteComputed(null, 'Não foi possível calcular a rota.');
      });

    return () => {
      cancelled = true;
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, userOrigin, routeDestination, travelMode, onRouteComputed]);

  return (
    <GoogleMap
      mapId="DEMO_MAP_ID"
      defaultCenter={PALMAS_CENTER}
      defaultZoom={13}
      gestureHandling="greedy"
      colorScheme={isDark ? 'DARK' : 'LIGHT'}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '100%' }}
    >
      <AdvancedMarker position={userOrigin} title="Sua localização em Palmas">
        <div className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
      </AdvancedMarker>

      {placesList.map((pl) => (
        <PalmasMarker
          key={pl.id}
          place={pl}
          isSelected={selectedPlace?.id === pl.id}
          onSelect={(p) => setSelectedPlace(p)}
          onRouteTo={onRequestRoute}
          onOpenCheckin={onOpenCheckin}
        />
      ))}
    </GoogleMap>
  );
};

interface AutocompleteSearchBoxProps {
  value: string;
  onChange: (v: string) => void;
  onSubmitSearch: (query: string) => void;
  onSelectSuggestionCenter: (loc: google.maps.LatLngLiteral, label: string) => void;
}

const PalmasAutocompleteSearch: React.FC<AutocompleteSearchBoxProps> = ({
  value,
  onChange,
  onSubmitSearch,
  onSelectSuggestionCenter,
}) => {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!placesLib || value.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: value,
        sessionToken: sessionTokenRef.current!,
        locationBias: {
          center: PALMAS_CENTER,
          radius: 25000,
        },
        language: 'pt-BR',
        region: 'br',
      })
        .then((res) => {
          if (!cancelled) {
            setSuggestions(res.suggestions || []);
            setOpen(true);
          }
        })
        .catch((err) => {
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
        });
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, value]);

  const handlePickSuggestion = async (
    sug: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!sug.placePrediction) return;
    try {
      const place = sug.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const label = sug.placePrediction.text.text;
      onChange(label);
      setOpen(false);
      sessionTokenRef.current = null;
      if (place.location) {
        onSelectSuggestionCenter(
          { lat: place.location.lat(), lng: place.location.lng() },
          label
        );
      } else {
        onSubmitSearch(label);
      }
    } catch (err) {
      if (isQuotaError(err)) {
        window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
      }
    }
  };

  return (
    <div className="relative w-full md:w-96">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setOpen(false);
          onSubmitSearch(value);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setOpen(true)}
            placeholder="Quadra, avenida ou local em Palmas - TO..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold cursor-pointer min-h-[40px] shrink-0"
        >
          Buscar
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <li key={idx}>
              <button
                type="button"
                onClick={() => handlePickSuggestion(s)}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer"
              >
                {s.placePrediction?.text.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ApiStatusBanner: React.FC = () => {
  const status = useApiLoadingStatus();
  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs px-4 py-3 rounded-xl">
        Não foi possível carregar o Google Maps no momento. Verifique a chave ou cota da API.
      </div>
    );
  }
  return null;
};

interface LocalMapSectionProps {
  isDark: boolean;
  initialCategory: WasteCategoryId | 'all';
  onOpenCheckin: (target: CheckinTarget, preferredCategory?: WasteCategoryId) => void;
}

const LocalMapSection: React.FC<LocalMapSectionProps> = ({
  isDark,
  initialCategory,
  onOpenCheckin,
}) => {
  const [filterCategory, setFilterCategory] = useState<WasteCategoryId | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPointId, setSelectedPointId] = useState<string>(
    COLLECTION_POINTS[0]?.id || ''
  );
  const [routeTargetId, setRouteTargetId] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'BICYCLING'>('DRIVING');
  const [zoom, setZoom] = useState(1);
  const [userPos, setUserPos] = useState<{ x: number; y: number }>({ x: 46, y: 52 });
  const [gpsStatus, setGpsStatus] = useState<string>('Localização de referência ativa');

  useEffect(() => {
    setFilterCategory(initialCategory);
  }, [initialCategory]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return COLLECTION_POINTS.filter((pt) => {
      const catMatch =
        filterCategory === 'all' || pt.acceptedCategories.includes(filterCategory);
      if (!catMatch) return false;
      if (!q) return true;
      const catLabels = pt.acceptedCategories
        .map((cid) => WASTE_CATEGORIES.find((c) => c.id === cid)?.label.toLowerCase() || '')
        .join(' ');
      return (
        pt.name.toLowerCase().includes(q) ||
        pt.neighborhood.toLowerCase().includes(q) ||
        pt.address.toLowerCase().includes(q) ||
        catLabels.includes(q)
      );
    });
  }, [filterCategory, searchQuery]);

  const selectedPoint: CollectionPoint | null =
    filteredPoints.find((p) => p.id === selectedPointId) || filteredPoints[0] || null;

  const routeTarget: CollectionPoint | null = routeTargetId
    ? COLLECTION_POINTS.find((p) => p.id === routeTargetId) || null
    : null;

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setUserPos({ x: 46, y: 52 });
      setGpsStatus('Centralizado no ponto de referência');
      return;
    }
    setGpsStatus('Obtendo GPS...');
    navigator.geolocation.getCurrentPosition(
      () => {
        setUserPos({ x: 48, y: 50 });
        setGpsStatus('GPS atualizado com sucesso');
      },
      () => {
        setUserPos({ x: 46, y: 52 });
        setGpsStatus('Usando localização de referência');
      },
      { timeout: 4000 }
    );
  };

  const openCheckinForLocalPoint = (pt: CollectionPoint) => {
    const preferred =
      filterCategory !== 'all' && pt.acceptedCategories.includes(filterCategory)
        ? filterCategory
        : pt.acceptedCategories[0];
    onOpenCheckin(
      {
        id: pt.id,
        name: pt.name,
        neighborhood: pt.neighborhood,
        coinsPerKg: pt.coinsPerKg,
        acceptedCategories: pt.acceptedCategories,
      },
      preferred
    );
  };

  return (
    <div className="space-y-5">
      {/* Header & Search / Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
              Mapa de Coleta EcoTech
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Explore os ecopontos parceiros, filtre por tipo de eletrônico, trace sua rota e faça check-in para ganhar EcoCoins.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ecoponto, bairro ou item..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleUseMyLocation}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-h-[40px] whitespace-nowrap"
            >
              <LocateFixed className="w-4 h-4 text-emerald-600" />
              Meu GPS
            </button>
          </div>
        </div>

        {/* Specific E-Waste Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
              filterCategory === 'all'
                ? 'bg-[#0F9D58] text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos os pontos ({COLLECTION_POINTS.length})
          </button>
          {WASTE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                filterCategory === cat.id
                  ? 'bg-[#0F9D58] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Local Map Canvas + Points List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative h-[460px] lg:h-[580px] bg-[#EAF2EE] dark:bg-[#0B1713] select-none">
          {/* Map Controls (Zoom & Recenter) */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
              aria-label="Aumentar zoom"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, Number((z - 0.15).toFixed(2))))}
              aria-label="Diminuir zoom"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRouteTargetId(null);
              }}
              aria-label="Resetar visualização"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top-left GPS Pill */}
          <div className="absolute top-4 left-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{gpsStatus}</span>
          </div>

          {/* Scalable Map Layer */}
          <div
            className="w-full h-full relative transition-transform duration-300 ease-out origin-center"
            style={{ transform: `scale(${zoom})` }}
          >
            {/* Stylized Vector Street & Park Backdrop */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="w-full h-full absolute inset-0 pointer-events-none"
              aria-hidden="true"
            >
              <rect
                x="0"
                y="0"
                width="100"
                height="100"
                fill={isDark ? '#0B1713' : '#EAF2EE'}
              />
              {/* Green Park Areas */}
              <path
                d="M 42 70 Q 56 64 66 78 Q 58 92 40 88 Z"
                fill={isDark ? '#102A20' : '#CBEAD7'}
              />
              <path
                d="M 12 18 Q 28 12 36 26 Q 22 36 10 28 Z"
                fill={isDark ? '#102A20' : '#D3EFE0'}
              />
              <circle
                cx="82"
                cy="20"
                r="9"
                fill={isDark ? '#102A20' : '#D3EFE0'}
              />

              {/* Secondary Street Grid */}
              <g
                stroke={isDark ? '#173026' : '#D8E5DF'}
                strokeWidth="0.45"
                fill="none"
              >
                {[12, 24, 36, 48, 60, 72, 84].map((pos) => (
                  <React.Fragment key={pos}>
                    <line x1={pos} y1="0" x2={pos} y2="100" />
                    <line x1="0" y1={pos} x2="100" y2={pos} />
                  </React.Fragment>
                ))}
              </g>

              {/* Major Avenues */}
              <g
                stroke={isDark ? '#214235' : '#FFFFFF'}
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              >
                <path d="M 0 46 Q 48 42 100 32" />
                <path d="M 22 0 Q 28 52 24 100" />
                <path d="M 52 0 L 64 100" />
                <path d="M 0 74 Q 52 68 100 82" />
              </g>

              {/* Avenue Centerlines */}
              <g
                stroke={isDark ? '#2B5645' : '#CBDAD3'}
                strokeWidth="0.3"
                strokeDasharray="1.5 1.5"
                fill="none"
              >
                <path d="M 0 46 Q 48 42 100 32" />
                <path d="M 52 0 L 64 100" />
              </g>

              {/* Neighborhood Subtle Labels */}
              <g
                fill={isDark ? '#4F7A68' : '#6F8E7F'}
                fontSize="2.5"
                fontWeight="600"
                letterSpacing="0.2"
              >
                <text x="27" y="21">HIGIENÓPOLIS</text>
                <text x="64" y="29">LIBERDADE</text>
                <text x="14" y="43">PINHEIROS</text>
                <text x="41" y="38">BELA VISTA</text>
                <text x="63" y="60">VILA MARIANA</text>
                <text x="46" y="87">MOEMA</text>
              </g>

              {/* Active Route Path */}
              {routeTarget && (
                <>
                  <path
                    d={`M ${userPos.x} ${userPos.y} L ${routeTarget.mapX} ${userPos.y} L ${routeTarget.mapX} ${routeTarget.mapY}`}
                    stroke="#0F9D58"
                    strokeWidth="1.5"
                    strokeOpacity="0.28"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d={`M ${userPos.x} ${userPos.y} L ${routeTarget.mapX} ${userPos.y} L ${routeTarget.mapX} ${routeTarget.mapY}`}
                    stroke="#0F9D58"
                    strokeWidth="0.95"
                    strokeDasharray="2.2 1.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="none"
                  />
                </>
              )}
            </svg>

            {/* User Reference Pin */}
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
              style={{ left: `${userPos.x}%`, top: `${userPos.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-8 h-8 rounded-full bg-blue-500/25 animate-ping" />
                <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md" />
                <span className="absolute top-5 px-2 py-0.5 rounded-md bg-slate-900/90 text-white text-[10px] font-semibold whitespace-nowrap shadow">
                  Você
                </span>
              </div>
            </div>

            {/* Interactive Ecoponto Pins */}
            {filteredPoints.map((pt) => {
              const isSelected = selectedPoint?.id === pt.id;
              const isRouteDest = routeTarget?.id === pt.id;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setSelectedPointId(pt.id)}
                  style={{ left: `${pt.mapX}%`, top: `${pt.mapY}%` }}
                  className="absolute -translate-x-1/2 -translate-y-full z-10 group cursor-pointer focus:outline-none"
                  aria-label={`Selecionar ${pt.name}`}
                >
                  <div
                    className={`flex flex-col items-center transition-transform ${
                      isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-md mb-1 whitespace-nowrap transition-opacity ${
                        isSelected || isRouteDest
                          ? 'bg-slate-900 text-white opacity-100'
                          : 'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {pt.neighborhood}
                    </div>
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 ${
                        isSelected
                          ? 'bg-amber-500 border-white text-white'
                          : 'bg-[#0F9D58] border-white text-white'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Point Quick Floating Card (when no route summary overlaps) */}
          {selectedPoint && !routeTarget && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-sm text-slate-900 dark:text-white truncate">
                    {selectedPoint.name}
                  </p>
                  <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                    ★ {selectedPoint.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {selectedPoint.address} · {selectedPoint.hours}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setRouteTargetId(selectedPoint.id)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  Traçar rota
                </button>
                <button
                  type="button"
                  onClick={() => openCheckinForLocalPoint(selectedPoint)}
                  className="px-3.5 py-2 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-semibold cursor-pointer min-h-[40px]"
                >
                  Check-in
                </button>
              </div>
            </div>
          )}

          {/* Active Route Summary Bar */}
          {routeTarget && (
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-300 dark:border-emerald-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    Rota até {routeTarget.name}: {routeTarget.distanceKm.toFixed(1)} km ·{' '}
                    {estimateLocalTravelMinutes(routeTarget.distanceKm, travelMode)} min
                  </span>
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {routeTarget.address}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={travelMode}
                  onChange={(e) =>
                    setTravelMode(e.target.value as 'DRIVING' | 'WALKING' | 'BICYCLING')
                  }
                  className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                  aria-label="Modo de transporte"
                >
                  <option value="DRIVING">Carro</option>
                  <option value="WALKING">A pé</option>
                  <option value="BICYCLING">Bicicleta</option>
                </select>
                <button
                  type="button"
                  onClick={() => openCheckinForLocalPoint(routeTarget)}
                  className="px-3.5 py-2 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-semibold cursor-pointer min-h-[40px]"
                >
                  Registrar Descarte
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collection Points List */}
        <div className="lg:col-span-5 space-y-3 max-h-[580px] overflow-y-auto pr-1">
          {filteredPoints.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
              <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-display font-bold text-slate-900 dark:text-white">
                Nenhum ponto encontrado para esta busca
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tente limpar o filtro ou escolher outra categoria de lixo eletrônico.
              </p>
            </div>
          ) : (
            filteredPoints.map((pt) => {
              const isSelected = selectedPoint?.id === pt.id;
              return (
                <div
                  key={pt.id}
                  onClick={() => setSelectedPointId(pt.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedPointId(pt.id);
                  }}
                  className={`rounded-2xl border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm truncate">
                          {pt.name}
                        </h3>
                        {pt.verifiedPartner && (
                          <ShieldCheck
                            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                            aria-label="Parceiro verificado"
                          />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {pt.address} · {pt.neighborhood}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {pt.hours} ·{' '}
                        <span className="font-mono">{pt.distanceKm.toFixed(1)} km</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                      <Star className="w-3.5 h-3.5" /> {pt.rating.toFixed(1)}
                    </span>
                  </div>

                  {/* Accepted Category Tags */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pt.acceptedCategories.map((catId) => {
                      const cat = WASTE_CATEGORIES.find((c) => c.id === catId);
                      if (!cat) return null;
                      return (
                        <span
                          key={catId}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            filterCategory === catId
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {cat.shortLabel}
                        </span>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      +{pt.coinsPerKg} moedas/kg
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPointId(pt.id);
                          setRouteTargetId(pt.id);
                        }}
                        className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer min-h-[38px]"
                      >
                        <RouteIcon className="w-3.5 h-3.5" /> Rota
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCheckinForLocalPoint(pt);
                        }}
                        className="px-3.5 py-2 rounded-lg bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-semibold transition-colors cursor-pointer min-h-[38px]"
                      >
                        Check-in
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const MapView: React.FC<MapViewProps> = ({
  mapsApiKey,
  isDark,
  initialCategory = 'all',
  onRegisterDropOff,
}) => {
  const [filterCategory, setFilterCategory] = useState<WasteCategoryId | 'all'>(initialCategory);
  const [searchInput, setSearchInput] = useState('');
  const [searchTriggerText, setSearchTriggerText] = useState('');
  const [userOrigin, setUserOrigin] = useState<google.maps.LatLngLiteral>(PALMAS_CENTER);
  const [originLabel, setOriginLabel] = useState('Centro · Praça dos Girassóis, Palmas');
  const [placesList, setPlacesList] = useState<PalmasPlacePoint[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PalmasPlacePoint | null>(null);
  const [routeDestination, setRouteDestination] = useState<PalmasPlacePoint | null>(null);
  const [travelMode, setTravelMode] = useState<'DRIVING' | 'WALKING' | 'BICYCLING'>('DRIVING');
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Shared Drop-off modal state
  const [checkinTarget, setCheckinTarget] = useState<CheckinTarget | null>(null);
  const [dropCategory, setDropCategory] = useState<WasteCategoryId>(
    initialCategory === 'all' ? 'pilhas' : initialCategory
  );
  const [weightKg, setWeightKg] = useState<number>(1.5);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ record: DropOffRecord; unlocks: string[] } | null>(null);

  useEffect(() => {
    setFilterCategory(initialCategory);
    if (initialCategory !== 'all') {
      setDropCategory(initialCategory);
    }
  }, [initialCategory]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setPlacesError('Geolocalização não suportada neste navegador.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserOrigin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setOriginLabel('Sua localização atual (GPS)');
      },
      () => {
        setUserOrigin(PALMAS_CENTER);
        setOriginLabel('Centro · Praça dos Girassóis, Palmas');
      }
    );
  };

  const handleRouteComputed = useCallback(
    (summary: RouteSummary | null, err: string | null) => {
      setRouteSummary(summary);
      setRouteError(err);
    },
    []
  );

  const openCheckinModal = useCallback(
    (target: CheckinTarget, preferredCategory?: WasteCategoryId) => {
      setCheckinTarget(target);
      setDropCategory(
        preferredCategory || (filterCategory === 'all' ? 'pilhas' : filterCategory)
      );
      setErrorMsg(null);
      setReceipt(null);
    },
    [filterCategory]
  );

  const openCheckinForPlace = (place: PalmasPlacePoint) => {
    openCheckinModal({
      id: place.id,
      name: place.name,
      neighborhood: place.neighborhood || 'Palmas - TO',
      coinsPerKg: place.coinsPerKg,
    });
  };

  const selectedCatMeta = WASTE_CATEGORIES.find((c) => c.id === dropCategory);
  const previewCoins = checkinTarget
    ? Math.round(weightKg * checkinTarget.coinsPerKg + (selectedCatMeta?.coinsBonus || 35))
    : 0;
  const previewXp = Math.round(weightKg * 35 + 40);

  const handleConfirmDropOff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkinTarget) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await onRegisterDropOff(
        checkinTarget.id,
        checkinTarget.name,
        checkinTarget.neighborhood,
        dropCategory,
        weightKg
      );
      setReceipt(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao registrar descarte.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCheckinModal = () =>
    checkinTarget && (
      <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
          {receipt ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Descarte Confirmado!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {receipt.record.pointName} · {receipt.record.weightKg} kg
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl p-4 flex items-center justify-around">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Moedas ganhas</p>
                  <p className="font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    +{receipt.record.coinsEarned}
                  </p>
                </div>
                <div className="h-8 w-px bg-emerald-200 dark:bg-emerald-800" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Experiência</p>
                  <p className="font-display text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                    +{receipt.record.xpEarned} XP
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-2.5 px-4 rounded-xl">
                <QrCode className="w-4 h-4" />
                Comprovante: {receipt.record.code}
              </div>

              {receipt.unlocks.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  {receipt.unlocks.join(' ')}
                </div>
              )}

              <button
                type="button"
                onClick={() => setCheckinTarget(null)}
                className="w-full py-3 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white font-semibold text-sm cursor-pointer min-h-[44px]"
              >
                Concluir
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmDropOff} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    Registrar Descarte EcoTech
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {checkinTarget.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCheckinTarget(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 py-1 cursor-pointer"
                >
                  Fechar
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl">
                  {errorMsg}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Tipo de lixo eletrônico entregue
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {WASTE_CATEGORIES.map((cat) => {
                    const active = dropCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setDropCategory(cat.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                          active
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div>{cat.shortLabel}</div>
                        <div className="text-[11px] opacity-75 font-mono">
                          +{cat.coinsBonus} bônus
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Peso estimado da entrega
                  </label>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {weightKg.toFixed(1)} kg
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full accent-[#0F9D58]"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Recompensa prevista</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  +{previewCoins} moedas · +{previewXp} XP
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-[#0F9D58] hover:bg-[#0C854A] text-white font-semibold text-sm transition-colors cursor-pointer min-h-[44px] disabled:opacity-60"
              >
                {submitting ? 'Validando entrega...' : 'Confirmar entrega e ganhar moedas'}
              </button>
            </form>
          )}
        </div>
      </div>
    );

  // When Google Maps is not enabled, use the interactive local EcoTech map seamlessly
  if (!mapsApiKey) {
    return (
      <>
        <LocalMapSection
          isDark={isDark}
          initialCategory={initialCategory}
          onOpenCheckin={openCheckinModal}
        />
        {renderCheckinModal()}
      </>
    );
  }

  return (
    <APIProvider
      apiKey={mapsApiKey}
      language="pt-BR"
      region="BR"
      libraries={['places', 'marker', 'routes']}
    >
      <div className="space-y-5">
        <ApiStatusBanner />

        {/* Header & Palmas Search / Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                Mapa de Coleta · Palmas, TO
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Localize pontos reais em Palmas no Google Maps, trace sua rota e ganhe EcoCoins ao descartar eletrônicos.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <PalmasAutocompleteSearch
                value={searchInput}
                onChange={setSearchInput}
                onSubmitSearch={(q) => setSearchTriggerText(q)}
                onSelectSuggestionCenter={(loc, label) => {
                  setUserOrigin(loc);
                  setOriginLabel(label);
                  setSearchTriggerText('');
                }}
              />
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-h-[40px] whitespace-nowrap"
              >
                <LocateFixed className="w-4 h-4 text-emerald-600" />
                Meu GPS
              </button>
            </div>
          </div>

          {/* Specific E-Waste Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => {
                setFilterCategory('all');
                setSearchTriggerText('');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                filterCategory === 'all'
                  ? 'bg-[#0F9D58] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todos em Palmas
            </button>
            {WASTE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFilterCategory(cat.id);
                  setSearchTriggerText('');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] ${
                  filterCategory === cat.id
                    ? 'bg-[#0F9D58] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Google Map + Palmas Results Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden relative h-[460px] lg:h-[580px] bg-slate-100 dark:bg-slate-900">
            <PalmasMapInner
              isDark={isDark}
              filterCategory={filterCategory}
              searchTriggerText={searchTriggerText}
              userOrigin={userOrigin}
              placesList={placesList}
              setPlacesList={setPlacesList}
              selectedPlace={selectedPlace}
              setSelectedPlace={setSelectedPlace}
              routeDestination={routeDestination}
              travelMode={travelMode}
              onRouteComputed={handleRouteComputed}
              onPlacesLoading={setPlacesLoading}
              onPlacesError={setPlacesError}
              onOpenCheckin={openCheckinForPlace}
              onRequestRoute={(pl) => setRouteDestination(pl)}
            />

            {/* Floating Route / Origin Summary Bar */}
            {(routeSummary || routeError) && routeDestination && (
              <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5" />
                    {routeSummary
                      ? `Rota até ${routeDestination.name}: ${routeSummary.distanceKm} km · ${routeSummary.durationMin} min`
                      : routeError}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    Origem: {originLabel}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={travelMode}
                    onChange={(e) =>
                      setTravelMode(e.target.value as 'DRIVING' | 'WALKING' | 'BICYCLING')
                    }
                    className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                    aria-label="Modo de transporte"
                  >
                    <option value="DRIVING">Carro</option>
                    <option value="WALKING">A pé</option>
                    <option value="BICYCLING">Bicicleta</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => openCheckinForPlace(routeDestination)}
                    className="px-3.5 py-2 rounded-xl bg-[#0F9D58] text-white text-xs font-semibold cursor-pointer min-h-[40px]"
                  >
                    Registrar Descarte
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Real Palmas Collection Points List */}
          <div className="lg:col-span-5 space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {placesError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs p-3.5 rounded-xl">
                {placesError}
              </div>
            )}

            {placesLoading ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500">
                Buscando pontos em Palmas - TO no Google Maps...
              </div>
            ) : placesList.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
                <MapPin className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-display font-bold text-slate-900 dark:text-white">
                  Nenhum ponto encontrado para esta busca
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Tente outro termo em Palmas - TO ou selecione outra categoria acima.
                </p>
              </div>
            ) : (
              placesList.map((pt) => {
                const isSelected = selectedPlace?.id === pt.id;
                return (
                  <div
                    key={pt.id}
                    onClick={() => setSelectedPlace(pt)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedPlace(pt);
                    }}
                    className={`rounded-2xl border p-4 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display font-bold text-slate-900 dark:text-white text-sm">
                          {pt.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {pt.address}
                        </p>
                      </div>
                      {pt.rating != null && (
                        <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
                          <Star className="w-3.5 h-3.5" /> {pt.rating.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                        +{pt.coinsPerKg} moedas/kg
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlace(pt);
                            setRouteDestination(pt);
                          }}
                          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer min-h-[38px]"
                        >
                          <RouteIcon className="w-3.5 h-3.5" /> Rota
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCheckinForPlace(pt);
                          }}
                          className="px-3.5 py-2 rounded-lg bg-[#0F9D58] hover:bg-[#0C854A] text-white text-xs font-semibold transition-colors cursor-pointer min-h-[38px]"
                        >
                          Check-in
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {renderCheckinModal()}
      </div>
    </APIProvider>
  );
};
