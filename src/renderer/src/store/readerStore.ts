import { create } from 'zustand'
import { IReader } from '../../../types/readerTypes'
import { IBorrowRecord } from '../../../types/borrowTypes'
import { useAuthStore } from './authStore'

interface ReadersState {
  readers: IReader[]
  loading: boolean
  error: string | null
  selectedReader: IReader | null
  borrowHistory: IBorrowRecord[]

  fetchAllReaders: () => Promise<void>
  searchReaders: (query: string) => Promise<void>
  addReader: (reader: IReader) => Promise<number>
  updateReader: (reader: IReader) => Promise<boolean>
  deleteReader: (readerId: number) => Promise<boolean>
  selectReader: (reader: IReader | null) => void
  fetchBorrowHistory: (readerId: number) => Promise<void>
}

export const useReaderStore = create<ReadersState>((set) => ({
  readers: [],
  loading: false,
  error: null,
  selectedReader: null,
  borrowHistory: [],

  fetchAllReaders: async () => {
    set({ loading: true, error: null })
    try {
      const readers = await window.api.reader.getAll()
      set({ readers, loading: false })
    } catch (error) {
      console.error('Error fetching readers:', error)
      set({ error: 'Failed to fetch readers', loading: false })
    }
  },

  searchReaders: async (query) => {
    set({ loading: true, error: null })
    try {
      const readers = await window.api.reader.search(query)
      set({ readers, loading: false })
    } catch (error) {
      console.error('Error searching readers:', error)
      set({ error: 'Failed to search readers', loading: false })
    }
  },

  addReader: async (reader) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const readerId = await window.api.reader.add(reader, userId)
      if (readerId > 0) {
        // Refresh reader list after adding
        const readers = await window.api.reader.getAll()
        set({ readers, loading: false })
      }
      return readerId
    } catch (error) {
      console.error('Error adding reader:', error)
      set({ error: 'Failed to add reader', loading: false })
      return 0
    }
  },

  updateReader: async (reader) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const success = await window.api.reader.update(reader, userId)
      if (success) {
        // Refresh reader list after updating
        const readers = await window.api.reader.getAll()
        set({ readers, loading: false })
      }
      return success
    } catch (error) {
      console.error('Error updating reader:', error)
      set({ error: 'Failed to update reader', loading: false })
      return false
    }
  },

  deleteReader: async (readerId) => {
    set({ loading: true, error: null })
    try {
      const currentUser = useAuthStore.getState().currentUser
      const userId = currentUser?.user_id
      const result = await window.api.reader.delete(readerId, userId)
      if (result.success) {
        // Remove reader from store after deleting
        set((state) => ({
          readers: state.readers.filter((reader) => reader.reader_id !== readerId),
          loading: false
        }))
      }
      return result.success
    } catch (error) {
      console.error('Error deleting reader:', error)
      set({ error: 'Failed to delete reader', loading: false })
      return false
    }
  },

  selectReader: (reader) => {
    set({ selectedReader: reader })
  },

  fetchBorrowHistory: async (readerId) => {
    set({ loading: true, error: null })
    try {
      const borrowHistory = await window.api.reader.getBorrowHistory(readerId)
      set({ borrowHistory, loading: false })
    } catch (error) {
      console.error('Error fetching borrow history:', error)
      set({ error: 'Failed to fetch borrow history', loading: false })
    }
  }
}))
