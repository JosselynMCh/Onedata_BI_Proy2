import { useEffect, useRef, useState } from 'react'

const PARCEL_OFFSETS = [
  { lat: -5.9825, lng: -79.7495, dLat: 0.0042, dLng: 0.0052 },
  { lat: -5.9825, lng: -79.7435, dLat: 0.0042, dLng: 0.0052 },
  { lat: -5.9875, lng: -79.7495, dLat: 0.0042, dLng: 0.0052 },
  { lat: -5.9875, lng: -79.7435, dLat: 0.0042, dLng: 0.0052 },
  { lat: -5.985, lng: -79.7375, dLat: 0.0042, dLng: 0.0052 },
]

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (window.__gmapsLoadPromise) {
    return window.__gmapsLoadPromise
  }

  window.__gmapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps no se inicializó correctamente.'))
      }
    }
    script.onerror = () => {
      reject(new Error('No se pudo cargar la API de Google Maps.'))
    }
    document.head.appendChild(script)
  })

  return window.__gmapsLoadPromise
}

function getParcelColor(lote) {
  const ton = Number(lote.toneladas_cosechadas || 0)
  if (lote.estado === 'COSECHA' && ton > 0) {
    return '#16a34a' // Cosechado
  }
  if (lote.estado === 'ACTIVO' || lote.estado === 'COSECHA') {
    return '#eab308' // En Proceso
  }
  return '#9ca3af' // Pendiente
}

function getParcelStatusLabel(lote) {
  const ton = Number(lote.toneladas_cosechadas || 0)
  if (lote.estado === 'COSECHA' && ton > 0) return 'Cosechado'
  if (lote.estado === 'ACTIVO' || lote.estado === 'COSECHA') return 'En Proceso'
  return 'Pendiente'
}

export default function ProductionGoogleMap({ lotes = [] }) {
  const mapContainerRef = useRef(null)
  const [selectedLote, setSelectedLote] = useState(null)
  const [mapError, setMapError] = useState('')

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      return
    }

    let isMounted = true
    const overlays = []

    loadGoogleMapsScript(apiKey)
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return

        const map = new maps.Map(mapContainerRef.current, {
          center: { lat: -5.985, lng: -79.744 },
          zoom: 14,
          mapTypeId: 'satellite',
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        const infoWindow = new maps.InfoWindow()

        lotes.forEach((lote, idx) => {
          const offset = PARCEL_OFFSETS[idx % PARCEL_OFFSETS.length]
          const color = getParcelColor(lote)
          const ton = Number(lote.toneladas_cosechadas || 0).toFixed(2)
          const kg = Math.round(Number(lote.kg_cosechados || 0)).toLocaleString(
            'es-PE',
          )

          const bounds = {
            north: offset.lat + offset.dLat / 2,
            south: offset.lat - offset.dLat / 2,
            east: offset.lng + offset.dLng / 2,
            west: offset.lng - offset.dLng / 2,
          }

          const rectangle = new maps.Rectangle({
            strokeColor: '#ffffff',
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: color,
            fillOpacity: 0.55,
            map,
            bounds,
          })

          const marker = new maps.Marker({
            position: { lat: offset.lat, lng: offset.lng },
            map,
            label: {
              text: `${lote.codigo_lote}: ${ton} tn`,
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 'bold',
            },
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 0,
            },
          })

          const openPopup = () => {
            setSelectedLote(lote)
            infoWindow.setContent(
              `<div style="font-family:sans-serif;padding:2px 4px;min-width:170px">
                <strong style="color:#0d1f3c;font-size:13px">${lote.codigo_lote} · ${lote.fundo}</strong>
                <div style="font-size:12px;color:#475569;margin-top:4px">
                  Cultivo: <b>${lote.cultivo}</b><br/>
                  Área: <b>${Number(lote.area_ha).toFixed(1)} ha</b><br/>
                  Cosechado: <b style="color:#16a34a">${ton} tn</b> (${kg} kg)<br/>
                  Estado: <b>${getParcelStatusLabel(lote)}</b>
                </div>
              </div>`,
            )
            infoWindow.setPosition({ lat: offset.lat, lng: offset.lng })
            infoWindow.open(map)
          }

          rectangle.addListener('click', openPopup)
          marker.addListener('click', openPopup)

          overlays.push(rectangle, marker)
        })
      })
      .catch((err) => {
        if (isMounted) {
          setMapError(err.message || 'No se pudo cargar Google Maps.')
        }
      })

    return () => {
      isMounted = false
      overlays.forEach((ov) => ov.setMap(null))
    }
  }, [lotes])

  return (
    <div className="relative flex-1 min-h-[260px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full min-h-[260px]" />

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 p-4 text-center text-xs text-red-600">
          {mapError}
        </div>
      )}

      {selectedLote && (
        <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 px-3 py-1.5 text-[11px] shadow-sm">
          <p className="font-bold text-[#0d1f3c]">
            {selectedLote.codigo_lote} · {selectedLote.cultivo}
          </p>
          <p className="text-emerald-700 font-semibold">
            Cosechado: {Number(selectedLote.toneladas_cosechadas).toFixed(2)} tn
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 px-3 py-2 shadow-sm space-y-1.5 text-[11px] font-medium text-slate-700">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#16a34a]" />
          <span>Cosechado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#eab308]" />
          <span>En Proceso</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-xs bg-[#9ca3af]" />
          <span>Pendiente</span>
        </div>
      </div>
    </div>
  )
}
