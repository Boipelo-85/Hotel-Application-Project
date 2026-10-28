import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'branch_manager' | 'admin';
  email_verified: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
};

// Async thunks
export const requestCode = createAsyncThunk(
  'auth/requestCode',
  async (email: string) => {
    const response = await fetch('/api/v1/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to request code');
    }
    return await response.json();
  }
);

export const verifyCode = createAsyncThunk(
  'auth/verifyCode',
  async ({ email, code, name }: { email: string; code: string; name?: string }) => {
    const response = await fetch('/api/v1/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, code, name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Invalid code');
    }
    return await response.json();
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async () => {
    const response = await fetch('/api/v1/auth/me', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    return await response.json();
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  const response = await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok && response.status !== 204) {
    throw new Error('Failed to logout');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Request Code
      .addCase(requestCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(requestCode.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(requestCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to request code';
      })
      // Verify Code
      .addCase(verifyCode.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Invalid code';
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
