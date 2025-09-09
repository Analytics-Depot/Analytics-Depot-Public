// Simple authentication utilities
// This file provides basic authentication helper functions

export const isAuthenticated = () => {
  const token = localStorage.getItem("supabase_token");
  const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
  return token && isLoggedIn;
};

export const getAuthToken = () => {
  return localStorage.getItem("supabase_token");
};

export const getAccessToken = () => {
  return localStorage.getItem("supabase_token");
};

export const clearAuth = () => {
  localStorage.removeItem("supabase_token");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userData");
};
