import { create } from 'zustand'
import { IPublisher } from '../../../types/publisherTypes'

interface PublisherState {
  publishers: IPublisher[]
  loading: boolean
  error: string | null
  selectedPublisher: IPublisher | null

  fetchAllPublishers: () => Promise<void>
  addPublisher: (publisher: IPublisher) => Promise<number>
  updatePublisher: (publisher: IPublisher) => Promise<boolean>
  deletePublisher: (publisherId: number) => Promise<boolean>
  selectPublisher: (publisher: IPublisher | null) => void
  getPublisherById: (publisherId: number) => Promise<void>
}

export const usePublisherStore = create<PublisherState>((set, get) => ({
  publishers: [],
  loading: false,
  error: null,
  selectedPublisher: null,

  fetchAllPublishers: async () => {
    set({ loading: true, error: null })
    try {
      const publishers = await window.api.publisher.getAll()
      set({ publishers, loading: false })
    } catch (error) {
      console.error('Error fetching publishers:', error)
      set({ error: 'Failed to fetch publishers', loading: false })
    }
  },

  addPublisher: async (publisher) => {
    set({ loading: true, error: null })
    try {
      const publisherId = await window.api.publisher.add(publisher)
      if (publisherId > 0) {
        // Refresh publisher list after adding
        await get().fetchAllPublishers()
      }
      set({ loading: false })
      return publisherId
    } catch (error) {
      console.error('Error adding publisher:', error)
      set({ error: 'Failed to add publisher', loading: false })
      return 0
    }
  },

  updatePublisher: async (publisher) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.publisher.update(publisher)
      if (success) {
        // Refresh publisher list after updating
        await get().fetchAllPublishers()
      }
      set({ loading: false })
      return success
    } catch (error) {
      console.error('Error updating publisher:', error)
      set({ error: 'Failed to update publisher', loading: false })
      return false
    }
  },

  deletePublisher: async (publisherId) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.publisher.delete(publisherId)
      if (success) {
        // Remove publisher from store after deleting
        set((state) => ({
          publishers: state.publishers.filter((p) => p.publisher_id !== publisherId),
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting publisher:', error)
      set({ error: 'Failed to delete publisher', loading: false })
      return false
    }
  },

  selectPublisher: (publisher) => {
    set({ selectedPublisher: publisher })
  },

  getPublisherById: async (publisherId) => {
    set({ loading: true, error: null })
    try {
      const publisher = await window.api.publisher.getById(publisherId)
      set({ selectedPublisher: publisher, loading: false })
    } catch (error) {
      console.error('Error fetching publisher details:', error)
      set({ error: 'Failed to fetch publisher details', loading: false })
    }
  }
}))
