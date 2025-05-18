// 读者类型定义
export interface IReader {
  reader_id: number
  name: string
  gender?: string
  id_card?: string
  phone?: string
  email?: string
  address?: string
  register_date?: string
  status: number // 1:正常, 2:暂停, 3:注销
  borrow_quota?: number
  type_id?: number
  type_name?: string
}

// 读者类型类型定义
export interface IReaderType {
  type_id: number
  type_name: string
  max_borrow_count: number
  max_borrow_days: number
  can_renew: number // 0:不可续借, 1:可续借
  max_renew_count: number
}
