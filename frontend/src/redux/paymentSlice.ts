import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

interface Payment {
  id: string;
  booking_id: string;
  provider: string;
  provider_transaction_reference: string | null;
  checkout_url: string | null;
  amount: string;
  currency: string;
  status: 'pending' | 'successful' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

interface PaymentState {
  payments: Payment[];
  currentPayment: Payment | null;
  loading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  payments: [],
  currentPayment: null,
  loading: false,
  error: null,
};

export const initiatePayment = createAsyncThunk(
  'payments/initiatePayment',
  async (bookingId: string) => {
    const response = await fetch('/api/v1/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ bookingId }),
    });
    if (!response.ok) {
      throw new Error('Failed to initiate payment');
    }
    const data = await response.json();
    return data.payment;
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payments/fetchPaymentById',
  async (paymentId: string) => {
    const response = await fetch(`/api/v1/payments/${paymentId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payment');
    }
    const data = await response.json();
    return data.payment;
  }
);

export const fetchPaymentsByBookingId = createAsyncThunk(
  'payments/fetchPaymentsByBookingId',
  async (bookingId: string) => {
    const response = await fetch(`/api/v1/payments/bookings/${bookingId}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to fetch payments');
    }
    const data = await response.json();
    return data.payments;
  }
);

const paymentSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPayment: (state, action) => {
      state.currentPayment = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Initiate Payment
      .addCase(initiatePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload;
        state.payments.unshift(action.payload);
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to initiate payment';
      })
      // Fetch Payment By ID
      .addCase(fetchPaymentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPayment = action.payload;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payment';
      })
      // Fetch Payments By Booking ID
      .addCase(fetchPaymentsByBookingId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentsByBookingId.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload;
      })
      .addCase(fetchPaymentsByBookingId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch payments';
      });
  },
});

export const { clearError, setCurrentPayment } = paymentSlice.actions;
export default paymentSlice.reducer;
