// 借阅记录类型定义
export interface IBorrowRecord {
  borrow_id: number
  book_id: number
  book_title?: string
  isbn?: string
  author?: string
  reader_id: number
  reader_name?: string
  id_card?: string
  phone?: string
  borrow_date: string
  due_date: string
  return_date?: string
  renew_count: number
  fine_amount: number
  status: number // 1:借出, 2:已归还, 3:逾期, 4:续借
  operator_id?: number
  message?: string
}

// 借阅请求类型定义
export interface IBorrowRequest {
  book_id: number
  reader_id: number
  operator_id: number
}

// 预约记录类型定义
export interface IReservation {
  reservation_id: number
  book_id: number
  book_title?: string
  isbn?: string
  author?: string
  reader_id: number
  reader_name?: string
  id_card?: string
  phone?: string
  reserve_date: string
  expiry_date: string
  status: number // 1:预约中, 2:已借出, 3:已过期, 4:已取消
}
