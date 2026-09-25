'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabaseClient';

const CATEGORIES = ['khách sạn', 'ăn uống', 'đi lại', 'hoạt động', 'khác'];

function labelForMember(member, userId) {
  if (member.id === userId) return 'Bạn';
  if (member.name) return member.name;
  if (member.email) return member.email;
  return `Thành viên ${member.id.slice(0, 6)}`;
}

export default function BudgetPage({ params }) {
  const { id } = use(params);
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [splits, setSplits] = useState([]);
  const [members, setMembers] = useState([]); // [{ id, name, email }]
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' | 'custom'
  const [customAmounts, setCustomAmounts] = useState({}); // { [userId]: string }
  const [saving, setSaving] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const router = useRouter();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // default to "split with everyone" once we know who the members are
  useEffect(() => {
    if (members.length > 0 && selectedMembers.size === 0) {
      setSelectedMembers(new Set(members.map((m) => m.id)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members]);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    const currentUserId = session.user.id;
    setUserId(currentUserId);

    const [{ data: tripData, error: tripError }, { data: expenseData }, { data: splitData }] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('expenses').select('*').eq('trip_id', id).order('created_at', { ascending: false }),
      supabase.from('expense_splits').select('*, expenses!inner(trip_id)').eq('expenses.trip_id', id),
    ]);

    if (tripError) {
      setError('Trip not found or you don\u2019t have access to it.');
      setLoading(false);
      return;
    }

    setTrip(tripData);
    setExpenses(expenseData || []);
    setSplits(splitData || []);

    await loadMembers(currentUserId, expenseData || [], splitData || []);
    setLoading(false);
  }

  async function loadMembers(currentUserId, expenseData, splitData) {
    // Preferred: a trip_members table, optionally joined to profiles for a display name.
const { data: memberRows, error: memberError } = await supabase
  .from('trip_members')
  .select('user_id, name, profiles(email, full_name)')
  .eq('trip_id', id);

if (!memberError && memberRows && memberRows.length > 0) {
  setMembers(
    memberRows.map((row) => ({
      id: row.user_id,
      name: row.name || row.profiles?.full_name || null,
      email: row.profiles?.email || null,
    }))
  );
  return;
}

    // Fallback: infer participants from who has paid or owed on this trip so far,
    // plus the current user, so the form is still usable.
    const inferredIds = new Set([
      currentUserId,
      ...expenseData.map((e) => e.paid_by),
      ...splitData.map((s) => s.user_id),
    ]);
    setMembers(Array.from(inferredIds).map((uid) => ({ id: uid, name: null, email: null })));
  }

 async function handleAddMember(e) {
   e.preventDefault();
   const name = newMemberName.trim();
   if (!name) return;

 setAddingMember(true);
  const newId = crypto.randomUUID();

  console.log('inserting trip_members row:', { trip_id: id, user_id: newId, name, role: 'viewer' });

  const { error: addError } = await supabase.from('trip_members').insert({
    trip_id: id,
    user_id: newId,
    name,
    role: 'viewer',
  });

  setAddingMember(false);

  if (addError) {
    setError(addError.message);
    return;
  }

  const newMember = { id: newId, name, email: null };
  setMembers((prev) => [...prev, newMember]);
  setSelectedMembers((prev) => new Set(prev).add(newId));
  setNewMemberName('');
}

  function toggleMember(uid) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  }

  function computeSplits(amountNum) {
    const ids = Array.from(selectedMembers);
    if (ids.length === 0) return { error: 'Chọn ít nhất một người để chia chi phí này.' };

    if (splitMode === 'equal') {
      // Split evenly, but keep the total exact to the cent by giving any
      // rounding remainder to the first person in the list.
      const share = Math.floor((amountNum / ids.length) * 100) / 100;
      const allocated = Math.round(share * ids.length * 100) / 100;
      const remainder = Math.round((amountNum - allocated) * 100) / 100;
      const owed = {};
      ids.forEach((uid, idx) => {
        owed[uid] = idx === 0 ? Math.round((share + remainder) * 100) / 100 : share;
      });
      return { owed };
    }

    // custom mode: use what's typed in for each selected member
    const owed = {};
    let total = 0;
    for (const uid of ids) {
      const val = parseFloat(customAmounts[uid]);
      if (isNaN(val) || val < 0) {
        return { error: 'Nhập số tiền hợp lệ cho mỗi người đã chọn.' };
      }
      owed[uid] = val;
      total += val;
    }
    if (Math.abs(total - amountNum) > 0.01) {
      return { error: `Tổng số tiền chia (${total.toFixed(2)}) phải bằng tổng chi phí (${amountNum.toFixed(2)}).` };
    }
    return { owed };
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!description.trim() || !amountNum || amountNum <= 0) {
      setError('Add a description and a valid amount.');
      return;
    }

    const result = computeSplits(amountNum);
    if (result.error) {
      setError(result.error);
      return;
    }

    setSaving(true);

    const { data: newExpense, error: insertError } = await supabase
      .from('expenses')
      .insert({
        trip_id: id,
        description: description.trim(),
        amount: amountNum,
        category,
        paid_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    const splitRows = Object.entries(result.owed).map(([uid, owedAmount]) => ({
      expense_id: newExpense.id,
      user_id: uid,
      amount_owed: owedAmount,
    }));

    const { error: splitError } = await supabase.from('expense_splits').insert(splitRows);

    setSaving(false);

    if (splitError) {
      setError(`Expense saved, but splits failed: ${splitError.message}`);
      load();
      return;
    }

    setDescription('');
    setAmount('');
    setCategory('other');
    setCustomAmounts({});
    setSplitMode('equal');
    load();
  }

  async function handleDelete(expenseId) {
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
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
  const amountNum = parseFloat(amount) || 0;

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

  function splitLabelForExpense(expenseId) {
    const rows = splits.filter((s) => s.expense_id === expenseId);
    if (rows.length === 0) return null;
    return rows
      .map((s) => {
        const m = members.find((mm) => mm.id === s.user_id);
        const name = m ? labelForMember(m, userId) : `Thành viên ${s.user_id.slice(0, 6)}`;
        return `${name} (${currency} ${Number(s.amount_owed).toFixed(2)})`;
      })
      .join(', ');
  }

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
                {b.net >= 0 ? `is owed ${currency} ${b.net.toFixed(2)}` : `đang nợ ${currency} ${Math.abs(b.net).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>
      )}

      <p style={{ fontWeight: 500, marginBottom: 8 }}>Chi phí</p>
      {expenses.length === 0 ? (
        <p style={{ color: '#666', fontSize: 14 }}>Chưa có chi phí.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {expenses.map((e) => (
            <div key={e.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14 }}>{e.description}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
                    {e.category} · được trả bởi {e.paid_by === userId ? 'you' : `member ${e.paid_by.slice(0, 6)}`}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 500 }}>{currency} {Number(e.amount).toFixed(2)}</span>
                  {e.paid_by === userId && <button onClick={() => handleDelete(e.id)}>Xóa</button>}
                </div>
              </div>
              {splitLabelForExpense(e.id) && (
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#999' }}>
                  Chia cho: {splitLabelForExpense(e.id)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAddExpense} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
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

        <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontWeight: 500, margin: 0, fontSize: 13 }}>Chia cho ai?</p>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => setSplitMode('equal')}
                style={{
                  fontSize: 12,
                  padding: '3px 8px',
                  background: splitMode === 'equal' ? '#2563eb' : '#eee',
                  color: splitMode === 'equal' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                Chia đều
              </button>
              <button
                type="button"
                onClick={() => setSplitMode('custom')}
                style={{
                  fontSize: 12,
                  padding: '3px 8px',
                  background: splitMode === 'custom' ? '#2563eb' : '#eee',
                  color: splitMode === 'custom' ? '#fff' : '#333',
                  border: 'none',
                  borderRadius: 4,
                }}
              >
                Tùy chỉnh
              </button>
            </div>
          </div>
        
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
  <input
    type="text"
    placeholder="Tên thành viên mới..."
    value={newMemberName}
    onChange={(e) => setNewMemberName(e.target.value)}
    style={{ flex: 1, fontSize: 13 }}
  />
  <button type="button" onClick={handleAddMember} disabled={addingMember} style={{ fontSize: 12 }}>
    {addingMember ? '...' : '+ Thêm'}
  </button>
</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {members.map((m) => {
              const checked = selectedMembers.has(m.id);
              const equalShare = checked && selectedMembers.size > 0 ? amountNum / selectedMembers.size : 0;
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMember(m.id)}
                  />
                  <span style={{ flex: 1 }}>{labelForMember(m, userId)}</span>
                  {checked && splitMode === 'equal' && (
                    <span style={{ color: '#666' }}>{currency} {equalShare.toFixed(2)}</span>
                  )}
                  {checked && splitMode === 'custom' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={customAmounts[m.id] || ''}
                      onChange={(e) =>
                        setCustomAmounts((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      style={{ width: 90 }}
                    />
                  )}
                </div>
              );
            })}
            {members.length === 0 && (
              <p style={{ fontSize: 12, color: '#999', margin: 0 }}>Không tìm thấy thành viên nào cho chuyến đi này.</p>
            )}
          </div>
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Đang thêm chi phí' : 'Thêm chi phí'}</button>
      </form>
    </div>
  );
}
