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

  if (!session) {
    return (
      <div className="auth-center">
        <Auth
          supabaseClient={supabase}
          providers={[]}
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
  } else {
    // Get unique brands and categories for filter dropdowns
    const brands = Array.from(new Set(allBottles.map(b => b.brand))).sort();
    const categories = Array.from(new Set(allBottles.map(b => b.category))).sort();

    return (
      <div style={{ maxWidth: 700, margin: '2rem auto' }}>
        <button onClick={handleSignOut} style={{ float: 'right' }}>Sign Out</button>
        <h3>Welcome to Bottle Service, {session.user.email}</h3>
        <h2>Your Shelf</h2>
        <div style={{ marginBottom: 16 }}>
          <label>
            Filter by Brand:
            <select value={filter.brand || ''} onChange={e => setFilter(f => ({ ...f, brand: e.target.value || undefined }))}>
              <option value="">All</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </label>
          <label style={{ marginLeft: 16 }}>
            Filter by Category:
            <select value={filter.category || ''} onChange={e => setFilter(f => ({ ...f, category: e.target.value || undefined }))}>
              <option value="">All</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </label>
        </div>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {filteredShelf.map(item => (
            <li key={item.id} style={{ border: '1px solid #444', borderRadius: 8, marginBottom: 12, padding: 12, background: '#222' }}>
              <div style={{ fontWeight: 'bold', fontSize: 18 }}>{item.custom_name || item.meta?.name}</div>
              <div>Brand: {item.meta?.brand}</div>
              <div>Category: {item.meta?.category} {item.meta?.subcategory ? `(${item.meta.subcategory})` : ''}</div>
              <div>ABV: {item.meta?.abv}%</div>
              <div>Volume: {item.current_volume_ml}ml</div>
              {item.notes && <div>Notes: {item.notes}</div>}
              <div style={{ fontSize: 12, color: '#aaa' }}>Added: {new Date(item.added_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
        {filteredShelf.length === 0 && <div style={{ color: '#aaa' }}>No bottles found for selected filters.</div>}
      </div>
    );
  }
}

export default App;