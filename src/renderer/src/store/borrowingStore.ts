import { create } from 'zustand'
import { IBorrowRecord, IBorrowRequest, IReservation } from '../../../types/borrowTypes'
import { useAuthStore } from './authStore'

interface BorrowingState {
  borrowRecords: IBorrowRecord[]
  currentBorrows: IBorrowRecord[]
  overdueBorrows: IBorrowRecord[]
  reservations: IReservation[]
  loading: boolean
  error: string | null

  fetchAllBorrows: () => Promise<void>
  fetchCurrentBorrows: () => Promise<void>
  fetchOverdueBorrows: () => Promise<void>
  borrowBook: (request: IBorrowRequest) => Promise<{
    success: boolean
    message: string
    borrowId?: number
  } | null>
  returnBook: (borrowId: number) => Promise<IBorrowRecord | null>
  renewBook: (borrowId: number) => Promise<IBorrowRecord | null>

  fetchAllReservations: () => Promise<void>
  reserveBook: (bookId: number, readerId: number) => Promise<IReservation | null>
  cancelReservation: (reservationId: number) => Promise<IReservation | null>
}

export const useBorrowingStore = create<BorrowingState>((set, get) => ({
  borrowRecords: [],
  currentBorrows: [],
  overdueBorrows: [],
  reservations: [],
  loading: false,
  error: null,

  fetchAllBorrows: async () => {
    set({ loading: true, error: null })
    try {
      const borrowRecords = await window.api.borrow.getAll()
      set({ borrowRecords, loading: false })
    } catch (error) {
      console.error('Error fetching borrow records:', error)
      set({ error: 'Failed to fetch borrow records', loading: false })
    }
  },

  fetchCurrentBorrows: async () => {
    set({ loading: true, error: null })
    try {
      const currentBorrows = await window.api.borrow.getCurrent()
      set({ currentBorrows, loading: false })
    } catch (error) {
      console.error('Error fetching current borrows:', error)
      set({ error: 'Failed to fetch current borrows', loading: false })
    }
  },

  fetchOverdueBorrows: async () => {
    set({ loading: true, error: null })
    try {
      const overdueBorrows = await window.api.borrow.getOverdue()
      set({ overdueBorrows, loading: false })
    } catch (error) {
      console.error('Error fetching overdue borrows:', error)
      set({ error: 'Failed to fetch overdue borrows', loading: false })
    }
  },

  borrowBook: async (request) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const result = await window.api.borrow.borrowBook(request, userId)
      // Refresh current borrow list
      await get().fetchCurrentBorrows()
      set({ loading: false })
      return result.success ? result : null
    } catch (error) {
      console.error('Error borrowing book:', error)
      set({ error: 'Failed to borrow book', loading: false })
      return null
    }
  },

  returnBook: async (borrowId) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const result = await window.api.borrow.returnBook(borrowId, userId)
      // Refresh current borrow list and all borrow list
      await Promise.all([get().fetchCurrentBorrows(), get().fetchAllBorrows()])
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error returning book:', error)
      set({ error: 'Failed to return book', loading: false })
      return null
    }
  },

  renewBook: async (borrowId) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const result = await window.api.borrow.renewBook(borrowId, userId)
      // Refresh current borrow list
      await get().fetchCurrentBorrows()
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error renewing book:', error)
      set({ error: 'Failed to renew book', loading: false })
      return null
    }
  },

  fetchAllReservations: async () => {
    set({ loading: true, error: null })
    try {
      const reservations = await window.api.reservation.getAll()
      set({ reservations, loading: false })
    } catch (error) {
      console.error('Error fetching reservations:', error)
      set({ error: 'Failed to fetch reservations', loading: false })
    }
  },

  reserveBook: async (bookId, readerId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.reservation.reserve(bookId, readerId)
      // Refresh reservations list
      await get().fetchAllReservations()
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error reserving book:', error)
      set({ error: 'Failed to reserve book', loading: false })
      return null
    }
  },

  cancelReservation: async (reservationId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.reservation.cancel(reservationId)
      // Refresh reservations list
      await get().fetchAllReservations()
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      set({ error: 'Failed to cancel reservation', loading: false })
      return null
    }
  }
}))
