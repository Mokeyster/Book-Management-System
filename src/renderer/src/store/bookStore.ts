import { create } from 'zustand'
import { IBook } from '../../../types/bookTypes'

interface BooksState {
  books: IBook[]
  loading: boolean
  error: string | null
  selectedBook: IBook | null

  fetchAllBooks: () => Promise<void>
  searchBooks: (query: string) => Promise<void>
  addBook: (book: IBook) => Promise<number>
  updateBook: (book: IBook) => Promise<boolean>
  deleteBook: (bookId: number) => Promise<boolean>
  selectBook: (book: IBook | null) => void
  updateBookStatus: (bookId: number, status: number) => Promise<boolean>
}

export const useBookStore = create<BooksState>((set) => ({
  books: [],
  loading: false,
  error: null,
  selectedBook: null,

  fetchAllBooks: async () => {
    set({ loading: true, error: null })
    try {
      const books = await window.api.book.getAll()
      set({ books, loading: false })
    } catch (error) {
      console.error('Error fetching books:', error)
      set({ error: 'Failed to fetch books', loading: false })
    }
  },

  searchBooks: async (query) => {
    set({ loading: true, error: null })
    try {
      const books = await window.api.book.search(query)
      set({ books, loading: false })
    } catch (error) {
      console.error('Error searching books:', error)
      set({ error: 'Failed to search books', loading: false })
    }
  },

  addBook: async (book) => {
    set({ loading: true, error: null })
    try {
      const bookId = await window.api.book.add(book)
      if (bookId > 0) {
        // Refresh book list after adding
        const books = await window.api.book.getAll()
        set({ books, loading: false })
      }
      return bookId
    } catch (error) {
      console.error('Error adding book:', error)
      set({ error: 'Failed to add book', loading: false })
      return 0
    }
  },

  updateBook: async (book) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.book.update(book)
      if (success) {
        // Refresh book list after updating
        const books = await window.api.book.getAll()
        set({ books, loading: false })
      }
      return success
    } catch (error) {
      console.error('Error updating book:', error)
      set({ error: 'Failed to update book', loading: false })
      return false
    }
  },

  deleteBook: async (bookId) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.book.delete(bookId)
      if (success) {
        // Remove book from store after deleting
        set((state) => ({
          books: state.books.filter((book) => book.book_id !== bookId),
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error deleting book:', error)
      set({ error: 'Failed to delete book', loading: false })
      return false
    }
  },

  selectBook: (book) => {
    set({ selectedBook: book })
  },

  updateBookStatus: async (bookId, status) => {
    set({ loading: true, error: null })
    try {
      const success = await window.api.book.updateStatus(bookId, status)
      if (success) {
        // Update the book status in the store
        set((state) => ({
          books: state.books.map((book) => (book.book_id === bookId ? { ...book, status } : book)),
          loading: false
        }))
      }
      return success
    } catch (error) {
      console.error('Error updating book status:', error)
      set({ error: 'Failed to update book status', loading: false })
      return false
    }
  }
}))
