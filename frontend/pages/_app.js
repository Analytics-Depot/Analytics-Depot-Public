import "../styles/globals.css";
import { Provider } from "react-redux";
import store from "../store/store";
import { useEffect } from "react";
import { useRouter } from "next/router";
import supabase from "../lib/supabase";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        "Auth state change:",
        event,
        session ? "has session" : "no session"
      );

      if (event === "SIGNED_IN") {
        // User signed in
        if (session?.access_token) {
          localStorage.setItem("supabase_token", session.access_token);
          localStorage.setItem("isLoggedIn", "true");

          // Store user data if available
          if (session.user) {
            localStorage.setItem(
              "userData",
              JSON.stringify({
                id: session.user.id,
                email: session.user.email,
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.email?.split("@")[0],
              })
            );
          }
        }
      } else if (event === "SIGNED_OUT") {
        // User signed out
        localStorage.removeItem("supabase_token");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userData");
        localStorage.removeItem("supabase_session");
      } else if (event === "TOKEN_REFRESHED") {
        // Token refreshed
        if (session?.access_token) {
          localStorage.setItem("supabase_token", session.access_token);
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, [router]);

  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}

export default MyApp;
