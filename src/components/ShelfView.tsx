import React, { useState } from 'react';
import { Box, FormControl, InputLabel, Select, MenuItem, TextField, Card, CardContent, CardActions, Typography, Button } from '@mui/material';

const VOLUME_OPTIONS = [50, 375, 700, 750];

interface ShelfViewProps {
  shelfWithMeta: Array<any>;
  categories: string[];
  brands: string[];
  settings: {
    primary_color: string;
    secondary_color: string;
  };
  onEditSave: (id: string, edit: { notes: string; volume: number; cost: string; quantity: number }) => void;
  onRemove: (id: string) => void;
}

const ShelfView: React.FC<ShelfViewProps> = ({ shelfWithMeta, categories, brands, onEditSave, onRemove }) => {
  const [filter, setFilter] = useState<{ brand?: string; category?: string }>({});
  const [bottleSearch, setBottleSearch] = useState<string>('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editVolume, setEditVolume] = useState<number>(750);
  const [editVolumeOption, setEditVolumeOption] = useState<number | string>(750);
  const [editCost, setEditCost] = useState<string>('');
  const [editQuantity, setEditQuantity] = useState<number>(1);

  const filteredShelf = shelfWithMeta.filter(item => {
    if (filter.category === 'Custom') {
      if (!item.custom) return false;
    } else {
      if (filter.brand && item.meta?.brand !== filter.brand) return false;
      if (filter.category && item.meta?.category !== filter.category) return false;
    }
    if (bottleSearch) {
      const q = bottleSearch.toLowerCase();
      const name = item.meta?.name?.toLowerCase() || item.custom?.name?.toLowerCase() || '';
      const brand = item.meta?.brand?.toLowerCase() || '';
      const notes = item.notes?.toLowerCase() || '';
      const subcat = item.custom?.subcategory?.toLowerCase() || '';
      if (!name.includes(q) && !brand.includes(q) && !notes.includes(q) && !subcat.includes(q)) return false;
    }
    return true;
  });

  function startEdit(item: typeof shelfWithMeta[number]) {
    setEditId(item.id);
    setEditNotes(item.notes);
    setEditVolume(item.current_volume_ml);
    setEditVolumeOption(item.current_volume_ml);
    setEditCost(item.cost !== undefined && item.cost !== null && item.cost !== 0 ? String(item.cost) : '');
    setEditQuantity(item.quantity !== undefined && item.quantity !== null ? item.quantity : 1);
  }

  function handleEditSaveLocal(id: string) {
    onEditSave(id, {
      notes: editNotes,
      volume: editVolume,
      cost: editCost,
      quantity: editQuantity,
    });
    setEditId(null);
  }

  function handleEditCancel() {
    setEditId(null);
  }

  return (
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
                    <Button onClick={() => handleEditSaveLocal(item.id)} variant="contained" size="small" sx={{ mr: 1 }}>Save</Button>
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
                    <Button onClick={() => onRemove(item.id)} size="small" color="error" variant="outlined">Remove</Button>
                  </CardActions>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
      {filteredShelf.length === 0 && <Typography color="text.secondary">No bottles found for selected filters.</Typography>}
    </>
  );
};

export default ShelfView;
