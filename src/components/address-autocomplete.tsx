'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { mapPlaceToZone, getZoneLabel, ZONE_LABELS, type AddressResult, type ViveloZoneSlug } from '@/lib/zone-mapping';
import { VIVELO_ZONES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
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
  const [fallbackMode, setFallbackMode] = useState(!API_KEY);
  const [localValue, setLocalValue] = useState(value);
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);
  const optionsSet = useRef(false);

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!API_KEY || fallbackMode) return;

    let mounted = true;

    if (!optionsSet.current) {
      setOptions({ key: API_KEY, v: 'weekly' });
      optionsSet.current = true;
    }

    importLibrary('places').then(() => {
      if (!mounted || !inputRef.current) return;

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

        const result: AddressResult = {
          address: place.formatted_address || '',
          zone: zoneSlug,
          zoneLabel: getZoneLabel(zoneSlug),
          lat: place.geometry?.location?.lat() ?? null,
          lng: place.geometry?.location?.lng() ?? null,
        };

        setLocalValue(result.address);
        setSelectedFromDropdown(true);
        onChange(result);
      });

      autocompleteRef.current = autocomplete;
    }).catch(() => {
      if (mounted) setFallbackMode(true);
    });

    return () => { mounted = false; };
  }, [fallbackMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // If user types but doesn't select from dropdown, switch to fallback on blur
  const handleBlur = useCallback(() => {
    if (!selectedFromDropdown && localValue && localValue !== value) {
      setFallbackMode(true);
    }
  }, [selectedFromDropdown, localValue, value]);

  // Fallback: manual zone select
  const handleFallbackZoneChange = useCallback((slug: string) => {
    const zoneSlug = slug as ViveloZoneSlug;
    onChange({
      address: localValue,
      zone: zoneSlug,
      zoneLabel: ZONE_LABELS[zoneSlug] || null,
      lat: null,
      lng: null,
    });
  }, [localValue, onChange]);

  const handleFallbackAddressChange = useCallback((addr: string) => {
    setLocalValue(addr);
    onChange({
      address: addr,
      zone: (zone as ViveloZoneSlug) || null,
      zoneLabel: zone ? (ZONE_LABELS[zone as ViveloZoneSlug] || null) : null,
      lat: null,
      lng: null,
    });
  }, [zone, onChange]);

  const zoneLabel = zone ? (ZONE_LABELS[zone as ViveloZoneSlug] || zone) : null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        {fallbackMode ? (
          <Input
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => handleFallbackAddressChange(e.target.value)}
            className={`pl-8 ${inputClassName}`}
          />
        ) : (
          <Input
            ref={inputRef}
            placeholder={placeholder}
            defaultValue={localValue}
            onBlur={handleBlur}
            onChange={() => setSelectedFromDropdown(false)}
            className={`pl-8 ${inputClassName}`}
          />
        )}
      </div>

      {fallbackMode && (
        <div className="flex items-center gap-2">
          <Select value={zone || ''} onValueChange={handleFallbackZoneChange}>
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

      {!zone && localValue && localValue.trim().length > 3 && !fallbackMode && selectedFromDropdown && (
        <Badge variant="outline" className="gap-1 text-xs text-amber-700 border-amber-200 bg-amber-50">
          Zona no cubierta
        </Badge>
      )}
    </div>
  );
}
