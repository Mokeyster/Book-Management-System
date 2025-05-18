import { create } from 'zustand'
import {
  IBookStatistics,
  IBorrowStatistics,
  IReaderStatistics
} from '../../../types/statisticsTypes'
import { IReportResult } from '../../../preload/types'

interface StatisticsState {
  bookStats: IBookStatistics | null
  borrowStats: IBorrowStatistics | null
  readerStats: IReaderStatistics | null
  loading: boolean
  error: string | null

  fetchBookStatistics: () => Promise<void>
  fetchBorrowStatistics: (startDate?: string, endDate?: string) => Promise<void>
  fetchReaderStatistics: () => Promise<void>

  generateBorrowReport: (
    startDate: string,
    endDate: string,
    operatorId: number
  ) => Promise<IReportResult>
  generateInventoryReport: (operatorId: number) => Promise<IReportResult>
  generateReaderReport: (operatorId: number) => Promise<IReportResult>
  generateOverdueReport: (operatorId: number) => Promise<IReportResult>
}

export const useStatisticsStore = create<StatisticsState>((set) => ({
  bookStats: null,
  borrowStats: null,
  readerStats: null,
  loading: false,
  error: null,

  fetchBookStatistics: async () => {
    set({ loading: true, error: null })
    try {
      const bookStats = await window.api.stats.getBookStatistics()
      set({ bookStats, loading: false })
    } catch (error) {
      console.error('Error fetching book statistics:', error)
      set({ error: 'Failed to fetch book statistics', loading: false })
    }
  },

  fetchBorrowStatistics: async (startDate, endDate) => {
    set({ loading: true, error: null })
    try {
      const borrowStats = await window.api.stats.getBorrowStatistics(startDate, endDate)
      set({ borrowStats, loading: false })
    } catch (error) {
      console.error('Error fetching borrow statistics:', error)
      set({ error: 'Failed to fetch borrow statistics', loading: false })
    }
  },

  fetchReaderStatistics: async () => {
    set({ loading: true, error: null })
    try {
      const readerStats = await window.api.stats.getReaderStatistics()
      set({ readerStats, loading: false })
    } catch (error) {
      console.error('Error fetching reader statistics:', error)
      set({ error: 'Failed to fetch reader statistics', loading: false })
    }
  },

  generateBorrowReport: async (startDate, endDate, operatorId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.stats.generateBorrowReport(startDate, endDate, operatorId)
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error generating borrow report:', error)
      set({ error: 'Failed to generate borrow report', loading: false })
      return { success: false, error: 'Failed to generate borrow report' }
    }
  },

  generateInventoryReport: async (operatorId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.stats.generateInventoryReport(operatorId)
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error generating inventory report:', error)
      set({ error: 'Failed to generate inventory report', loading: false })
      return { success: false, error: 'Failed to generate inventory report' }
    }
  },

  generateReaderReport: async (operatorId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.stats.generateReaderReport(operatorId)
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error generating reader report:', error)
      set({ error: 'Failed to generate reader report', loading: false })
      return { success: false, error: 'Failed to generate reader report' }
    }
  },

  generateOverdueReport: async (operatorId) => {
    set({ loading: true, error: null })
    try {
      const result = await window.api.stats.generateOverdueReport(operatorId)
      set({ loading: false })
      return result
    } catch (error) {
      console.error('Error generating overdue report:', error)
      set({ error: 'Failed to generate overdue report', loading: false })
      return { success: false, error: 'Failed to generate overdue report' }
    }
  }
}))
