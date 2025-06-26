import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);


// Bottle metadata (all bottles)
type Bottle = {
  id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  abv: number;
  volume_ml: number;
  image_url: string | null;
  created_at: string;
};

// User's shelf bottle
type ShelfBottle = {
  id: string;
  user_id: string;
  bottle_id: string;
  custom_name: string;
  current_volume_ml: number;
  notes: string;
  added_at: string;
};


function App() {
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [shelf, setShelf] = useState<ShelfBottle[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState<{ brand?: string; category?: string }>({});

  // Fetch session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch all bottles and user shelf
  useEffect(() => {
    if (session) {
      getAllBottles();
      getUserShelf(session.user.id);
    } else {
      setAllBottles([]);
      setShelf([]);
    }
  }, [session]);

  async function getAllBottles() {
    const { data } = await supabase.from("bottles").select();
    setAllBottles((data as Bottle[]) || []);
  }

  async function getUserShelf(userId: string) {
    const { data } = await supabase.from("shelf_bottles").select().eq('user_id', userId);
    setShelf((data as ShelfBottle[]) || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  // Merge shelf with bottle metadata
  const shelfWithMeta = shelf.map(shelfBottle => {
    const meta = allBottles.find(b => b.id === shelfBottle.bottle_id);
    return { ...shelfBottle, meta };
  });

  // Filtering
  const filteredShelf = shelfWithMeta.filter(item => {
    if (filter.brand && item.meta?.brand !== filter.brand) return false;
    if (filter.category && item.meta?.category !== filter.category) return false;
    return true;
  });

  // --- Add/Edit/Remove state (must be at top level) ---
  const [addBottleId, setAddBottleId] = useState<string>('');
  const [addBottleType, setAddBottleType] = useState<string>('');
  const [addBottleSearch, setAddBottleSearch] = useState<string>('');
  const [addCustomName, setAddCustomName] = useState<string>('');
  const [addNotes, setAddNotes] = useState<string>('');
  const [addVolume, setAddVolume] = useState<number>(750);
  const [editId, setEditId] = useState<string | null>(null);
  const [editCustomName, setEditCustomName] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editVolume, setEditVolume] = useState<number>(750);

  // --- Add/Edit/Remove handlers (must be at top level) ---
  async function handleAddToShelf(e: React.FormEvent) {
    e.preventDefault();
    if (!addBottleId || !session) return;
    await supabase.from('shelf_bottles').insert([
      {
        user_id: session.user.id,
        bottle_id: addBottleId,
        custom_name: addCustomName,
        notes: addNotes,
        current_volume_ml: addVolume,
      },
    ]);
    setAddBottleId(''); setAddCustomName(''); setAddNotes(''); setAddVolume(750);
    getUserShelf(session.user.id);
  }
  async function handleRemoveFromShelf(id: string) {
    if (!session) return;
    await supabase.from('shelf_bottles').delete().eq('id', id);
    getUserShelf(session.user.id);
  }
  function startEdit(item: typeof shelfWithMeta[number]) {
    setEditId(item.id);
    setEditCustomName(item.custom_name);
    setEditNotes(item.notes);
    setEditVolume(item.current_volume_ml);
  }
  async function handleEditSave(id: string) {
    if (!session) return;
    await supabase.from('shelf_bottles').update({
      custom_name: editCustomName,
      notes: editNotes,
      current_volume_ml: editVolume,
    }).eq('id', id);
    setEditId(null);
    getUserShelf(session.user.id);
  }
  function handleEditCancel() {
    setEditId(null);
  }

  if (!session) {
    return (
      <div className="auth-center">
        <Auth
          supabaseClient={supabase}
          providers={["github"]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  inputBackground: '#fff',
                  inputText: '#222',
                  inputLabelText: '#222',
                  brand: '#222',
                  brandAccent: '#222',
                },
              },
            },
          }}
        />
      </div>
    );
  }

  // Get unique brands and categories for filter dropdowns
  const brands = Array.from(new Set(allBottles.map(b => b.brand))).sort();
  const categories = Array.from(new Set(allBottles.map(b => b.category))).sort();

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto' }}>
      <button onClick={handleSignOut} style={{ float: 'right' }}>Sign Out</button>
      <div style={{ float: 'right', marginRight: 8, textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>Can't find a bottle?</div>
        <button
          onClick={() => {
            window.location.href = 'mailto:ebwinters@comcast.net?subject=Bottle%20Service%20Feedback';
          }}
        >
          Send Feedback
        </button>
      </div>
      <h3>Welcome to Bottle Service, {session.user.email}</h3>
      <h2>Your Shelf</h2>
      {/* Add to shelf form */}
      <form onSubmit={handleAddToShelf} style={{ marginBottom: 24, background: '#222', padding: 16, borderRadius: 8 }}>
        <label>
          Type:
          <select value={addBottleType} onChange={e => { setAddBottleType(e.target.value); setAddBottleId(''); setAddBottleSearch(''); }} style={{ marginLeft: 8 }}>
            <option value="">Select type...</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </label>
        <label style={{ marginLeft: 16 }}>
          Search:
          <input
            type="text"
            value={addBottleSearch}
            onChange={e => setAddBottleSearch(e.target.value)}
            placeholder="Search bottles..."
            disabled={!addBottleType}
            style={{ marginLeft: 8, width: 120 }}
          />
        </label>
        <label style={{ marginLeft: 16 }}>
          Add Bottle:
          <select required value={addBottleId} onChange={e => setAddBottleId(e.target.value)} disabled={!addBottleType} style={{ marginLeft: 8 }}>
            <option value="">{addBottleType ? 'Select a bottle...' : 'Select type first'}</option>
            {allBottles
              .filter(bottle => !addBottleType || bottle.category === addBottleType)
              .filter(bottle =>
                !addBottleSearch ||
                bottle.name.toLowerCase().includes(addBottleSearch.toLowerCase()) ||
                bottle.brand.toLowerCase().includes(addBottleSearch.toLowerCase())
              )
              .map(bottle => (
                <option key={bottle.id} value={bottle.id}>{bottle.name} ({bottle.brand})</option>
              ))}
          </select>
        </label>
        <input
          type="text"
          placeholder="Custom Name (optional)"
          value={addCustomName}
          onChange={e => setAddCustomName(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <input
          type="number"
          placeholder="Volume (ml)"
          value={addVolume}
          onChange={e => setAddVolume(Number(e.target.value))}
          min={0}
          style={{ marginLeft: 8, width: 80 }}
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={addNotes}
          onChange={e => setAddNotes(e.target.value)}
          style={{ marginLeft: 8 }}
        />
        <button type="submit" style={{ marginLeft: 8 }}>Add</button>
      </form>
      {/* Filter controls */}
      <div style={{ marginBottom: 16 }}>
        <label>
          Filter by Category:
          <select value={filter.category || ''} onChange={e => setFilter(f => ({ ...f, category: e.target.value || undefined }))}>
            <option value="">All</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </label>
        <label style={{ marginLeft: 16 }}>
          Filter by Brand:
          <select value={filter.brand || ''} onChange={e => setFilter(f => ({ ...f, brand: e.target.value || undefined }))}>
            <option value="">All</option>
            {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </label>
      </div>
      {/* Shelf grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 220px))',
        gap: 20,
        marginBottom: 24,
        justifyContent: 'center',
      }}>
        {filteredShelf.map(item => (
          <div key={item.id} style={{
            background: '#222',
            border: '1px solid #444',
            borderRadius: 10,
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            maxWidth: 180,
            minHeight: 0
          }}>
            {item.meta?.image_url && (
              <img src={item.meta.image_url} alt={item.meta.name} style={{ width: 60, height: 110, objectFit: 'contain', background: '#fff', borderRadius: 6, marginBottom: 6 }} />
            )}
            {editId === item.id ? (
              <>
                <input
                  type="text"
                  value={editCustomName}
                  onChange={e => setEditCustomName(e.target.value)}
                  placeholder="Custom Name"
                  style={{ marginBottom: 6 }}
                />
                <input
                  type="number"
                  value={editVolume}
                  onChange={e => setEditVolume(Number(e.target.value))}
                  min={0}
                  style={{ width: 80, marginBottom: 6 }}
                />
                <input
                  type="text"
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  style={{ marginBottom: 6 }}
                />
                <div>
                  <button onClick={() => handleEditSave(item.id)} style={{ marginRight: 6 }}>Save</button>
                  <button onClick={handleEditCancel}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontWeight: 'bold', fontSize: 15, textAlign: 'center', marginBottom: 2 }}>{item.custom_name || item.meta?.name}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 1 }}>{item.meta?.brand}</div>
                <div style={{ fontSize: 12, marginBottom: 1 }}>{item.meta?.category}{item.meta?.subcategory ? ` (${item.meta.subcategory})` : ''}</div>
                <div style={{ fontSize: 12, marginBottom: 1 }}>ABV: {item.meta?.abv}%</div>
                <div style={{ fontSize: 12, marginBottom: 1 }}>Vol: {item.current_volume_ml}ml</div>
                {item.notes && <div style={{ fontSize: 11, color: '#ccc', marginBottom: 1 }}>Notes: {item.notes}</div>}
                <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>Added: {new Date(item.added_at).toLocaleString()}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(item)} style={{ marginTop: 2, fontSize: 12, padding: '2px 6px' }}>Edit</button>
                  <button onClick={() => handleRemoveFromShelf(item.id)} style={{ marginTop: 2, fontSize: 12, padding: '2px 6px' }}>Remove</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {filteredShelf.length === 0 && <div style={{ color: '#aaa' }}>No bottles found for selected filters.</div>}
    </div>
  );
}

export default App;