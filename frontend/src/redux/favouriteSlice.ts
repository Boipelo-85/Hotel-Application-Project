import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Favourite {
  id: string;
  user_id: string;
  branch_id: string;
  created_at: string;
  branch?: {
    id: string;
    name: string;
    city: string;
    province: string;
    address: string;
    star_rating: number | null;
    price_per_night: string;
    currency: string;
  };
}

interface FavouriteState {
  favourites: Favourite[];
  loading: boolean;
  error: string | null;
}

const initialState: FavouriteState = {
  favourites: [],
  loading: false,
  error: null,
};

export const fetchFavourites = createAsyncThunk(
  'favourites/fetchFavourites',
  async () => {
    const response = await fetch('/api/v1/favourites', {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch favourites');
    }
    const data = await response.json();
    return data.favourites;
  }
);

export const addFavourite = createAsyncThunk(
  'favourites/addFavourite',
  async (branchId: string) => {
    const response = await fetch('/api/v1/favourites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ branchId }),
    });
    if (!response.ok) {
      throw new Error('Failed to add favourite');
    }
    const data = await response.json();
    return data.favourite;
  }
);

export const removeFavourite = createAsyncThunk(
  'favourites/removeFavourite',
  async (branchId: string) => {
    const response = await fetch(`/api/v1/favourites/${branchId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to remove favourite');
    }
    return branchId;
  }
);

export const checkFavourite = createAsyncThunk(
  'favourites/checkFavourite',
  async (branchId: string) => {
    const response = await fetch(`/api/v1/favourites/check/${branchId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to check favourite');
    }
    const data = await response.json();
    return data.isFavourite;
  }
);

const favouriteSlice = createSlice({
  name: 'favourites',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Favourites
      .addCase(fetchFavourites.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavourites.fulfilled, (state, action) => {
        state.loading = false;
        state.favourites = action.payload;
      })
      .addCase(fetchFavourites.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch favourites';
      })
      // Add Favourite
      .addCase(addFavourite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addFavourite.fulfilled, (state, action) => {
        state.loading = false;
        state.favourites.push(action.payload);
      })
      .addCase(addFavourite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to add favourite';
      })
      // Remove Favourite
      .addCase(removeFavourite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFavourite.fulfilled, (state, action) => {
        state.loading = false;
        state.favourites = state.favourites.filter((f) => f.branch_id !== action.payload);
      })
      .addCase(removeFavourite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to remove favourite';
      });
  },
});

export const { clearError } = favouriteSlice.actions;
export default favouriteSlice.reducer;
