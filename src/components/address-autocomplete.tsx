'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { mapPlaceToZone, getZoneLabel, ZONE_LABELS, type AddressResult, type ViveloZoneSlug } from '@/lib/zone-mapping';
import { VIVELO_ZONES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';

interface AddressAutocompleteProps {
  value?: string;
  zone?: string | null;
  placeholder?: string;
  onChange: (result: AddressResult) => void;
  className?: string;
  inputClassName?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let googleLoaded = false;
let googleLoadPromise: Promise<void> | null = null;

function loadGooglePlaces(): Promise<void> {
  if (googleLoaded) return Promise.resolve();
  if (googleLoadPromise) return googleLoadPromise;

  googleLoadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(); return; }
    if (window.google?.maps?.places) { googleLoaded = true; resolve(); return; }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;
    script.onload = () => { googleLoaded = true; resolve(); };
    script.onerror = () => { googleLoadPromise = null; reject(); };
    document.head.appendChild(script);
  });

  return googleLoadPromise;
}

export function AddressAutocomplete({
  value = '',
  zone = null,
  placeholder = 'Ej: Av. Reforma 500, CDMX',
  onChange,
  className = '',
  inputClassName = '',
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [showManualZone, setShowManualZone] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Sync external value
  useEffect(() => { setLocalValue(value); }, [value]);

  // Load Google Places and attach to input after mount
  useEffect(() => {
    if (!mounted || !API_KEY || !inputRef.current || autocompleteRef.current) return;

    let cancelled = false;

    loadGooglePlaces().then(() => {
      if (cancelled || !inputRef.current || autocompleteRef.current) return;

      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'mx' },
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.address_components) return;

        const components = place.address_components;
        const getComponent = (type: string) =>
          components.find(c => c.types.includes(type))?.long_name || '';

        const locality = getComponent('locality') || getComponent('sublocality_level_1') || getComponent('administrative_area_level_2');
        const state = getComponent('administrative_area_level_1');
        const muni = getComponent('administrative_area_level_2');

        const zoneSlug = mapPlaceToZone({
          locality,
          administrative_area_level_1: state,
          administrative_area_level_2: muni,
        });

        const addr = place.formatted_address || '';
        setLocalValue(addr);
        setShowManualZone(false);
        onChange({
          address: addr,
          zone: zoneSlug,
          zoneLabel: getZoneLabel(zoneSlug),
          lat: place.geometry?.location?.lat() ?? null,
          lng: place.geometry?.location?.lng() ?? null,
        });
      });

      autocompleteRef.current = autocomplete;
    }).catch(() => {
      if (!cancelled) setShowManualZone(true);
    });

    return () => { cancelled = true; };
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const addr = e.target.value;
    setLocalValue(addr);
    // If no Google or user is typing freely, propagate address without zone
    if (!autocompleteRef.current || showManualZone) {
      onChange({
        address: addr,
        zone: (zone as ViveloZoneSlug) || null,
        zoneLabel: zone ? (ZONE_LABELS[zone as ViveloZoneSlug] || null) : null,
        lat: null,
        lng: null,
      });
    }
  }, [showManualZone, zone, onChange]);

  const handleBlur = useCallback(() => {
    // If user typed but Google autocomplete never initialized or they didn't pick a suggestion
    if (!autocompleteRef.current && localValue && !zone) {
      setShowManualZone(true);
    }
  }, [localValue, zone]);

  const handleManualZoneChange = useCallback((slug: string) => {
    const zoneSlug = slug as ViveloZoneSlug;
    onChange({
      address: localValue,
      zone: zoneSlug,
      zoneLabel: ZONE_LABELS[zoneSlug] || null,
      lat: null,
      lng: null,
    });
  }, [localValue, onChange]);

  const zoneLabel = zone ? (ZONE_LABELS[zone as ViveloZoneSlug] || zone) : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pl-8 ${inputClassName}`}
        />
      </div>

      {(showManualZone || (!API_KEY && mounted)) && (
        <div className="flex items-center gap-2">
          <Select value={zone || ''} onValueChange={handleManualZoneChange}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Selecciona tu zona" />
            </SelectTrigger>
            <SelectContent>
              {VIVELO_ZONES.map(z => (
                <SelectItem key={z.slug} value={z.slug}>{z.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Zona manual</span>
        </div>
      )}

      {zoneLabel && (
        <Badge variant="outline" className="gap-1 text-xs text-green-700 border-green-200 bg-green-50">
          <MapPin className="h-3 w-3" />
          Zona: {zoneLabel}
        </Badge>
      )}
    </div>
  );
}
