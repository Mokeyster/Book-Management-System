// 图书类型定义
export interface IBook {
  book_id: number
  isbn?: string
  title: string
  author?: string
  publisher_id?: number
  publisher_name?: string
  publish_date?: string
  price?: number
  category_id?: number
  category_name?: string
  location?: string
  description?: string
  status: number // 1:在库, 2:借出, 3:预约, 4:损坏, 5:丢失
  create_time?: string
  update_time?: string
}

// 图书分类类型定义
export interface IBookCategory {
  category_id: number
  category_name: string
  category_code?: string
  parent_id?: number
  level: number
  description?: string
}

// 标签类型定义
export interface ITag {
  tag_id: number
  tag_name: string
  description?: string
}

// 入库记录类型定义
export interface IInventoryIn {
  in_id: number
  book_id: number
  in_date: string
  quantity: number
  source?: string
  operator_id?: number
  remark?: string
}

// 出库记录类型定义
export interface IInventoryOut {
  out_id: number
  book_id: number
  out_date: string
  quantity: number
  reason?: string
  operator_id?: number
  remark?: string
}
