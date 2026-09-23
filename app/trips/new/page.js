'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function NewTripPage() {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Nights between the two dates, or null if either date is missing/invalid.
  // UTC midnight is used for both so a DST transition can't shift the count.
  function calculateDuration(start, end) {
    if (!start || !end) return null;
    const startUTC = new Date(`${start}T00:00:00Z`);
    const endUTC = new Date(`${end}T00:00:00Z`);
    const diffDays = Math.round((endUTC - startUTC) / 86400000);
    return diffDays >= 0 ? diffDays : null;
  }
 
  const duration = calculateDuration(startDate, endDate);
 
  function handleStartDateChange(value) {
    setStartDate(value);
    // If the existing end date is now before the new start date, clear it
    // instead of leaving an invalid range sitting in the form.
    if (endDate && value && endDate < value) {
      setEndDate('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Hãy đặt tên cho chuyến đi của bạn.');
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('trips')
      .insert({
        name: name.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        owner_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      setError(error.message);
      return;
    }

    setSaving(false);
    router.push(`/trips/${data.id}`);
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, fontWeight: 500 }}>Hôm nay, bạn muốn đi đâu?</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360 }}>
        <label style={{ fontSize: 13, color: '#666' }}>
          Tên chuyến đi
          <input
            type="text"
            placeholder="Hà Nội..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

                <label style={{ fontSize: 13, color: '#666' }}>
          Ngày khởi hành
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleStartDateChange(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
 
        <label style={{ fontSize: 13, color: '#666' }}>
          Ngày kết thúc
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            disabled={!startDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>
 
        {duration !== null && (
          <p style={{ fontSize: 13, color: 'rgba(28,43,58,0.62)', margin: 0 }}>
            {duration === 0
              ? 'Chuyến đi trong ngày.'
              : `${duration + 1} ngày, ${duration} đêm.`}
          </p>
        )}

        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Đang tạo lịch trình' : 'Tạo lịch trình'}
        </button>
      </form>
    </div>
  );
}
