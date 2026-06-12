import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { isAdminRole, isPrivilegedRole, isReceptionRole, isSpecialistRole } from "../lib/roles";

const AuthContext = createContext();

function normalizeAuthUser(user) {
  if (!user) return null;

  return {
    ...user,
    uid: user.id,
  };
}

function normalizeProfile(profile) {
  if (!profile) return null;

  return {
    ...profile,
    name: profile.full_name,
  };
}

async function loadProfileByUserId(userId) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, active, specialist_id")
    .eq("id", userId)
    .maybeSingle();

  console.log("PROFILE DATA:", profile);
  console.log("PROFILE ERROR:", profileError);

  if (profileError) {
    throw profileError;
  }

  return profile;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;

    async function syncSession(currentSession) {
      setLoading(true);
      setAuthError("");

      const authUser = currentSession?.user || null;

      if (!authUser) {
        if (!active) return;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        console.log("AUTH USER:", authUser);
        console.log("AUTH USER ID:", authUser?.id);

        const profileResult = await loadProfileByUserId(authUser.id);

        if (!profileResult) {
          await supabase.auth.signOut();
          if (!active) return;
          setUser(null);
          setProfile(null);
          setAuthError("La cuenta aún no ha sido inicializada.");
          setLoading(false);
          return;
        }

        if (profileResult.active === false) {
          await supabase.auth.signOut();
          if (!active) return;
          setUser(null);
          setProfile(null);
          setAuthError("Tu cuenta está desactivada. Contacta al administrador.");
          setLoading(false);
          return;
        }

        if (!active) return;

        setUser(normalizeAuthUser(authUser));
        setProfile(normalizeProfile(profileResult));
      } catch (error) {
        console.error("Error loading auth profile", error);
        await supabase.auth.signOut();

        if (!active) return;
        setUser(null);
        setProfile(null);
        setAuthError(error?.message || "No fue posible validar tus permisos.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Error getting Supabase session", error);
          setAuthError(error.message || "No fue posible recuperar la sesión.");
          setLoading(false);
          return;
        }

        return syncSession(data.session);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setAuthError("");

    console.log("LOGIN EMAIL:", email);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email || "").trim(),
      password,
    });

    console.log("AUTH DATA:", data);
    console.log("AUTH ERROR:", error);
    console.log("AUTH USER:", data?.user || null);
    console.log("AUTH USER ID:", data?.user?.id);

    if (error) {
      throw error;
    }

    const profileResult = await loadProfileByUserId(data.user.id);

    if (!profileResult) {
      await supabase.auth.signOut();
      const profileMissingError = new Error("La cuenta aún no ha sido inicializada.");
      profileMissingError.code = "profile/not-found";
      throw profileMissingError;
    }

    if (profileResult.active === false) {
      await supabase.auth.signOut();
      const disabledError = new Error("Tu cuenta está desactivada. Contacta al administrador.");
      disabledError.code = "profile/inactive";
      throw disabledError;
    }

    setUser(normalizeAuthUser(data.user));
    setProfile(normalizeProfile(profileResult));

    return { user: data.user, profile: profileResult };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAuthError("");
  };

  const updateOwnPassword = async ({ currentPassword, nextPassword }) => {
    const currentUser = user;

    if (!currentUser?.email) {
      throw new Error("No active session");
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });

    if (reauthError) {
      throw reauthError;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: nextPassword,
    });

    if (updateError) {
      throw updateError;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        login,
        logout,
        loading,
        authError,
        isOwner: isPrivilegedRole(profile?.role),
        isAdmin: isAdminRole(profile?.role),
        isReception: isReceptionRole(profile?.role),
        isSpecialist: isSpecialistRole(profile?.role),
        updateOwnPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
