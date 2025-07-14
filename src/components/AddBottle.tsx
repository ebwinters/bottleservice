import React, { useState } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, TextField, Button, Autocomplete, Snackbar } from '@mui/material';
import type { Bottle } from '../types/bottle';

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
      {showAdd && (
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
              <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-end', minWidth: 80, bgcolor: settings.secondary_color || '#2a1707', color: '#fff' }}>Add</Button>
            </>
          )}
        </Box>
      )}
      <Snackbar
        open={toastOpen}
        autoHideDuration={1500}
        onClose={() => setToastOpen(false)}
        message={toastMsg}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      />
    </Box>
  );
};

export default AddBottle;
