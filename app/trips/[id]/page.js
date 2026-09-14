'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function TripDetailPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const [{ data: tripData, error: tripError }, { data: activityData }] = await Promise.all([
        supabase.from('trips').select('*').eq('id', id).single(),
        supabase.from('activities').select('*').eq('trip_id', id).order('day_date').order('start_time'),
      ]);

      if (tripError) {
        setError('Trip not found or you don\u2019t have access to it.');
      } else {
        setTrip(tripData);
        setActivities(activityData || []);
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

    // Restrict activity date to within the trip's date range
  if (trip.start_date && newDate < trip.start_date) {
    setError(`Activity date can't be before the trip starts (${new Date(trip.start_date).toLocaleDateString()}).`);
    return;
  }
  if (trip.end_date && newDate > trip.end_date) {
    setError(`Activity date can't be after the trip ends (${new Date(trip.end_date).toLocaleDateString()}).`);
    return;
  }
    if (!newTitle.trim() || !newDate) {
      setError('Give the activity a title and a date first.');
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

  if (loading) {
    return (
      <div className="container">
        <p>Loading trip…</p>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="container">
        <p style={{ color: '#c0392b' }}>{error}</p>
      </div>
    );
  }

  // group activities by day_date
  const byDay = activities.reduce((acc, activity) => {
    (acc[activity.day_date] = acc[activity.day_date] || []).push(activity);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort();

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 2 }}>{trip.name}</h1>
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
            {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'No dates set'}
            {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString()}` : ''}
          </p>
        </div>
        <Link href={`/trips/${id}/budget`}><button>Chi phí</button></Link>
      </div>

      {days.length === 0 && (
        <p style={{ color: '#666' }}>Chưa có hoạt động. Cùng thêm nhé!</p>
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
                    <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>{activity.start_time}</span>
                  )}
                  <span style={{ fontSize: 14 }}>{activity.title}</span>
                </div>
                <button onClick={() => handleDelete(activity.id)}>Hủy</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <form onSubmit={handleAddActivity} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400, marginTop: 12 }}>
        <p style={{ fontWeight: 500, margin: 0 }}>Add activity</p>
        <input
          type="text"
          placeholder="Hồ Gươm"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
  <input
    type="date"
    value={newDate}
    min={trip.start_date || undefined}
    max={trip.end_date || undefined}
    onChange={(e) => setNewDate(e.target.value)}
    style={{ flex: 1 }}
  />
  <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} style={{ flex: 1 }} />
</div>
        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit">Thêm</button>
      </form>
    </div>
  );
}
