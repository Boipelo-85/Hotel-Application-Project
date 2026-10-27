import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Review {
  id: string;
  user_id: string;
  branch_id: string;
  booking_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    name: string;
  };
}

interface ReviewState {
  reviews: Review[];
  currentReview: Review | null;
  loading: boolean;
  error: string | null;
}

const initialState: ReviewState = {
  reviews: [],
  currentReview: null,
  loading: false,
  error: null,
};

export const fetchBranchReviews = createAsyncThunk(
  'reviews/fetchBranchReviews',
  async (branchId: string) => {
    const response = await fetch(`/api/v1/branches/${branchId}/reviews`);
    if (!response.ok) {
      throw new Error('Failed to fetch reviews');
    }
    const data = await response.json();
    return data.reviews;
  }
);

export const createReview = createAsyncThunk(
  'reviews/createReview',
  async (reviewData: {
    branchId: string;
    bookingId: string;
    rating: number;
    comment?: string;
  }) => {
    const response = await fetch('/api/v1/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(reviewData),
    });
    if (!response.ok) {
      throw new Error('Failed to create review');
    }
    const data = await response.json();
    return data.review;
  }
);

export const updateReview = createAsyncThunk(
  'reviews/updateReview',
  async ({ reviewId, updates }: { reviewId: string; updates: { rating?: number; comment?: string } }) => {
    const response = await fetch(`/api/v1/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error('Failed to update review');
    }
    const data = await response.json();
    return data.review;
  }
);

export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId: string) => {
    const response = await fetch(`/api/v1/reviews/${reviewId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to delete review');
    }
    return reviewId;
  }
);

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentReview: (state, action) => {
      state.currentReview = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Branch Reviews
      .addCase(fetchBranchReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBranchReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = action.payload;
      })
      .addCase(fetchBranchReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch reviews';
      })
      // Create Review
      .addCase(createReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews.unshift(action.payload);
        state.currentReview = action.payload;
      })
      .addCase(createReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create review';
      })
      // Update Review
      .addCase(updateReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateReview.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.reviews.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reviews[index] = action.payload;
        }
        if (state.currentReview?.id === action.payload.id) {
          state.currentReview = action.payload;
        }
      })
      .addCase(updateReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update review';
      })
      // Delete Review
      .addCase(deleteReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.loading = false;
        state.reviews = state.reviews.filter((r) => r.id !== action.payload);
        if (state.currentReview?.id === action.payload) {
          state.currentReview = null;
        }
      })
      .addCase(deleteReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to delete review';
      });
  },
});

export const { clearError, setCurrentReview } = reviewSlice.actions;
export default reviewSlice.reducer;
