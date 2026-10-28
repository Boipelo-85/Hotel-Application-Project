import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface Room {
  id: string;
  branch_id: string;
  room_type: string;
  description: string | null;
  capacity: number;
  quantity?: number;
  quantity_available?: number;
  price?: string;
  price_per_night?: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

interface RoomState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
}

const initialState: RoomState = {
  rooms: [],
  loading: false,
  error: null,
};

export const fetchRooms = createAsyncThunk(
  'rooms/fetchRooms',
  async (branchId?: string) => {
    const url = branchId
      ? `/api/v1/branches/${branchId}/rooms`
      : '/api/v1/rooms';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch rooms');
    }
    const data = await response.json();
    return data.rooms || data;
  }
);

export const fetchRoomById = createAsyncThunk(
  'rooms/fetchRoomById',
  async (roomId: string) => {
    const response = await fetch(`/api/v1/rooms/${roomId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch room');
    }
    const data = await response.json();
    return data.room;
  }
);

const roomSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Rooms
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.rooms = action.payload || [];
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rooms';
      })
      // Fetch Room By ID
      .addCase(fetchRoomById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoomById.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.rooms.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        } else {
          state.rooms.push(action.payload);
        }
      })
      .addCase(fetchRoomById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch room';
      });
  },
});

export const { clearError } = roomSlice.actions;
export default roomSlice.reducer;
