
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '4px'
};

// Sejong-daero, Jongno-gu, Seoul coordinates (approximate based on address)
// 123, Sejong-daero corresponds to Seoul City Hall area roughly
const center = {
  lat: 37.5665,
  lng: 126.9780
};

const mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
    // Add these for cleaner UI
    disableDefaultUI: false,
    styles: [
        {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
        }
    ]
};

interface OfficeMapProps {
    apiKey?: string;
}

export default function OfficeMap({ apiKey }: OfficeMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = useCallback(function callback(map: google.maps.Map) {
    setMap(null);
  }, []);

  const handleMarkerClick = () => {
      setIsOpen(true);
  };

  const handleInfoWindowClose = () => {
      setIsOpen(false);
  };

  if (loadError) {
    return (
        <div style={{ 
            ...containerStyle, 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#f5f5f5', 
            color: '#666', 
            border: '1px solid #ddd' 
        }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Map Unavailable</p>
            <p style={{ fontSize: '12px', marginTop: '5px' }}>Unable to load Google Maps API.</p>
        </div>
    );
  }

  if (!isLoaded) {
    return (
        <div style={{ 
            ...containerStyle, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: '#f5f5f5', 
            color: '#666' 
        }}>
            Loading Map...
        </div>
    );
  }

  return (
      <div style={{ marginBottom: '40px' }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={center}
            zoom={17}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={mapOptions}
          >
            <MarkerF 
                position={center} 
                onClick={handleMarkerClick}
                title="Tedoori Office"
            />
            
            {isOpen && (
                <InfoWindowF 
                    position={center}
                    onCloseClick={handleInfoWindowClose}
                >
                    <div style={{ 
                        padding: '5px', 
                        fontFamily: 'Consolas, monospace', 
                        lineHeight: '1.4', 
                        color: 'black',
                        minWidth: '200px'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Tedoori Office</h3>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>123, Sejong-daero, Jongno-gu, Seoul</p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>Tel: +82 2 1234 5678</p>
                        <div style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
                             <p style={{ margin: '0', fontSize: '11px', color: '#666' }}>Open: Mon-Fri 09:00 - 18:00</p>
                        </div>
                    </div>
                </InfoWindowF>
            )}
          </GoogleMap>
      </div>
  );
}
