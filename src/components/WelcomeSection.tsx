import { Box, Typography } from '@mui/material';

export default function WelcomeSection({ session, primaryColor }: { session: any, primaryColor?: string }) {
  return (
    <>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Welcome back message */}
        <div>
          {session && (
            <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>
              Welcome back, {session.user.user_metadata?.full_name || session.user.email}!
            </div>
          )}
        </div>
        {/* Feedback section - moved to top right */}
        <div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2, textAlign: 'right' }}>Can't find a bottle?</div>
          <button
            onClick={() => {
              window.location.href = 'mailto:bottleserviceapp967@gmail.com?subject=Bottle%20Service%20Feedback';
            }}
            style={{
              marginBottom: 8,
              background: primaryColor || '#f0984e',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              boxShadow: '0 2px 8px #0001',
              padding: '0.6em 1.2em',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: '1em',
              letterSpacing: 0.5,
              outline: `2px solid ${primaryColor || '#2a1707'}`,
            }}
          >
            Send Feedback
          </button>
        </div>
      </div>
      {/* App Information Box */}
      <Box sx={{ bgcolor: '#fffbe7', border: '1px solid #ffe0b2', borderRadius: 2, p: 3, mb: 4, boxShadow: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          How to Track Your Home Bar Inventory
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Add bottles to your inventory by selecting from a prefilled list of liquor bottles or by selecting the custom category. Use the View Your Shelf tab to browse and filter your collection. Integrate with the MCP server to support advanced, natural-language querying of your inventory!
        </Typography>
      </Box>
    </>
  );
}
