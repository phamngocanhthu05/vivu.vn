'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function TripsListPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error) {
        setTrips(data || []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="container">
        <p>Đang tải lịch trình…</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>Chuyến đi của bạn</h1>
        <Link href="/trips/new"><button>Tạo chuyến đi mới</button></Link>
      </div>

      {trips.length === 0 ? (
        <p style={{ color: '#666' }}>Chưa có chuyến đi nào. Tạo chuyến đi đầu tiên của bạn!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card">
                <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{trip.name}</p>
                <p style={{ fontSize: 13, color: '#666', margin: '4px 0 0' }}>
                  {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'No dates set'}
                  {trip.end_date ? ` – ${new Date(trip.end_date).toLocaleDateString()}` : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}