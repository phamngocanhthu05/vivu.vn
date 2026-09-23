'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

const CATEGORIES = ['khách sạn', 'ăn uống', 'đi lại', 'hoạt động', 'khác'];

export default function BudgetPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [splits, setSplits] = useState([]);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    setUserId(session.user.id);

    const [{ data: tripData, error: tripError }, { data: expenseData }, { data: splitData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('expenses').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
      supabase.from('expense_splits').select('*, expenses!inner(trip_id)').eq('expenses.trip_id', id),
    ]);

    if (tripError) {
      setError('Trip not found or you don\u2019t have access to it.');
    } else {
      setTrip(tripData);
      setExpenses(expenseData || []);
      setSplits(splitData || []);
    }
    setLoading(false);
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!description.trim() || !amountNum || amountNum <= 0) {
      setError('Add a description and a valid amount.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('expenses').insert({
      trip_id: id,
      description: description.trim(),
      amount: amountNum,
      category,
      paid_by: userId,
    });
    setSaving(false);

    if (error) {
      setError(error.message);
    } else {
      setDescription('');
      setAmount('');
      setCategory('other');
      load(); // refetch so splits (created by the DB trigger) come back too
    }
  }

  async function handleDelete(expenseId) {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (!error) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      setSplits((prev) => prev.filter((s) => s.expense_id !== expenseId));
    }
  }

  if (loading) {
    return (
      <div className="container">
        <p>Đang tạo chi phí...</p>
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

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const budget = trip.budget ? Number(trip.budget) : null;
  const pctUsed = budget ? Math.min(100, Math.round((totalSpent / budget) * 100)) : null;
  const currency = trip.currency || 'VND';

  // balances: paid - owed, per user
  const paidByUser = {};
  expenses.forEach((e) => {
    paidByUser[e.paid_by] = (paidByUser[e.paid_by] || 0) + Number(e.amount);
  });
  const owedByUser = {};
  splits.forEach((s) => {
    owedByUser[s.user_id] = (owedByUser[s.user_id] || 0) + Number(s.amount_owed);
  });
  const allUserIds = Array.from(new Set([...Object.keys(paidByUser), ...Object.keys(owedByUser)]));
  const balances = allUserIds.map((uid) => ({
    userId: uid,
    isYou: uid === userId,
    net: (paidByUser[uid] || 0) - (owedByUser[uid] || 0),
  }));

  return (
    <div className="container">
      <Link href={`/trips/${id}`} style={{ fontSize: 13, color: '#666' }}>&larr; Quay lại lịch trình</Link>

      <h1 style={{ fontSize: 22, fontWeight: 500, marginTop: 8, marginBottom: 20 }}>Ngân sách cho {trip.name}</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
          <span>Đã tiêu</span>
          <span style={{ fontWeight: 500 }}>{currency} {totalSpent.toFixed(2)}</span>
        </div>
        {budget ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#666', marginBottom: 8 }}>
              <span>Chi phí</span>
              <span>{currency} {budget.toFixed(2)}</span>
            </div>
            <div style={{ height: 6, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pctUsed}%`, height: '100%', background: pctUsed >= 100 ? '#c0392b' : '#2563eb' }} />
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#666', margin: 0 }}>Chưa có ngân sách cố định cho chuyến đi này.</p>
        )}
      </div>

      {balances.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 500, margin: '0 0 10px' }}>Balances</p>
          {balances.map((b) => (
            <div key={b.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
              <span>{b.isYou ? 'You' : `Member ${b.userId.slice(0, 6)}`}</span>
              <span style={{ color: b.net >= 0 ? '#15803d' : '#c0392b' }}>
                {b.net >= 0 ? `is owed ${currency} ${b.net.toFixed(2)}` : `owes ${currency} ${Math.abs(b.net).toFixed(2)}`}
              </span>
            </div>
          ))}
          <p style={{ fontSize: 11, color: '#999', marginTop: 8, marginBottom: 0 }}>
            Split equally across all trip members for each expense.
          </p>
        </div>
      )}

      <p style={{ fontWeight: 500, marginBottom: 8 }}>Chi phí</p>
      {expenses.length === 0 ? (
        <p style={{ color: '#666', fontSize: 14 }}>Chưa có chi phí.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {expenses.map((e) => (
            <div key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 14 }}>{e.description}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
                  {e.category} · paid by {e.paid_by === userId ? 'you' : `member ${e.paid_by.slice(0, 6)}`}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 500 }}>{currency} {Number(e.amount).toFixed(2)}</span>
                {e.paid_by === userId && <button onClick={() => handleDelete(e.id)}>Xóa</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddExpense} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
        <p style={{ fontWeight: 500, margin: 0 }}>Thêm chi phí</p>
        <input
          type="text"
          placeholder="Tiền cọc khách sạn..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Số tiền"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: 1 }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: 1 }}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Đang thêm chi phí' : 'Thêm chi phí'}</button>
      </form>
    </div>
  );
}
