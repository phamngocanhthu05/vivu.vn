'use client';

import { useEffect, useRef, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabaseClient';

const INK = '#1C2B3A';
const TERRACOTTA = '#A8503B';
const PARCHMENT = '#F1E9D8';
const INK_SOFT = 'rgba(28,43,58,0.62)';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

export default function TripDetailPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const [myRole, setMyRole] = useState(null);
  const router = useRouter();
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const [{ data: tripData, error: tripError }, { data: activityData }, { data: membership }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('trip_id', id).order('day_date').order('start_time'),
        supabase.from('trip_members').select('role').eq('trip_id', id).eq('user_id', session.user.id).single(),
      ]);

      if (tripError) {
        setError('Trip not found or you don\u2019t have access to it.');
      } else {
        setTrip(tripData);
        setActivities(activityData || []);
        setMyRole(membership?.role || null);
        if (!newDate && tripData.start_date) setNewDate(tripData.start_date);
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  async function handleAddActivity(e) {
    e.preventDefault();
    setError('');

    if (!newTitle.trim() || !newDate) {
      setError('Hãy đặt tên và mốc thời gian cho hoạt động trước nhé!');
      return;
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        trip_id: id,
        title: newTitle.trim(),
        day_date: newDate,
        start_time: newTime || null,
      })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else {
      setActivities((prev) =>
  [...prev, data].sort((a, b) =>
    a.day_date === b.day_date
      ? (a.start_time || '').localeCompare(b.start_time || '')
      : a.day_date.localeCompare(b.day_date)
  )
);
    }
  }

  async function handleDelete(activityId) {
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (!error) {
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    }
  }

  async function handleUpdateActivity(activityId, updates) {
  const { data, error } = await supabase
    .from('activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    window.alert(error.message);
    return null;
  }

  setActivities((prev) =>
    prev
      .map((a) => (a.id === activityId ? data : a))
      .sort((a, b) =>
        a.day_date === b.day_date
          ? (a.start_time || '').localeCompare(b.start_time || '')
          : a.day_date.localeCompare(b.day_date)
      )
  );
  return data;
}

 async function openEditModal() {
  setEditName(trip.name);
  setEditStart(trip.start_date || '');
  setEditEnd(trip.end_date || '');
  setShowEditModal(true);
 }

 async function handleSaveTripEdit(e) {
  e.preventDefault();
  const updates = {
    name: editName.trim() || trip.name,
    start_date: editStart || null,
    end_date: editEnd || null,
  };
  
  const { error } = await supabase.from('trips').update(updates).eq('id', id);
  if (!error) {
    setTrip((prev) => ({ ...prev, ...updates }));
  } else {
    window.alert(error.message);
  }
}

  async function handleDeleteTrip() {
    const confirmed = window.confirm(`Hủy chuyến"${trip.name}"? Thao tác này sẽ xóa tất cả các hoạt động và chi phí liên quan. Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error) {
      router.push('/trips');
    } else {
      window.alert(error.message);
    }
  }

  function handleExportPDF() {
    const byDayLocal = activities.reduce((acc, activity) => {
      (acc[activity.day_date] = acc[activity.day_date] || []).push(activity);
      return acc;
    }, {});
    const daysLocal = Object.keys(byDayLocal).sort();

    const doc = new jsPDF();
    let y = 15;

    doc.setFontSize(16);
    doc.text(trip.name, 14, y);
    y += 8;

    doc.setFontSize(11);
    const dateRange = trip.start_date
      ? `${new Date(trip.start_date).toLocaleDateString()}${trip.end_date ? ' \u2013 ' + new Date(trip.end_date).toLocaleDateString() : ''}`
      : 'No dates set';
    doc.text(dateRange, 14, y);
    y += 10;

    if (daysLocal.length === 0) {
      doc.setFontSize(11);
      doc.text('No activities yet.', 14, y);
    }

    daysLocal.forEach((day) => {
      doc.setFontSize(13);
      doc.text(new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }), 14, y);
      y += 8;
      doc.setFontSize(10);

      byDayLocal[day].forEach((activity) => {
        const line = activity.start_time ? `${activity.start_time} \u2014 ${activity.title}` : activity.title;
        doc.text(line, 18, y);
        y += 6;
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
      });
      y += 4;
    });

    doc.save(`${trip.name}-itinerary.pdf`);
  }

function handleExportICS() {
  const escapeICS = (str) => String(str).replace(/([,;])/g, '\\$1');
  const toICSStamp = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  function parseActivityStart(activity) {
    const datePart = activity.day_date ? String(activity.day_date).slice(0, 10) : null;
    const timePart = activity.start_time ? String(activity.start_time).slice(0, 5) : '09:00';
    if (datePart) {
      const d = new Date(`${datePart}T${timePart}:00`);
      if (!isNaN(d.getTime())) return d;
    }
    const fallback = new Date(activity.day_date);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  const skipped = [];
  const events = activities
    .map((activity) => {
      const startDate = parseActivityStart(activity);
      if (!startDate) {
        skipped.push(activity.title);
        return null;
      }
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      return [
        'BEGIN:VEVENT',
        `UID:${activity.id}@tripapp`,
        `DTSTAMP:${toICSStamp(new Date())}`,
        `DTSTART:${toICSStamp(startDate)}`,
        `DTEND:${toICSStamp(endDate)}`,
        `SUMMARY:${escapeICS(activity.title)}`,
        `DESCRIPTION:${escapeICS('Part of trip: ' + trip.name)}`,
        'END:VEVENT',
      ].join('\r\n');
    })
    .filter(Boolean);

  if (skipped.length > 0) {
    window.alert(`Skipped ${skipped.length} activity(ies) with an unreadable date: ${skipped.join(', ')}`);
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TripApp//Itinerary Export//EN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${trip.name}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

  if (loading) {
    return (
      <>
        <FontLink />
        <div className="page">
          <p>Đang tải lịch trình...</p>
          <PageStyles />
        </div>
      </>
    );
  }

  if (error && !trip) {
    return (
      <>
        <FontLink />
        <div className="page">
          <p style={{ color: '#c0392b' }}>{error}</p>
          <PageStyles />
        </div>
      </>
    );
  }

  // group activities by day_date
  const byDay = activities.reduce((acc, activity) => {
    (acc[activity.day_date] = acc[activity.day_date] || []).push(activity);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort();

  return (
    <>
      <FontLink />
      <div className="page">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 2 }}>{trip.name}</h1>
            <p style={{ fontSize: 13, color: INK_SOFT, margin: 0 }}>
              {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'No dates set'}
              {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString()}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Link href={`/trips/${id}/budget`}><button>Ngân sách</button></Link>
             {['owner', 'editor'].includes(myRole) && (
              <button onClick={openEditModal}>Chỉnh sửa</button>
            )}
             <button onClick={handleExportPDF}>Xuất PDF</button>
             <button onClick={handleExportICS}>Xuất lịch (.ics)</button>
            {myRole && (
              <button onClick={handleDeleteTrip}>Hủy chuyến</button>
            )}
          </div>
        </div>

        {/* Two-column layout: itinerary on the left, map on the right */}
        <div className="trip-layout">
          <div className="itinerary-col">
            {days.length === 0 && (
              <p style={{ color: INK_SOFT }}>Chưa có hoạt động nào. Thêm hoạt động đầu tiên bên dưới.</p>
            )}

            {days.map((day) => (
              <div key={day} style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                  {new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {byDay[day].map((activity) => (
                    <div key={activity.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        {activity.start_time && (
                          <span style={{ fontSize: 12, color: INK_SOFT, marginRight: 8 }}>{activity.start_time}</span>
                        )}
                        <span style={{ fontSize: 14 }}>{activity.title}</span>
                      </div>
                      <button onClick={() => handleDelete(activity.id)}>Xóa</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <form onSubmit={handleAddActivity} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              <p style={{ fontWeight: 500, margin: 0 }}>Thêm hoạt động</p>
              <input
                type="text"
                placeholder="Hồ Gươm..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: 1 }} />
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ flex: 1 }} />
              </div>
              {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
              <button type="submit">Thêm</button>
            </form>
          </div>

          <div className="map-col">
            <TripMap trip={trip} activities={activities} days={days} byDay={byDay} onUpdateActivity={handleUpdateActivity} />
          </div>
        </div>
        {showEditModal && (
  <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
    <form className="modal-card" onClick={(e) => e.stopPropagation()} onSubmit={handleSaveTripEdit}>
      <p style={{ fontWeight: 500, margin: 0 }}>Chỉnh sửa</p>
      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tên chuyến đi" />
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={{ flex: 1 }} />
        <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={{ flex: 1 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => setShowEditModal(false)}>Hủy</button>
        <button type="submit">Lưu</button>
      </div>
    </form>
  </div>
      )}
        <PageStyles />
      </div>
    </>
  );
}
function TripMap({ trip, activities, days, byDay, onUpdateActivity }) {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [mapError, setMapError] = useState('');
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Default the day filter once days are known.
  useEffect(() => {
    if (!selectedDay && days.length > 0) setSelectedDay(days[0]);
  }, [days, selectedDay]);

  // Initialize the map instance once.
  useEffect(() => {
    maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')
    if (!mapDivRef.current || mapRef.current) return;
    try {
      mapRef.current = new maplibregl.Map({
        container: mapDivRef.current,
        style: OPENFREEMAP_STYLE,
        center: [105.8342, 21.0278], // fallback: Hanoi [lng, lat]
        zoom: 12,
      });
      mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current.on('load', () => setMapReady(true));
    } catch (err) {
      console.error(err);
      setMapError('Failed to load OpenFreeMap.');
    }
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Whenever the selected day's activities change, geocode each one, drop
  // markers, and draw the route between them in order.
  useEffect(() => {
    if (!mapReady || !mapRef.current || !selectedDay) return;

    const dayActivities = byDay[selectedDay] || [];
    let cancelled = false;

    async function buildDay() {
      setLoadingRoute(true);

      // clear old markers + route layer
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      removeRouteLayer(mapRef.current);

      if (dayActivities.length === 0) {
        setLoadingRoute(false);
        return;
      }

      const located = [];
      for (const activity of dayActivities) {
        const query = trip?.name ? `${activity.title}, ${trip.name}` : activity.title;
        const place = await geocode(query, { lat: trip?.latitude, lng: trip?.longitude });
        if (place) located.push({ activity, place });
        if (cancelled) return;
        await sleep(1100);
      }
      if (cancelled) return;

      if (located.length === 0) {
        setLoadingRoute(false);
        return;
      }
  const place = await geocode(query, mapRef.current.getCenter());

  const bounds = new maplibregl.LngLatBounds();
    located.forEach(({ activity, place }, index) => {
      
  const lngLat = [place.lng, place.lat];
  bounds.extend(lngLat);

  const el = document.createElement('div');
  el.className = 'trip-marker';
  el.textContent = String(index + 1);

  const marker = new maplibregl.Marker({ element: el })
    .setLngLat(lngLat)
    .addTo(mapRef.current);

  el.addEventListener('click', () => {
    const popup = new maplibregl.Popup({ offset: 18 })
      .setLngLat(lngLat)
      .setDOMContent(
        buildEditPopupContent(activity, async (updates) => {
          const saved = await onUpdateActivity(activity.id, updates);
          if (saved) popup.remove();
        })
      )
      .addTo(mapRef.current);
  });

  markersRef.current.push(marker);
});

      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 16 });

      // Draw a route connecting the located stops in order.
      if (located.length >= 2) {
        const geometry = await fetchRoute(located.map((f) => f.place));
        if (!cancelled && geometry) {
          addRouteLayer(mapRef.current, geometry);
        }
      }

      setLoadingRoute(false);
    }

    buildDay();
    return () => {
      cancelled = true;
    };
  }, [mapReady, selectedDay, byDay, trip]);

  if (mapError) {
    return (
      <div className="map-placeholder">
        <p>{mapError}</p>
      </div>
    );
  }

  return (
    <div className="map-panel">
      {days.length > 1 && (
        <div className="day-tabs">
          {days.map((day) => (
            <button
              key={day}
              className={day === selectedDay ? 'day-tab active' : 'day-tab'}
              onClick={() => setSelectedDay(day)}
            >
              {new Date(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
      )}
      <div ref={mapDivRef} className="map-canvas" />
      {(!mapReady || loadingRoute) && (
        <p style={{ fontSize: 13, color: INK_SOFT, marginTop: 6 }}>
          {!mapReady ? 'Đang tải bản đồ...' : 'Đang dựng lộ trình...'}
        </p>
      )}
    </div>
  );
}

async function geocode(query, biasCenter) {
  try {
    let url = `/api/geocode?q=${encodeURIComponent(query)}`;
    if (biasCenter) url += `&lat=${biasCenter.lat}&lng=${biasCenter.lng}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
    }
  } catch (err) {
    console.error('[geocode] failed for', query, err);
  }
  return null;
}

async function fetchRoute(places) {
  try {
    const coordStr = places.map((p) => `${p.lng},${p.lat}`).join(';');
    const url = `${OSRM_URL}/${coordStr}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    return data.routes?.[0]?.geometry || null;
  } catch (err) {
    return null;
  }
}

function addRouteLayer(map, geometry) {
  removeRouteLayer(map);
  map.addSource('trip-route', { type: 'geojson', data: { type: 'Feature', geometry, properties: {} } });
  map.addLayer({
    id: 'trip-route-line',
    type: 'line',
    source: 'trip-route',
    paint: { 'line-color': TERRACOTTA, 'line-width': 4, 'line-opacity': 0.85 },
  });
}

function removeRouteLayer(map) {
  if (map.getLayer('trip-route-line')) map.removeLayer('trip-route-line');
  if (map.getSource('trip-route')) map.removeSource('trip-route');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderPopupContent(title, place) {
  return `
    <div style="font-family: 'IBM Plex Sans', sans-serif; max-width:220px;">
      <div style="font-weight:600;margin-bottom:2px;">${escapeHtml(title)}</div>
      <div style="font-size:12px;color:#555;">${escapeHtml(place.displayName || '')}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildEditPopupContent(activity, onSave) {
  const wrap = document.createElement('div');
  wrap.className = 'marker-popup';

  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.value = activity.title;
  titleInput.className = 'popup-input';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = activity.day_date;
  dateInput.className = 'popup-input';

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.value = activity.start_time || '';
  timeInput.className = 'popup-input';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Lưu';
  saveBtn.className = 'popup-save-btn';
  saveBtn.onclick = async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Đang lưu...';
    await onSave({
      title: titleInput.value.trim() || activity.title,
      day_date: dateInput.value || activity.day_date,
      start_time: timeInput.value || null,
    });
    saveBtn.disabled = false;
    saveBtn.textContent = 'Lưu';
  };

  wrap.append(titleInput, dateInput, timeInput, saveBtn);
  return wrap;
}

function FontLink() {
  return (
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
    />
  );
}

function PageStyles() {
  return (
    <style jsx global>{`
      .page {
        min-height: 100vh;
        background: ${PARCHMENT};
        color: ${INK};
        font-family: 'IBM Plex Sans', sans-serif;
        padding: 32px 24px;
        box-sizing: border-box;
      }
      .page h1 {
        font-family: 'Fraunces', serif;
        font-weight: 500;
        color: ${INK};
      }
      .page button {
        background: ${INK};
        color: ${PARCHMENT};
        border: none;
        border-radius: 3px;
        padding: 0.6em 1.1em;
        font-family: 'IBM Plex Sans', sans-serif;
        font-size: 0.92rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .page button:hover {
        background: ${TERRACOTTA};
      }
      .page input {
        border: 1px solid rgba(28,43,58,0.22);
        border-radius: 3px;
        padding: 0.6em 0.8em;
        font-family: 'IBM Plex Sans', sans-serif;
        color: ${INK};
        background: rgba(255,255,255,0.5);
      }
      .page input:focus,
      .page button:focus {
        outline: 2px solid ${TERRACOTTA};
        outline-offset: 2px;
      }
      .page .card {
        background: rgba(255,255,255,0.4);
        border: 1px solid rgba(28,43,58,0.12);
        border-radius: 6px;
        padding: 12px 16px;
      }

      .trip-layout {
        display: flex;
        gap: 24px;
        align-items: flex-start;
      }
      .itinerary-col {
        flex: 1 1 380px;
        min-width: 320px;
      }
      .map-col {
        flex: 1 1 480px;
        min-width: 320px;
        position: sticky;
        top: 24px;
      }
      .map-panel {
        background: rgba(255,255,255,0.4);
        border: 1px solid rgba(28,43,58,0.12);
        border-radius: 6px;
        padding: 12px;
      }
      .map-canvas {
        width: 100%;
        height: 480px;
        border-radius: 4px;
        overflow: hidden;
      }
      .map-placeholder {
        background: rgba(255,255,255,0.4);
        border: 1px dashed rgba(28,43,58,0.3);
        border-radius: 6px;
        padding: 24px;
        text-align: center;
        color: ${INK_SOFT};
        font-size: 13px;
      }
      .maplibre-canvas {
  outline: none;
}
       .modal-overlay {
         position: fixed;
         inset: 0;
         background: rgba(28,43,58,0.45);
         display: flex;
         align-items: center;
         justify-content: center;
         z-index: 50;
     }
        .modal-card {
         background: ${PARCHMENT};
         border-radius: 6px;
         padding: 20px;
         display: flex;
         flex-direction: column;
         gap: 10px;
         width: 320px;
    }

.maplibregl-popup-content {
  background: ${PARCHMENT} !important;
  color: ${INK} !important;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  padding: 8px 12px;
}
.maplibregl-popup-anchor-bottom .maplibregl-popup-tip {
  border-top-color: ${PARCHMENT} !important;
}
      .day-tabs {
        display: flex;
        gap: 6px;
        margin-bottom: 8px;
        flex-wrap: wrap;
      }
      .day-tab {
        background: transparent;
        color: ${INK};
        border: 1px solid rgba(28,43,58,0.22);
        padding: 0.35em 0.8em;
        font-size: 0.82rem;
      }
      .day-tab.active {
        background: ${INK};
        color: ${PARCHMENT};
      }

      .trip-marker {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: ${TERRACOTTA};
        color: ${PARCHMENT};
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        border: 2px solid ${PARCHMENT};
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        cursor: pointer;
      }

      @media (max-width: 900px) {
        .trip-layout {
          flex-direction: column;
        }
        .map-col {
          position: static;
          width: 100%;
        }
      }
    `}</style>
  );
}