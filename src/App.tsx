import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { Bottle } from "./types/bottle";
import type { ShelfBottle } from "./types/shelfBottle";
import { ThemeProvider, CssBaseline, Container, AppBar, Toolbar, Typography, Button, Box, Card, CardContent, CardActions, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete } from '@mui/material';
import theme from './mui-theme';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

function App() {
  // Collapsible Add Bottle section
  const [showAdd, setShowAdd] = useState<boolean>(true);
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

  // Filtering + Search
  const [bottleSearch, setBottleSearch] = useState<string>('');
  const filteredShelf = shelfWithMeta.filter(item => {
    if (filter.brand && item.meta?.brand !== filter.brand) return false;
    if (filter.category && item.meta?.category !== filter.category) return false;
    if (bottleSearch) {
      const q = bottleSearch.toLowerCase();
      const name = item.meta?.name?.toLowerCase() || '';
      const custom = item.custom_name?.toLowerCase() || '';
      const brand = item.meta?.brand?.toLowerCase() || '';
      const notes = item.notes?.toLowerCase() || '';
      if (!name.includes(q) && !custom.includes(q) && !brand.includes(q) && !notes.includes(q)) return false;
    }
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
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm">
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  // Get unique brands and categories for filter dropdowns
  const brands = Array.from(new Set(allBottles.map(b => b.brand))).sort();
  const categories = Array.from(new Set(allBottles.map(b => b.category))).sort();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <img
            src="https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/2761b822-ae88-48f9-a09b-49eb40261a50/d6p1u28-6ada434d-15c1-4c67-a52e-81a504637a5b.png/v1/fill/w_1024,h_1024/cartoon_martini_by_deathbycartoon_d6p1u28-fullview.png?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTAyNCIsInBhdGgiOiJcL2ZcLzI3NjFiODIyLWFlODgtNDhmOS1hMDliLTQ5ZWI0MDI2MWE1MFwvZDZwMXUyOC02YWRhNDM0ZC0xNWMxLTRjNjctYTUyZS04MWE1MDQ2MzdhNWIucG5nIiwid2lkdGgiOiI8PTEwMjQifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.WMTSKZ2WFwbV5GlHy1tcGCVHS2WEUiOT3KMmRDHjEjU"
            alt="Martini"
            style={{ background: 'white', height: 36, width: 36, borderRadius: 8, marginRight: 16, boxShadow: '0 2px 8px #fff' }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Bottleservice
          </Typography>
          <Button color="inherit" onClick={handleSignOut}>Sign Out</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <div style={{ margin: '2rem auto' }}>
          {/* Welcome back message */}
          {session && (
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
              Welcome back, {session.user.user_metadata?.full_name || session.user.email}!
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>Can't find a bottle?</div>
              <button
                onClick={() => {
                  window.location.href = 'mailto:bottleserviceapp967@gmail.com?subject=Bottle%20Service%20Feedback';
                }}
                style={{ marginBottom: 8 }}
              >
                Send Feedback
              </button>
            </div>
          </div>
          {/* Add Bottle Form */}
          <Box sx={{
            border: '2px solid',
            borderColor: 'primary.light',
            borderRadius: 2,
            p: 3,
            mb: 3,
            boxShadow: 2,
            maxWidth: 600,
            mx: 'auto',
            bgcolor: 'background.paper',
          }}>
            <Box
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none', mb: showAdd ? 1 : 0 }}
              onClick={() => setShowAdd(v => !v)}
            >
              <Typography variant="h6" color="primary" sx={{ flex: 1 }}>
                Add Bottle
              </Typography>
              <Typography variant="h5" color="primary" sx={{ ml: 1 }}>{showAdd ? '▾' : '▸'}</Typography>
            </Box>
            {showAdd && (
              <Box component="form" onSubmit={handleAddToShelf} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 1 }}>
                <FormControl sx={{ minWidth: 120 }} size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={addBottleType}
                    label="Type"
                    onChange={e => { setAddBottleType(e.target.value); setAddBottleId(''); setAddBottleSearch(''); }}
                  >
                    <MenuItem value=""><em>Select type...</em></MenuItem>
                    {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                  </Select>
                </FormControl>
                <Autocomplete
                  options={allBottles.filter(bottle => !addBottleType || bottle.category === addBottleType)}
                  getOptionLabel={option => `${option.name} (${option.brand})`}
                  value={allBottles.find(b => b.id === addBottleId) || null}
                  onChange={(_e, newValue) => setAddBottleId(newValue ? newValue.id : '')}
                  inputValue={addBottleSearch}
                  onInputChange={(_e, newInputValue) => setAddBottleSearch(newInputValue)}
                  disabled={!addBottleType}
                  renderInput={params => (
                    <TextField {...params} label="Search & Select Bottle" size="small" sx={{ minWidth: 220 }} required />
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                />
                <TextField
                  label="Custom Name"
                  value={addCustomName}
                  onChange={e => setAddCustomName(e.target.value)}
                  size="small"
                />
                <TextField
                  label="Volume (ml)"
                  type="number"
                  value={addVolume}
                  onChange={e => setAddVolume(Number(e.target.value))}
                  size="small"
                  sx={{ width: 100 }}
                  inputProps={{ min: 0 }}
                />
                <TextField
                  label="Notes"
                  value={addNotes}
                  onChange={e => setAddNotes(e.target.value)}
                  size="small"
                />
                <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-end', minWidth: 80 }}>Add</Button>
              </Box>
            )}
          </Box>
          {/* Filter Bar + Search */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filter.category || ''}
                label="Category"
                onChange={e => setFilter(f => ({ ...f, category: e.target.value || undefined }))}
              >
                <MenuItem value="">All</MenuItem>
                {categories.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Brand</InputLabel>
              <Select
                value={filter.brand || ''}
                label="Brand"
                onChange={e => setFilter(f => ({ ...f, brand: e.target.value || undefined }))}
              >
                <MenuItem value="">All</MenuItem>
                {brands.map(brand => <MenuItem key={brand} value={brand}>{brand}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Search your bottles"
              value={bottleSearch}
              onChange={e => setBottleSearch(e.target.value)}
              sx={{ minWidth: 220 }}
            />
          </Box>
          {/* Shelf Grid */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 3,
            mb: 4,
            justifyItems: 'center',
          }}>
            {filteredShelf.map(item => (
              <Card key={item.id} sx={{ maxWidth: 240, width: '100%', bgcolor: 'background.paper', boxShadow: 3 }}>
                {item.meta?.image_url && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                    <img src={item.meta.image_url} alt={item.meta.name} style={{ width: 60, height: 110, objectFit: 'contain', background: '#fff', borderRadius: 6 }} />
                  </Box>
                )}
                <CardContent>
                  {editId === item.id ? (
                    <>
                      <TextField
                        label="Custom Name"
                        value={editCustomName}
                        onChange={e => setEditCustomName(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        label="Volume (ml)"
                        type="number"
                        value={editVolume}
                        onChange={e => setEditVolume(Number(e.target.value))}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                        inputProps={{ min: 0 }}
                      />
                      <TextField
                        label="Notes"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1 }}
                      />
                      <CardActions>
                        <Button onClick={() => handleEditSave(item.id)} variant="contained" size="small" sx={{ mr: 1 }}>Save</Button>
                        <Button onClick={handleEditCancel} variant="outlined" size="small">Cancel</Button>
                      </CardActions>
                    </>
                  ) : (
                    <>
                      <Typography variant="subtitle1" fontWeight={600} align="center">
                        {item.custom_name || item.meta?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" align="center">{item.meta?.brand}</Typography>
                      <Typography variant="body2" align="center">{item.meta?.category}{item.meta?.subcategory ? ` (${item.meta.subcategory})` : ''}</Typography>
                      <Typography variant="body2" align="center">ABV: {item.meta?.abv}%</Typography>
                      <Typography variant="body2" align="center">Vol: {item.current_volume_ml}ml</Typography>
                      {item.notes && <Typography variant="caption" color="text.secondary" display="block">Notes: {item.notes}</Typography>}
                      <Typography variant="caption" color="text.disabled" display="block">Added: {new Date(item.added_at).toLocaleString()}</Typography>
                      <CardActions sx={{ justifyContent: 'center', mt: 1 }}>
                        <Button onClick={() => startEdit(item)} size="small" variant="outlined">Edit</Button>
                        <Button onClick={() => handleRemoveFromShelf(item.id)} size="small" color="error" variant="outlined">Remove</Button>
                      </CardActions>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
          {filteredShelf.length === 0 && <Typography color="text.secondary">No bottles found for selected filters.</Typography>}
        </div>
      </Container>
    </ThemeProvider>
  );
}

export default App;