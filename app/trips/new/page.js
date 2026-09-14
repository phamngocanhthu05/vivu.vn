'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function NewTripPage() {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Hãy đặt tên cho chuyến đi của bạn.');
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('SESSION:', session);
    console.log('USER ID:', session?.user?.id);
    console.log('TOKEN:', session.access_token);

    if (!session) {
      router.replace('/login');
      return;
    }
  const { data: debugData, error: debugError } = await supabase.rpc('debug_request_jwt');
  console.log('DEBUG JWT:', debugData, debugError);

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
      console.error( 'FULL ERROR:', error);
      setSaving(false);
      setError(error.message);
      return;
  }
   // Add the owner as a member so they can view/access the trip
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: data.id,
        user_id: session.user.id,
        role: 'owner',
      });

    setSaving(false);

    if (memberError) {
      console.error('Failed to add owner as member:', memberError.message);
      // Trip was created but membership failed — still navigate, but log it
    }

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
            onChange={(e) => setStartDate(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

        <label style={{ fontSize: 13, color: '#666' }}>
          Ngày kết thúc
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </label>

        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={saving}>
          {saving ? 'Đang tạo lịch trình' : 'Tạo lịch trình'}
        </button>
      </form>
    </div>
  );
}
