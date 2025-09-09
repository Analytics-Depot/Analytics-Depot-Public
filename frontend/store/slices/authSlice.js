import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {},
});

const authActions = authSlice.actions;
const authReducer = authSlice.reducer;
export { authActions, authReducer };
