import { useEffect, useState } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

type Bottle = {
  name: string;
  brand: string;
  id?: number;
};

function App() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [session, setSession] = useState<Session | null>(null);

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
    if (session) getBottles();
    else setBottles([]);
  }, [session]);

  async function getBottles() {
    const { data } = await supabase.from("bottles").select();
    setBottles((data as Bottle[]) || []);
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (!session) {
    return (
      <div>
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
    return (
      <div style={{ maxWidth: 400, margin: '2rem auto' }}>
        <button onClick={handleSignOut} style={{ float: 'right' }}>Sign Out</button>
        <h3>Welcome to Bottle Service, {session.user.email}</h3>
        <h2>Bottles</h2>
        <ul>
          {bottles.map((bottle) => (
            <li key={bottle.id}>{bottle.name}</li>
          ))}
        </ul>
      </div>
    );
  }
}

export default App;