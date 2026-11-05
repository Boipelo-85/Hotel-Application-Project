import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'customer' | 'branch_manager' | 'admin';
  email_verified: boolean;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
  sessionChecking: boolean;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  initialized: false,
  sessionChecking: false,
};

// Async thunks
export const requestCode = createAsyncThunk(
  'auth/requestCode',
  async (email: string, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return rejectWithValue(data.message || data.error || `Failed to request code (Status: ${response.status})`);
      }
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
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
    let response = await fetch('/api/v1/auth/me', { credentials: 'include' });
    if (response.status === 401) {
      const refreshed = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
      if (refreshed.ok) response = await fetch('/api/v1/auth/me', { credentials: 'include' });
    }
    if (!response.ok) {
      throw new Error('Not authenticated');
    }
    return await response.json();
  },
  { condition: (_, { getState }) => !(getState() as { auth: AuthState }).auth.sessionChecking },
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

export const loginWithEmailPassword = createAsyncThunk(
  'auth/loginWithEmailPassword',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return rejectWithValue(data.error?.message || data.message || (typeof data.error === 'string' ? data.error : 'Invalid credentials'));
      }
      const data = await response.json();
      return data.user;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error occurred');
    }
  }
);

export const registerAccount = createAsyncThunk(
  'auth/registerAccount',
  async (
    input: {
      name: string;
      email: string;
      phone?: string;
      password: string;
      confirmPassword: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return rejectWithValue(
          data.error?.message || data.message || 'Unable to create your account.',
        );
      }
      return data.user as User;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Network error occurred',
      );
    }
  },
);

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
        state.error = action.payload as string || action.error.message || 'Failed to request code';
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
        state.sessionChecking = true;
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.initialized = true;
        state.sessionChecking = false;
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.initialized = true;
        state.sessionChecking = false;
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
      })
      // Email/Password Login
      .addCase(loginWithEmailPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithEmailPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginWithEmailPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || action.error.message || 'Login failed';
      })
      .addCase(registerAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(registerAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || action.error.message || 'Registration failed';
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
