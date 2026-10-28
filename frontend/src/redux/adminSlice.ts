import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface DashboardStats {
  total_users: number;
  total_branches: number;
  total_rooms: number;
  active_bookings: number;
  pending_bookings: number;
  today_bookings: number;
  today_revenue: string;
  monthly_revenue: string;
  
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'branch_manager' | 'admin';
  email_verified: boolean;
  is_active: boolean;
  phone: string | null;
  created_at: string;
}

interface BranchReport {
  id: string;
  name: string;
  city: string;
  province: string;
  publication_status: string;
  total_rooms: number;
  active_bookings: number;
  monthly_revenue: string;
}

interface AdminState {
  dashboardStats: DashboardStats | null;
  users: User[];
  branchReports: BranchReport[];
  recentBookings: any[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  dashboardStats: null,
  users: [],
  branchReports: [],
  recentBookings: [],
  loading: false,
  error: null,
};

// Dashboard Stats
export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboardStats',
  async () => {
    const response = await fetch('/api/v1/admin/dashboard/stats', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    const data = await response.json();
    return data.stats;
  }
);

export const fetchRecentBookings = createAsyncThunk(
  'admin/fetchRecentBookings',
  async (limit: number = 10) => {
    const response = await fetch(`/api/v1/admin/dashboard/recent-bookings?limit=${limit}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch recent bookings');
    }
    const data = await response.json();
    return data.bookings;
  }
);

// Reports
export const fetchBranchReports = createAsyncThunk(
  'admin/fetchBranchReports',
  async () => {
    const response = await fetch('/api/v1/admin/reports/branches', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch branch reports');
    }
    const data = await response.json();
    return data.branches;
  }
);

export const fetchUserReports = createAsyncThunk(
  'admin/fetchUserReports',
  async () => {
    const response = await fetch('/api/v1/admin/reports/users', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user reports');
    }
    const data = await response.json();
    return data.users;
  }
);

// User Management
export const fetchAllUsers = createAsyncThunk(
  'admin/fetchAllUsers',
  async (params?: { page?: number; limit?: number }) => {
    const urlParams = new URLSearchParams();
    if (params?.page) urlParams.append('page', params.page.toString());
    if (params?.limit) urlParams.append('limit', params.limit.toString());

    const response = await fetch(`/api/v1/admin/users?${urlParams.toString()}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    const data = await response.json();
    return data.users;
  }
);

export const updateUser = createAsyncThunk(
  'admin/updateUser',
  async ({ userId, updates }: { userId: string; updates: { role?: string; is_active?: boolean } }) => {
    const response = await fetch(`/api/v1/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    const data = await response.json();
    return data.user;
  }
);

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  async ({ userId, role }: { userId: string; role: 'customer' | 'branch_manager' }) => {
    const response = await fetch(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      throw new Error('Failed to update user role');
    }
    const data = await response.json();
    return data.user;
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch dashboard stats';
      })
      // Fetch Recent Bookings
      .addCase(fetchRecentBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecentBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.recentBookings = action.payload;
      })
      .addCase(fetchRecentBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch recent bookings';
      })
      // Fetch Branch Reports
      .addCase(fetchBranchReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchReports.fulfilled, (state, action) => {
        state.loading = false;
        state.branchReports = action.payload;
      })
      .addCase(fetchBranchReports.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch branch reports';
      })
      // Fetch User Reports
      .addCase(fetchUserReports.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      // Fetch All Users
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      })
      // Update User
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update user';
      })
      // Update User Role
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = action.payload;
        }
      });
  },
});

export const { clearError } = adminSlice.actions;
export default adminSlice.reducer;
