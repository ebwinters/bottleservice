import { useEffect, useState } from "react";
import bottleLogo from './assets/bottle_logo.jpg';
import { createClient, type Session } from "@supabase/supabase-js";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import type { Bottle } from "./types/bottle";
import type { ShelfBottle } from "./types/shelfBottle";
import type { CustomBottle } from "./types/customBottle";
import { ThemeProvider, CssBaseline, Container, Box, Tabs, Tab, Modal } from '@mui/material';
import UserSettingsForm from './components/UserSettingsForm';
import { getTheme } from './mui-theme';
import ShelfView from './components/ShelfView';
import AddBottle from './components/AddBottle';
import Chat from './components/Chat';
import WelcomeSection from './components/WelcomeSection';
import Header from "./components/Header";

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);


// User settings type
interface UserSettings {
  icon_url: string;
  custom_name: string;
  primary_color: string;
  secondary_color: string;
}

function App() {
  // User settings state
  const [settings, setSettings] = useState<UserSettings>({
    icon_url: '',
    custom_name: '',
    primary_color: '',
    secondary_color: '',
  });
  // Collapsible Add Bottle section
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [shelf, setShelf] = useState<ShelfBottle[]>([]);
  const [customBottles, setCustomBottles] = useState<CustomBottle[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  // Tab state
  const [activeTab, setActiveTab] = useState<number>(0);

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
        .select('icon_url, custom_name, primary_color, secondary_color')
        .eq('user_id', session.user.id)
        .single()
        .then(({ data }) => {
          setSettings({
            icon_url: data?.icon_url || '',
            custom_name: data?.custom_name || '',
            primary_color: data?.primary_color || '',
            secondary_color: data?.secondary_color || ''
          });
        });
    } else {
      setSettings({ icon_url: '', custom_name: '', primary_color: '', secondary_color: '' });
    }
  }, [session]);

  // Fetch all bottles, user shelf, and custom bottles
  useEffect(() => {
    if (session) {
      getAllBottles();
      getUserShelf();
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

// --- Bottle cache ---
let bottlesCache: Bottle[] | null = null;
let bottlesCacheTime: number = 0;
const BOTTLES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (configurable)

async function getAllBottles() {
  const now = Date.now();
  if (bottlesCache && now - bottlesCacheTime < BOTTLES_CACHE_DURATION) {
    setAllBottles(bottlesCache);
    return;
  }
  const { data } = await supabase.from("bottles").select();
  bottlesCache = (data as Bottle[]) || [];
  bottlesCacheTime = now;
  setAllBottles(bottlesCache);
}

  async function getUserShelf() {
    const { data } = await supabase.from("shelf_bottles")
      .select()
      .order('added_at', { ascending: false });
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
  // --- Add/Edit/Remove state and handlers for shelf tab moved to ShelfView ---
  // --- Add/Edit/Remove state and handlers for Add Bottle tab moved to AddBottle ---
  async function handleAddToShelf(input: 
    | { bottleId: string; notes: string; volume: number; cost: number; quantity: number }
    | Array<{ bottleId: string; notes: string; volume: number; cost: number; quantity: number }>
  ) {
    if (!session) return;
    const items = Array.isArray(input) ? input : [input];
    const inserts = items
      .filter(item => !!item.bottleId)
      .map(item => ({
        user_id: session.user.id,
        bottle_id: item.bottleId,
        notes: item.notes,
        current_volume_ml: item.volume,
        cost: item.cost,
        quantity: item.quantity,
      }));
    if (inserts.length === 0) return;
    await supabase.from('shelf_bottles').insert(inserts);
    getUserShelf();
  }
  async function handleAddCustomBottle({ name, subcategory, abv, volume_ml, cost, quantity }: { name: string; subcategory: string; abv: number; volume_ml: number; cost: number; quantity: number }) {
    if (!session) return;
    const { data, status } = await supabase.from('custom_bottles').insert([
      {
        user_id: session.user.id,
        name,
        subcategory,
        abv,
        volume_ml,
        cost,
        quantity,
      }
    ]).select();
    if (status === 201 && data && data[0]) {
      const customBottle = data[0];
      await supabase.from('shelf_bottles').insert([
        {
          user_id: session.user.id,
          bottle_id: customBottle.id,
          notes: '',
          current_volume_ml: customBottle.volume_ml,
          cost,
          quantity,
        }
      ]);
      getCustomBottles(session.user.id);
      getUserShelf();
    }
  }
  async function handleShelfEditSave(id: string, edit: { notes: string; volume: number; cost: string; quantity: number }) {
    if (!session) return;
    await supabase.from('shelf_bottles').update({
      notes: edit.notes,
      current_volume_ml: edit.volume,
      cost: edit.cost === '' ? 0 : Number(edit.cost),
      quantity: edit.quantity,
    }).eq('id', id);
    getUserShelf();
  }
  async function handleRemoveFromShelf(id: string) {
    if (!session) return;
    await supabase.from('shelf_bottles').delete().eq('id', id);
    getUserShelf();
  }

  const theme = getTheme(settings.primary_color, settings.secondary_color);

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
      <Header
        logoUrl={settings.icon_url || bottleLogo}
        barName={settings.custom_name || 'Bottleservice'}
        onSettingsClick={() => setSettingsOpen(true)}
        onSignOut={handleSignOut}
        primaryColor={settings.primary_color}
        secondaryColor={settings.secondary_color}
      />
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
              onSettingsChange={newSettings => setSettings(newSettings)}
            />
          )}
        </Box>
      </Modal>
      {/* MCP Server Banner */}
      <Box sx={{ width: '100%', bgcolor: settings.secondary_color || '#2a1707', color: '#fff', py: 1, px: 2, textAlign: 'center', fontWeight: 600, letterSpacing: 0.5 }}>
        <a
          href="https://github.com/ebwinters/bottleservice-mcp"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: settings.primary_color || '#f0984e', textDecoration: 'underline', fontWeight: 700 }}
        >
          🚀 Check out the new Bottleservice MCP Server! Give AI apps context on your bar inventory.
        </a>
      </Box>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Welcome and Feedback Section */}
        <WelcomeSection session={session} primaryColor={settings.primary_color} />

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
            <AddBottle
              categories={categories}
              allBottles={allBottles}
              settings={{ primary_color: settings.primary_color, secondary_color: settings.secondary_color }}
              session={session}
              onAddToShelf={handleAddToShelf}
              onAddCustomBottle={handleAddCustomBottle}
            />
          )}

          {/* View Shelf Tab */}
          {activeTab === 1 && (
            <ShelfView
              shelfWithMeta={shelfWithMeta}
              categories={categories}
              brands={brands}
              settings={{ primary_color: settings.primary_color, secondary_color: settings.secondary_color }}
              onEditSave={handleShelfEditSave}
              onRemove={handleRemoveFromShelf}
            />
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