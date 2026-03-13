
"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '4px'
};

// Yangjaedong, Seocho-gu, Seoul coordinates
// 328-11, Yangjaedong, Seocho-gu, Seoul
const center = {
  lat: 37.468426,
  lng: 127.041135
};

const mapOptions: google.maps.MapOptions = {
    streetViewControl: false,
    mapTypeControl: false,
    fullscreenControl: true,
    zoomControl: true,
    disableDefaultUI: false,
    styles: [
        {"featureType":"administrative","elementType":"all","stylers":[{"hue":"#000000"},{"lightness":-100},{"visibility":"off"}]},
        {"featureType":"administrative.locality","elementType":"all","stylers":[{"visibility":"on"},{"saturation":"-3"},{"gamma":"1.81"},{"weight":"0.01"},{"hue":"#ff0000"},{"lightness":"17"}]},
        {"featureType":"administrative.land_parcel","elementType":"all","stylers":[{"visibility":"off"}]},
        {"featureType":"landscape","elementType":"geometry","stylers":[{"hue":"#dddddd"},{"saturation":-100},{"lightness":-3},{"visibility":"on"}]},
        {"featureType":"landscape","elementType":"labels","stylers":[{"hue":"#000000"},{"saturation":-100},{"lightness":-100},{"visibility":"off"}]},
        {"featureType":"poi","elementType":"all","stylers":[{"hue":"#000000"},{"saturation":-100},{"lightness":-100},{"visibility":"off"}]},
        {"featureType":"road","elementType":"geometry","stylers":[{"hue":"#bbbbbb"},{"saturation":-100},{"lightness":26},{"visibility":"on"}]},
        {"featureType":"road","elementType":"labels","stylers":[{"hue":"#ffffff"},{"saturation":-100},{"lightness":100},{"visibility":"off"}]},
        {"featureType":"road.arterial","elementType":"labels.text","stylers":[{"visibility":"on"},{"color":"#797979"}]},
        {"featureType":"road.arterial","elementType":"labels.text.fill","stylers":[{"color":"#868686"}]},
        {"featureType":"road.arterial","elementType":"labels.text.stroke","stylers":[{"color":"#ffffff"}]},
        {"featureType":"road.local","elementType":"all","stylers":[{"hue":"#ff0000"},{"saturation":-100},{"lightness":100},{"visibility":"on"}]},
        {"featureType":"road.local","elementType":"labels.text","stylers":[{"visibility":"on"}]},
        {"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"color":"#b6b2b2"}]},
        {"featureType":"transit","elementType":"labels","stylers":[{"hue":"#ff0000"},{"lightness":-100},{"visibility":"off"}]},
        {"featureType":"water","elementType":"geometry","stylers":[{"hue":"#ff0000"},{"saturation":-100},{"lightness":100},{"visibility":"on"}]},
        {"featureType":"water","elementType":"labels","stylers":[{"hue":"#000000"},{"saturation":-100},{"lightness":-100},{"visibility":"off"}]}
    ]
};

interface OfficeMapProps {
    apiKey?: string;
}

export default function OfficeMap({ apiKey }: OfficeMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    language: 'ko',  // Korean language for map labels
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
                        fontFamily: 'inherit',
                        lineHeight: '1.4',
                        color: 'black',
                        minWidth: '200px'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>Tedoori Office</h3>
                        <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>328-11, Yangjaedong, Seocho-gu, Seoul</p>
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
