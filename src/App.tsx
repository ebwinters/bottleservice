import { useEffect, useState } from "react";
import bottleLogo from './assets/bottle_logo.jpg';
import { createClient, type Session } from "@supabase/supabase-js";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { Bottle } from "./types/bottle";
import type { ShelfBottle } from "./types/shelfBottle";
import type { CustomBottle } from "./types/customBottle";
import { ThemeProvider, CssBaseline, Container, AppBar, Toolbar, Typography, Button, Box, Card, CardContent, CardActions, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Tabs, Tab, IconButton, Modal } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import UserSettingsForm from './components/UserSettingsForm';
import theme from './mui-theme';
import Chat from './components/Chat';
import WelcomeSection from './components/WelcomeSection';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const VOLUME_OPTIONS = [50, 375, 700, 750];

// User settings type
interface UserSettings {
  icon_url: string;
  custom_name: string;
}

function App() {
  // User settings state
  const [settings, setSettings] = useState<UserSettings>({
    icon_url: '',
    custom_name: '',
  });
  // Collapsible Add Bottle section
  const [showAdd, setShowAdd] = useState<boolean>(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [shelf, setShelf] = useState<ShelfBottle[]>([]);
  const [customBottles, setCustomBottles] = useState<CustomBottle[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [filter, setFilter] = useState<{ brand?: string; category?: string }>({});
  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

  const [addVolumeOption, setAddVolumeOption] = useState<number | string>(750);
  const [editVolumeOption, setEditVolumeOption] = useState<number | string>(750);

  const [addCost, setAddCost] = useState<number>(0);
  const [editCost, setEditCost] = useState<string>('');

  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [editQuantity, setEditQuantity] = useState<number>(1);

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

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from('user_settings')
        .select('icon_url, custom_name')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          setSettings({
            icon_url: data?.icon_url || '',
            custom_name: data?.custom_name || '',
          });
        });
    } else {
      setSettings({ icon_url: '', custom_name: '' });
    }
  }, [session]);

  // Fetch all bottles, user shelf, and custom bottles
  useEffect(() => {
    if (session) {
      getAllBottles();
      getUserShelf(session.user.id);
      getCustomBottles(session.user.id);
    } else {
      setAllBottles([]);
      setShelf([]);
      setCustomBottles([]);
    }
  }, [session]);
  async function getCustomBottles(userId: string) {
    const { data } = await supabase.from("custom_bottles").select().eq('user_id', userId);
    setCustomBottles((data as CustomBottle[]) || []);
  }

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

  // Merge shelf with bottle metadata and custom bottles
  const shelfWithMeta = shelf.map(shelfBottle => {
    // If bottle_id matches a regular bottle
    const meta = allBottles.find(b => b.id === shelfBottle.bottle_id);
    // If not found, check if it's a custom bottle
    const custom = customBottles.find(cb => cb.id === shelfBottle.bottle_id);
    return { ...shelfBottle, meta, custom };
  });

  // Filtering + Search
  const [bottleSearch, setBottleSearch] = useState<string>('');
  const filteredShelf = shelfWithMeta.filter(item => {
    // Category filter: if "Custom", only show custom bottles
    if (filter.category === 'Custom') {
      if (!item.custom) return false;
    } else {
      if (filter.brand && item.meta?.brand !== filter.brand) return false;
      if (filter.category && item.meta?.category !== filter.category) return false;
    }
    if (bottleSearch) {
      const q = bottleSearch.toLowerCase();
      const name = item.meta?.name?.toLowerCase() || item.custom?.name?.toLowerCase() || '';
      // Removed customName from search
      const brand = item.meta?.brand?.toLowerCase() || '';
      const notes = item.notes?.toLowerCase() || '';
      const subcat = item.custom?.subcategory?.toLowerCase() || '';
      if (!name.includes(q) && !brand.includes(q) && !notes.includes(q) && !subcat.includes(q)) return false;
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
  const [addABV, setAddABV] = useState<number>(40);
  const [editId, setEditId] = useState<string | null>(null);
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
        // custom_name removed
        notes: addNotes,
        current_volume_ml: addVolume,
        cost: addCost,
        quantity: addQuantity,
      },
    ]);
    setAddBottleId(''); setAddCustomName(''); setAddNotes(''); setAddVolume(750); setAddCost(0); setAddQuantity(1);
    getUserShelf(session.user.id);
  }
  async function handleRemoveFromShelf(id: string) {
    if (!session) return;
    await supabase.from('shelf_bottles').delete().eq('id', id);
    getUserShelf(session.user.id);
  }
  function startEdit(item: typeof shelfWithMeta[number]) {
    setEditId(item.id);
    setEditNotes(item.notes);
    setEditVolume(item.current_volume_ml);
    setEditCost(item.cost !== undefined && item.cost !== null && item.cost !== 0 ? String(item.cost) : '');
    setEditQuantity(item.quantity !== undefined && item.quantity !== null ? item.quantity : 1);
  }
  async function handleEditSave(id: string) {
    if (!session) return;
    await supabase.from('shelf_bottles').update({
      notes: editNotes,
      current_volume_ml: editVolume,
      cost: editCost === '' ? 0 : Number(editCost),
      quantity: editQuantity,
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
          <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <img src={settings.icon_url || bottleLogo} alt="Bottleservice Logo" style={{ width: 90, height: 90, borderRadius: 16, marginBottom: 24, boxShadow: '0 2px 12px #0002' }} />
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
  const categories = [
    ...Array.from(new Set(allBottles.map(b => b.category))).sort(),
    'Custom',
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary" elevation={1}>
        <Toolbar>
          <img
            src={settings.icon_url || bottleLogo}
            alt="Bottleservice Logo"
            style={{ background: 'white', height: 40, width: 40, borderRadius: 10, marginRight: 16, boxShadow: '0 2px 8px #fff' }}
          />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>
            {settings.custom_name || 'Bottleservice'}
          </Typography>
          <IconButton color="inherit" aria-label="settings" onClick={() => setSettingsOpen(true)} sx={{ mr: 1 }}>
            <SettingsIcon />
          </IconButton>
          <Button color="inherit" onClick={handleSignOut}>Sign Out</Button>
        </Toolbar>
      </AppBar>
      {/* Settings Modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        aria-labelledby="settings-modal-title"
        aria-describedby="settings-modal-desc"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            border: '2px solid #000',
            boxShadow: 24,
            p: 0,
            minWidth: 340,
            borderRadius: 2,
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {session?.user?.id && (
            <UserSettingsForm
              userId={session.user.id}
              onClose={() => setSettingsOpen(false)}
              onIconUrlChange={iconUrl => setSettings(s => ({ ...s, icon_url: iconUrl }))}
            />
          )}
        </Box>
      </Modal>
      {/* MCP Server Banner */}
      <Box sx={{ width: '100%', bgcolor: '#222', color: '#fff', py: 1, px: 2, textAlign: 'center', fontWeight: 600, letterSpacing: 0.5 }}>
        <a
          href="https://github.com/ebwinters/bottleservice-mcp"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#f0984e', textDecoration: 'underline', fontWeight: 700 }}
        >
          🚀 Check out the new Bottleservice MCP Server! Give AI apps context on your bar inventory.
        </a>
      </Box>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Welcome and Feedback Section */}
        <WelcomeSection session={session} />

        {/* Tabs */}
        <Box sx={{ width: '100%', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_event, newValue) => setActiveTab(newValue)}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
              }
            }}
          >
            <Tab label="Add a Bottle" />
            <Tab label="View Your Shelf" />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <div style={{ margin: '1rem auto' }}>
          {/* Add Bottle Tab */}
          {activeTab === 0 && (
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
                  {/* If type is Custom, show custom bottle form, else show regular bottle autocomplete */}
                  {addBottleType === 'Custom' ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 220 }}>
                      <TextField label="Name" value={addCustomName} onChange={e => setAddCustomName(e.target.value)} size="small" required />
                      <TextField label="Subcategory" value={addNotes} onChange={e => setAddNotes(e.target.value)} size="small" required />
                      <TextField label="ABV (%)" type="number" value={addABV} onChange={e => setAddABV(Number(e.target.value))} size="small" required />
                      <FormControl size="small" required>
                        <InputLabel>Volume (ml)</InputLabel>
                        <Select
                          value={addVolumeOption}
                          label="Volume (ml)"
                          onChange={e => {
                            const val = e.target.value;
                            setAddVolumeOption(val);
                            if (val !== 'custom') setAddVolume(Number(val));
                            else setAddVolume(0);
                          }}
                          sx={{ minWidth: 100 }}
                        >
                          {VOLUME_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt} mL</MenuItem>
                          ))}
                          <MenuItem value="custom">Custom...</MenuItem>
                        </Select>
                      </FormControl>
                      {addVolumeOption === 'custom' && (
                        <TextField
                          label="Custom Volume (ml)"
                          type="number"
                          value={addVolume || ''}
                          onChange={e => setAddVolume(Number(e.target.value))}
                          size="small"
                          required
                          sx={{ minWidth: 100 }}
                          inputProps={{ min: 1 }}
                        />
                      )}
                      <TextField
                        label="Cost ($)"
                        type="number"
                        value={addCost}
                        onChange={e => setAddCost(Number(e.target.value))}
                        size="small"
                        sx={{ minWidth: 100 }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        label="Quantity"
                        type="number"
                        value={addQuantity}
                        onChange={e => setAddQuantity(Number(e.target.value))}
                        size="small"
                        required
                        sx={{ minWidth: 100 }}
                        inputProps={{ min: 1 }}
                      />
                      <Button variant="contained" onClick={async () => {
                        if (!session) return;
                        // Create the custom bottle
                        const { data, status } = await supabase.from('custom_bottles').insert([
                          {
                            user_id: session.user.id,
                            name: addCustomName,
                            subcategory: addNotes,
                            abv: addABV,
                            volume_ml: addVolume,
                            cost: addCost,
                            quantity: addQuantity,
                          }
                        ]).select();
                        if (status === 201 && data && data[0]) {
                          const customBottle = data[0];
                          // Add to shelf_bottles
                          await supabase.from('shelf_bottles').insert([
                            {
                              user_id: session.user.id,
                              bottle_id: customBottle.id,
                              // custom_name removed
                              notes: '',
                              current_volume_ml: customBottle.volume_ml,
                              cost: addCost,
                              quantity: addQuantity,
                            }
                          ]);
                          getCustomBottles(session.user.id);
                          getUserShelf(session.user.id);
                          setAddCustomName('');
                          setAddNotes('');
                          setAddVolume(750);
                          setAddABV(40);
                          setAddCost(0);
                          setAddQuantity(1);
                        } else {
                          alert('Failed to add custom bottle');
                        }
                      }}>Create Custom Bottle</Button>
                    </Box>
                  ) : (
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
                  )}
                  {addBottleType !== 'Custom' && (
                    <>
                      <FormControl size="small">
                        <InputLabel>Volume (ml)</InputLabel>
                        <Select
                          value={addVolumeOption}
                          label="Volume (ml)"
                          onChange={e => {
                            const val = e.target.value;
                            setAddVolumeOption(val);
                            if (val !== 'custom') setAddVolume(Number(val));
                            else setAddVolume(0);
                          }}
                          sx={{ width: 100 }}
                        >
                          {VOLUME_OPTIONS.map(opt => (
                            <MenuItem key={opt} value={opt}>{opt} mL</MenuItem>
                          ))}
                          <MenuItem value="custom">Custom...</MenuItem>
                        </Select>
                      </FormControl>
                      {addVolumeOption === 'custom' && (
                        <TextField
                          label="Custom Volume (ml)"
                          type="number"
                          value={addVolume || ''}
                          onChange={e => setAddVolume(Number(e.target.value))}
                          size="small"
                          sx={{ width: 100 }}
                          inputProps={{ min: 1 }}
                          required
                        />
                      )}
                      <TextField
                        label="Cost ($)"
                        type="number"
                        value={addCost}
                        onChange={e => setAddCost(Number(e.target.value))}
                        size="small"
                        sx={{ width: 100 }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                      <TextField
                        label="Quantity"
                        type="number"
                        value={addQuantity}
                        onChange={e => setAddQuantity(Number(e.target.value))}
                        size="small"
                        sx={{ width: 100 }}
                        inputProps={{ min: 1 }}
                        required
                      />
                      <TextField
                        label="Notes"
                        value={addNotes}
                        onChange={e => setAddNotes(e.target.value)}
                        size="small"
                      />
                      <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-end', minWidth: 80 }}>Add</Button>
                    </>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* View Shelf Tab */}
          {activeTab === 1 && (
            <>
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
                          <FormControl size="small" fullWidth sx={{ mb: 1 }}>
                            <InputLabel>Volume (ml)</InputLabel>
                            <Select
                              value={editVolumeOption}
                              label="Volume (ml)"
                              onChange={e => {
                                const val = e.target.value;
                                setEditVolumeOption(val);
                                if (val !== 'custom') setEditVolume(Number(val));
                                else setEditVolume(0);
                              }}
                            >
                              {VOLUME_OPTIONS.map(opt => (
                                <MenuItem key={opt} value={opt}>{opt} mL</MenuItem>
                              ))}
                              <MenuItem value="custom">Custom...</MenuItem>
                            </Select>
                          </FormControl>
                          {editVolumeOption === 'custom' && (
                            <TextField
                              label="Custom Volume (ml)"
                              type="number"
                              value={editVolume || ''}
                              onChange={e => setEditVolume(Number(e.target.value))}
                              size="small"
                              fullWidth
                              sx={{ mb: 1 }}
                              inputProps={{ min: 1 }}
                              required
                            />
                          )}
                          <TextField
                            label="Notes"
                            value={editNotes}
                            onChange={e => setEditNotes(e.target.value)}
                            size="small"
                            fullWidth
                            sx={{ mb: 1 }}
                          />
                          <TextField
                            label="Cost ($)"
                            type="number"
                            value={editCost}
                            onChange={e => setEditCost(e.target.value.replace(/^0+(?=\d)/, ''))}
                            size="small"
                            fullWidth
                            sx={{ mb: 1 }}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                          <TextField
                            label="Quantity"
                            type="number"
                            value={editQuantity}
                            onChange={e => setEditQuantity(Number(e.target.value))}
                            size="small"
                            fullWidth
                            sx={{ mb: 1 }}
                            inputProps={{ min: 1 }}
                            required
                          />
                          <CardActions>
                            <Button onClick={() => handleEditSave(item.id)} variant="contained" size="small" sx={{ mr: 1 }}>Save</Button>
                            <Button onClick={handleEditCancel} variant="outlined" size="small">Cancel</Button>
                          </CardActions>
                        </>
                      ) : (
                        <>
                          <Typography variant="subtitle1" fontWeight={600} align="center">
                            {item.custom ? item.custom.name : (item.meta?.name)}
                          </Typography>
                          {item.custom ? (
                            <>
                              <Typography variant="body2" color="text.secondary" align="center">Custom Bottle</Typography>
                              <Typography variant="body2" align="center">{item.custom.subcategory}</Typography>
                              <Typography variant="body2" align="center">ABV: {item.custom.abv}%</Typography>
                              <Typography variant="body2" align="center">Vol: {item.custom.volume_ml}ml</Typography>
                              <Typography variant="body2" align="center">Cost: ${typeof item.cost === 'number' ? item.cost.toFixed(2) : (item.custom.cost ? item.custom.cost.toFixed(2) : '0.00')}</Typography>
                              <Typography variant="body2" align="center">Qty: {item.quantity ?? 1}</Typography>
                            </>
                          ) : (
                            <>
                              <Typography variant="body2" color="text.secondary" align="center">{item.meta?.brand}</Typography>
                              <Typography variant="body2" align="center">{item.meta?.category}{item.meta?.subcategory ? ` (${item.meta.subcategory})` : ''}</Typography>
                              <Typography variant="body2" align="center">ABV: {item.meta?.abv}%</Typography>
                              <Typography variant="body2" align="center">Vol: {item.current_volume_ml}ml</Typography>
                              <Typography variant="body2" align="center">Cost: ${typeof item.cost === 'number' ? item.cost.toFixed(2) : '0.00'}</Typography>
                              <Typography variant="body2" align="center">Qty: {item.quantity ?? 1}</Typography>
                            </>
                          )}
                          {item.notes && <Typography variant="caption" color="text.secondary" display="block">Notes: {item.notes}</Typography>}
                          <Typography variant="caption" color="text.disabled" display="block" align="center">Added: {new Date(item.added_at).toLocaleString()}</Typography>
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
            </>
          )}
        </div>
      </Container>
      {/* Chat Component with user's bottle collection */}
      {session && (
        <Chat
          bottles={shelfWithMeta.map(bottle => ({
            name: bottle.custom ? bottle.custom.name : (bottle.meta?.name || ''),
            category: bottle.custom ? bottle.custom.subcategory : (bottle.meta?.category || ''),
            cost: bottle.custom ? bottle.custom.cost : (bottle.cost || 0),
          }))}
        />
      )}
    </ThemeProvider>
  );
}

export default App;