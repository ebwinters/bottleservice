// Add a type for user settings
export interface UserSettings {
    icon_url: string;
    custom_name: string;
    primary_color: string;
    secondary_color: string;
}
import React, { useEffect, useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress } from '@mui/material';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

interface UserSettingsFormProps {
    userId: string;
    onClose: () => void;
    onIconUrlChange?: (url: string) => void;
    onSettingsChange?: (settings: UserSettings) => void;
}

const fetchUserSettings = async (userId: string) => {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error) return null;
    return data;
};

const upsertUserSettings = async (userId: string, settings: any) => {
    const { error } = await supabase
        .from('user_settings')
        .upsert([{ user_id: userId, ...settings }], { onConflict: 'user_id' });
    if (error) {
        console.error('Error upserting user settings:', error);
        return false;
    }
    return !error;
};

const UserSettingsForm: React.FC<UserSettingsFormProps> = ({ userId, onClose, onIconUrlChange, onSettingsChange }) => {
    const [settings, setSettings] = useState<UserSettings>({
        icon_url: '',
        custom_name: '',
        primary_color: '#222222',
        secondary_color: '#f0984e', // This is the default, but you may want to use primary_color here if you want both to match
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const data = await fetchUserSettings(userId);
            if (data) {
                setSettings({
                    icon_url: data.icon_url || '',
                    custom_name: data.custom_name || '',
                    primary_color: data.primary_color || '#222222',
                    secondary_color: data.secondary_color || '#f0984e', // Same as above, keep as fallback
                });
            }
            setLoading(false);
        })();
    }, [userId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const ok = await upsertUserSettings(userId, settings);
        setLoading(false);
        setSuccess(ok);
        if (ok) {
            if (typeof onIconUrlChange === 'function') {
                onIconUrlChange(settings.icon_url);
            }
            if (typeof onSettingsChange === 'function') {
                onSettingsChange(settings);
            }
            setTimeout(onClose, 1000);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading settings...</Typography>
            </Box>
        );
    }
    return (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" align="center">User Settings</Typography>
            <TextField
                label="Bar Icon Image URL"
                value={settings.icon_url}
                onChange={e => setSettings(s => ({ ...s, icon_url: e.target.value }))}
                placeholder="https://.../logo.png"
                type="url"
                fullWidth
                required={false}
                helperText="Must be a direct link to a .png/.jpg/.jpeg image."
            />
            <TextField
                label="Bar Name"
                value={settings.custom_name}
                onChange={e => setSettings(s => ({ ...s, custom_name: e.target.value }))}
                placeholder="My Home Bar"
                fullWidth
                required={false}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>Primary Color</Typography>
                    <input
                        type="color"
                        value={settings.primary_color}
                        onChange={e => setSettings(s => ({ ...s, primary_color: e.target.value }))}
                        style={{ width: '100%', height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                        required
                    />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>Secondary Color</Typography>
                    <input
                        type="color"
                        value={settings.secondary_color}
                        onChange={e => setSettings(s => ({ ...s, secondary_color: e.target.value }))}
                        style={{ width: '100%', height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                        required
                    />
                </Box>
            </Box>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            {success && <Typography color="success.main" align="center">Settings saved!</Typography>}
            <Button onClick={onClose} color="secondary" sx={{ mt: 1, bgcolor: settings.secondary_color || '#2a1707', color: '#fff' }}>Cancel</Button>
        </Box>
    );
};

export default UserSettingsForm;
