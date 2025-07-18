import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Autocomplete, Snackbar, Tooltip, CircularProgress, Modal, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import type { Bottle } from '../types/bottle';
import { createClient } from '@supabase/supabase-js';
import Fuse from 'fuse.js'

const VOLUME_OPTIONS = [100, 375, 700, 750];

interface AddBottleProps {
  categories: string[];
  allBottles: Bottle[];
  settings: {
    primary_color: string;
    secondary_color: string;
  };
  session: any;
  onAddToShelf: (bottle: {
    bottleId: string;
    notes: string;
    volume: number;
    cost: number;
    quantity: number;
  }) => Promise<void>;
  onAddCustomBottle: (custom: {
    name: string;
    subcategory: string;
    abv: number;
    volume_ml: number;
    cost: number;
    quantity: number;
  }) => Promise<void>;
}

const AddBottle: React.FC<AddBottleProps> = ({ categories, allBottles, settings, onAddToShelf, onAddCustomBottle }) => {
  const [showAdd, setShowAdd] = useState<boolean>(true);
  const [addBottleId, setAddBottleId] = useState<string>('');
  const [addBottleType, setAddBottleType] = useState<string>('');
  const [addBottleSearch, setAddBottleSearch] = useState<string>('');
  const [addCustomName, setAddCustomName] = useState<string>('');
  const [addNotes, setAddNotes] = useState<string>('');
  const [addVolume, setAddVolume] = useState<number>(750);
  const [addVolumeOption, setAddVolumeOption] = useState<number | string>(750);
  const [addABV, setAddABV] = useState<number>(40);
  const [addCost, setAddCost] = useState<number>(0);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [scanMatches, setScanMatches] = useState<{ detected: any; match: Bottle | null }[]>([]);
  const [showMatchesOverlay, setShowMatchesOverlay] = useState(false);

  return (
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
        <Typography variant="h6" color="primary" sx={{ flex: 1, color: settings.secondary_color || '#2a1707' }}>
          Add Bottle
        </Typography>
        <Typography variant="h5" color="primary" sx={{ ml: 1 }}>{showAdd ? '▾' : '▸'}</Typography>
      </Box>
      {showAdd && (<div>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Tooltip title="Scan your bar with AI (take a picture)">
            <span>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PhotoCameraIcon />}
                disabled={aiLoading}
                sx={{ textTransform: 'none', bgcolor: settings.secondary_color || '#6c47ff' }}
                onClick={async () => {
                  setAiLoading(true);
                  // Open camera to take a picture
                  try {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = async (e: any) => {
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        // Simulate AI scan delay
                        setTimeout(() => {
                          setToastMsg('AI detected bottles in your bar! 🧠🥃');
                          setToastOpen(true);
                          const reader = new FileReader();
                          reader.onload = function (ev) {
                            const dataUrl = ev.target?.result as string;
                            if (dataUrl) {
                              // Call the streaming API with the base64 image and session token
                              const scanBottles = async () => {
                                try {
                                  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                                  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                                  // Initialize Supabase client
                                  const supabase = createClient(supabaseUrl, supabaseAnonKey);

                                  const { data: { session } } = await supabase.auth.getSession();
                                  const token = session?.access_token;

                                  const response = await fetch('https://xxckpfkcabiaulshekyb.supabase.co/functions/v1/image-scan', {
                                    method: 'POST',
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ base64ImageUrl: dataUrl })
                                  });
                                  if (!response.body) throw new Error('No response body');
                                  const reader = response.body.getReader();
                                  let result = '';
                                  const decoder = new TextDecoder();
                                  while (true) {
                                    const { done, value } = await reader.read();
                                    if (done) break;
                                    result += decoder.decode(value, { stream: true });
                                  }
                                  setAiLoading(false);
                                  let parsed: { name: string; count: number; type: string }[] = [];
                                  try {
                                    const arr = JSON.parse(result);
                                    if (Array.isArray(arr)) {
                                      parsed = arr
                                        .filter(
                                          (item: any) =>
                                            typeof item.name === 'string' &&
                                            typeof item.count === 'number' &&
                                            typeof item.type === 'string'
                                        )
                                        .map((item: any) => ({
                                          name: item.name,
                                          count: item.count,
                                          type: item.type,
                                        }));
                                    }
                                  } catch (e) {
                                    console.error('Failed to parse scan result:', e);
                                  }
                                  const fuse = new Fuse(allBottles, { keys: ['name', 'brand'], threshold: 0.35 });
                                  const matches = parsed.map(r => {
                                    const res = fuse.search(r.name);
                                    if (res.length === 0) return { detected: r, match: null };
                                    return { detected: r, match: res[0]?.item };
                                  });
                                  setScanMatches(matches);
                                  setShowMatchesOverlay(true);
                                } catch (err) {
                                  console.error('Error streaming image-scan:', err);
                                }
                              };
                              scanBottles();
                            }
                          };
                          reader.readAsDataURL(file);
                        }, 1500);
                      } else {
                        setAiLoading(false);
                      }
                    };
                    input.click();
                  } catch (err) {
                    setAiLoading(false);
                  }
                }}
              >
                {aiLoading ? <CircularProgress size={20} color="inherit" /> : 'AI Scan'}
              </Button>
            </span>
          </Tooltip>
        </Box>
        <Box component="form" onSubmit={async e => {
          e.preventDefault();
          if (addBottleType === 'Custom') {
            await onAddCustomBottle({
              name: addCustomName,
              subcategory: addNotes,
              abv: addABV,
              volume_ml: addVolume,
              cost: addCost,
              quantity: addQuantity,
            });
            setToastMsg(`Successfully added ${addCustomName} to your shelf`);
            setToastOpen(true);
            setAddCustomName('');
            setAddNotes('');
            setAddVolume(750);
            setAddABV(40);
            setAddCost(0);
            setAddQuantity(1);
          } else {
            const bottle = allBottles.find(b => b.id === addBottleId);
            await onAddToShelf({
              bottleId: addBottleId,
              notes: addNotes,
              volume: addVolume,
              cost: addCost,
              quantity: addQuantity,
            });
            setToastMsg(`Successfully added ${bottle ? bottle.name : 'bottle'} to your shelf`);
            setToastOpen(true);
            setAddBottleId('');
            setAddNotes('');
            setAddVolume(750);
            setAddCost(0);
            setAddQuantity(1);
          }
        }} sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mt: 1 }}>
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
              <Button type="submit" variant="contained">Create Custom Bottle</Button>
            </Box>
          ) : (
            <>
              <Autocomplete
                options={allBottles.filter(bottle => !addBottleType || bottle.category === addBottleType)}
                getOptionLabel={option => `${option.name} (${option.brand})`}
                value={allBottles.find(b => b.id === addBottleId) || null}
                onChange={(_e, newValue) => {
                  if (newValue) {
                    setAddBottleId(newValue.id);
                    if (!addBottleType && newValue.category) {
                      setAddBottleType(newValue.category);
                    }
                  } else {
                    setAddBottleId('');
                  }
                }}
                inputValue={addBottleSearch}
                onInputChange={(_e, newInputValue) => setAddBottleSearch(newInputValue)}
                renderInput={params => (
                  <TextField {...params} label="Search & Select Bottle" size="small" sx={{ minWidth: 220 }} required />
                )}
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
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
              <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-end', minWidth: 80, bgcolor: settings.primary_color || '#2a1707', color: '#fff' }}>Add</Button>
            </>
          )}
        </Box>
      </div>
      )}
      <Snackbar
        open={toastOpen}
        autoHideDuration={1500}
        onClose={() => setToastOpen(false)}
        message={toastMsg}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      />
      {/* Overlay for scan matches */}
      <Modal
        open={showMatchesOverlay}
        onClose={() => setShowMatchesOverlay(false)}
        aria-labelledby="scan-matches-title"
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Paper sx={{ p: 3, minWidth: 500, maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', position: 'relative' }}>
          <IconButton
            aria-label="close"
            onClick={() => setShowMatchesOverlay(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
          <Typography id="scan-matches-title" variant="h6" sx={{ mb: 2 }}>
            AI Scan Results
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell>Subcategory</TableCell>
                  <TableCell>ABV</TableCell>
                  <TableCell>Volume (ml)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scanMatches.map((m, idx) => m.match && (
                  <TableRow key={idx}>
                    <TableCell>{m.match ? m.match.name : m.detected.name}</TableCell>
                    <TableCell>{m.match ? m.match.category : ''}</TableCell>
                    <TableCell>{m.match ? m.match.brand : ''}</TableCell>
                    <TableCell>{m.match ? m.match.subcategory : ''}</TableCell>
                    <TableCell>{m.match ? m.match.abv : ''}</TableCell>
                    <TableCell>{m.match ? m.match.volume_ml : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Modal>
    </Box>
  );
};

export default AddBottle;
