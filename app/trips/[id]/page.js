'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

const INK = '#1C2B3A';
const TERRACOTTA = '#A8503B';
const PARCHMENT = '#F1E9D8';
const INK_SOFT = 'rgba(28,43,58,0.62)';

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
      setActivities((prev) => [...prev, data]);
      setNewTitle('');
      setNewTime('');
    }
  }

  async function handleDelete(activityId) {
    const { error } = await supabase.from('activities').delete().eq('id', activityId);
    if (!error) {
      setActivities((prev) => prev.filter((a) => a.id !== activityId));
    }
  }

  async function handleRenameTrip() {
    const newName = window.prompt('Chỉnh sửa', trip.name);
    if (!newName || !newName.trim() || newName.trim() === trip.name) return;

    const { error } = await supabase.from('trips').update({ name: newName.trim() }).eq('id', id);
    if (!error) {
      setTrip((prev) => ({ ...prev, name: newName.trim() }));
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
        <Link href="/trips" style={{ fontSize: 13, color: '#666' }}>&larr; Chuyến đi của bạn</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, marginBottom: 2 }}>{trip.name}</h1>
            <p style={{ fontSize: 13, color: INK_SOFT, margin: 0 }}>
              {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'No dates set'}
              {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString()}` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['owner', 'editor'].includes(myRole) && (
              <button onClick={handleRenameTrip}>Chỉnh sửa</button>
            )}
            {myRole && (
              <button onClick={handleDeleteTrip}>Hủy chuyến</button>
            )}
            <Link href={`/trips/${id}/budget`}><button>Ngân sách</button></Link>
          </div>
        </div>

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

        <form onSubmit={handleAddActivity} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, marginTop: 12 }}>
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

        <PageStyles />
      </div>
    </>
  );
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
    `}</style>
  );
}