import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface BranchImage {
  id: string;
  url: string;
  altText?: string | null;
  displayOrder?: number;
}

export interface BranchAmenity {
  id: string;
  name: string;
  category: string | null;
}

export interface Branch {
  id: string;
  brand_id: string;
  manager_user_id: string | null;
  name: string;
  city: string;
  province: string;
  address: string;
  star_rating: number | null;
  description: string | null;
  policies: Record<string, string>;
  price_per_night: string;
  currency: string;
  contact_email: string | null;
  contact_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  images: BranchImage[];
  amenities: BranchAmenity[];
  average_rating: number | null;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  branch: {
    id: string;
    name: string;
    city: string;
    province: string;
    address: string;
    starRating?: number | null;
    pricePerNight?: string;
    currency?: string;
    description?: string | null;
    images?: BranchImage[];
    policies?: Record<string, string>;
    latitude?: number | null;
    longitude?: number | null;
  };
  roomType: string;
  price: string;
  currency: string;
  availableRooms: number;
  capacity: number;
}

interface HotelState {
  branches: Branch[];
  currentBranch: Branch | null;
  searchResults: SearchResult[];
  loading: boolean;
  error: string | null;
}

const initialState: HotelState = {
  branches: [],
  currentBranch: null,
  searchResults: [],
  loading: false,
  error: null,
};

export const fetchBranches = createAsyncThunk(
  'hotels/fetchBranches',
  async (filters?: { city?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.city) params.append('city', filters.city);
    if (filters?.search) params.append('search', filters.search);

    const url = `/api/v1/branches${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch branches');
    }
    const data = await response.json();
    const list = data.branches || data;
    return Array.isArray(list) ? list : [];
  }
);

export const fetchBranchById = createAsyncThunk(
  'hotels/fetchBranchById',
  async (branchId: string) => {
    const response = await fetch(`/api/v1/branches/${branchId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch branch');
    }
    const data = await response.json();
    return data.branch;
  }
);

export const searchAvailability = createAsyncThunk(
  'hotels/searchAvailability',
  async (filters: {
    destination: string;
    checkIn: string;
    checkOut: string;
    rooms: string;
    guests: string;
  }) => {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/v1/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to search availability');
    }
    return (await response.json()) as SearchResult[];
  }
);

const hotelSlice = createSlice({
  name: 'hotels',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentBranch: (state, action) => {
      state.currentBranch = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Branches
      .addCase(fetchBranches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.branches = action.payload;
      })
      .addCase(fetchBranches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch branches';
      })
      // Fetch Branch By ID
      .addCase(fetchBranchById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentBranch = action.payload;
      })
      .addCase(fetchBranchById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch branch';
      })
      .addCase(searchAvailability.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchAvailability.fulfilled, (state, action) => {
        state.loading = false;
        state.searchResults = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(searchAvailability.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to search availability';
      });
  },
});

export const { clearError, setCurrentBranch } = hotelSlice.actions;
export default hotelSlice.reducer;
