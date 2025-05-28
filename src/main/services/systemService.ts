import Database from 'better-sqlite3'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { ISystemUser, ISystemRole, ISystemConfig, IDataBackup } from '../../types/systemTypes'

/**
 * 系统服务类
 * 负责处理用户认证、权限管理、系统配置、数据备份等系统级功能
 */
export class SystemService {
  private db: Database.Database

  /**
   * 构造函数
   * @param db 数据库连接实例
   */
  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * 用户登录验证
   * 验证用户名和密码，记录登录日志，返回用户信息
   *
   * @param username 用户名
   * @param password 密码（明文）
   * @param ip 用户IP地址，默认为127.0.0.1
   * @returns 包含登录结果、消息和用户信息的对象
   */
  login(
    username: string,
    password: string,
    ip: string = '127.0.0.1'
  ): { success: boolean; message: string; user?: any } {
    // 获取用户信息
    const user = this.db.prepare('SELECT * FROM system_user WHERE username = ?').get(username) as
      | ISystemUser
      | undefined

    if (!user) {
      // 记录登录失败日志
      this.logOperation(0, 'login failed', ip, `登录失败: ${username} - 用户不存在`)
      return { success: false, message: '用户不存在' }
    }

    // 验证密码 - 使用SHA256哈希比对
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    if (user.password_hash !== passwordHash) {
      // 记录登录失败日志
      this.logOperation(user.user_id, 'login failed', ip, `登录失败: ${username} - 密码错误`)
      return { success: false, message: '密码错误' }
    }

    // 检查用户状态 - 状态值为1表示正常
    if (user.status !== 1) {
      // 记录登录失败日志
      this.logOperation(
        user.user_id,
        'login failed',
        ip,
        `登录失败: ${username} - 账号被禁用 (状态: ${user.status})`
      )
      return { success: false, message: '账号已被锁定或禁用' }
    }

    // 更新最后登录时间 - 使用SQLite本地时间函数
    this.db
      .prepare("UPDATE system_user SET last_login = datetime('now', 'localtime') WHERE user_id = ?")
      .run(user.user_id)

    // 记录登录成功日志
    this.logOperation(
      user.user_id,
      'login successful',
      ip,
      `登录成功: ${username} (用户ID: ${user.user_id}, 真实姓名: ${user.real_name})`
    )

    // 获取角色信息 - 包含权限数据
    const role = this.getRoleById(user.role_id)

    // 返回用户信息（不包含密码哈希）
    const userInfo = {
      user_id: user.user_id,
      username: user.username,
      role_id: user.role_id,
      status: user.status,
      real_name: user.real_name,
      phone: user.phone,
      email: user.email,
      last_login: user.last_login,
      role_name: role?.role_name,
      permissions: role?.permissions
    }

    return { success: true, message: '登录成功', user: userInfo }
  }

  /**
   * 修改密码
   * 验证旧密码后更新为新密码
   *
   * @param userId 用户ID
   * @param oldPassword 旧密码（明文）
   * @param newPassword 新密码（明文）
   * @returns 包含操作结果和消息的对象
   */
  changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): { success: boolean; message: string } {
    // 验证旧密码
    const user = this.db
      .prepare('SELECT password_hash FROM system_user WHERE user_id = ?')
      .get(userId) as { password_hash: string } | undefined

    if (!user) {
      return { success: false, message: '用户不存在' }
    }

    // 计算旧密码哈希并验证
    const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex')

    if (user.password_hash !== oldPasswordHash) {
      return { success: false, message: '原密码错误' }
    }

    // 计算新密码哈希并更新
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    this.db
      .prepare('UPDATE system_user SET password_hash = ? WHERE user_id = ?')
      .run(newPasswordHash, userId)

    return { success: true, message: '密码修改成功' }
  }

  /**
   * 重置密码
   * 直接设置新密码，不需验证旧密码（通常由管理员操作）
   *
   * @param userId 用户ID
   * @param newPassword 新密码（明文）
   * @returns 操作是否成功
   */
  resetPassword(userId: number, newPassword: string): boolean {
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    const result = this.db
      .prepare('UPDATE system_user SET password_hash = ? WHERE user_id = ?')
      .run(newPasswordHash, userId)
    return result.changes > 0
  }

  /**
   * 获取所有系统用户
   * 包含角色名称信息
   *
   * @returns 用户列表
   */
  getAllUsers(): ISystemUser[] {
    return this.db
      .prepare(
        `
      SELECT u.*, r.role_name
      FROM system_user u
      LEFT JOIN system_role r ON u.role_id = r.role_id
    `
      )
      .all() as ISystemUser[]
  }

  /**
   * 根据ID获取用户
   * 包含角色名称信息
   *
   * @param userId 用户ID
   * @returns 用户信息对象或undefined（不存在时）
   */
  getUserById(userId: number): ISystemUser | undefined {
    return this.db
      .prepare(
        `
      SELECT u.*, r.role_name
      FROM system_user u
      LEFT JOIN system_role r ON u.role_id = r.role_id
      WHERE u.user_id = ?
    `
      )
      .get(userId) as ISystemUser | undefined
  }

  /**
   * 添加系统用户
   *
   * @param user 用户信息对象（不含user_id，密码为明文）
   * @returns 新创建的用户ID
   */
  addUser(user: Omit<ISystemUser, 'user_id'>): number {
    // 密码加密处理
    const passwordHash = crypto.createHash('sha256').update(user.password_hash).digest('hex')

    const stmt = this.db.prepare(`
      INSERT INTO system_user (
        username, password_hash, real_name, role_id, phone, email, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(
      user.username,
      passwordHash,
      user.real_name,
      user.role_id,
      user.phone,
      user.email,
      user.status || 1 // 默认状态为1（正常）
    )

    return result.lastInsertRowid as number
  }

  /**
   * 更新用户信息
   * 不包含密码修改
   *
   * @param user 用户信息对象（不含password_hash）
   * @returns 操作是否成功
   */
  updateUser(user: Omit<ISystemUser, 'password_hash'>): boolean {
    const stmt = this.db.prepare(`
      UPDATE system_user SET
        username = ?, real_name = ?, role_id = ?,
        phone = ?, email = ?, status = ?
      WHERE user_id = ?
    `)

    const result = stmt.run(
      user.username,
      user.real_name,
      user.role_id,
      user.phone,
      user.email,
      user.status,
      user.user_id
    )

    return result.changes > 0
  }

  /**
   * 删除用户
   *
   * @param userId 用户ID
   * @returns 操作是否成功
   */
  deleteUser(userId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM system_user WHERE user_id = ?')
    const result = stmt.run(userId)
    return result.changes > 0
  }

  /**
   * 获取所有角色
   *
   * @returns 角色列表
   */
  getAllRoles(): ISystemRole[] {
    return this.db.prepare('SELECT * FROM system_role').all() as ISystemRole[]
  }

  /**
   * 根据ID获取角色
   *
   * @param roleId 角色ID
   * @returns 角色信息对象或undefined（不存在时）
   */
  getRoleById(roleId: number): ISystemRole | undefined {
    return this.db.prepare('SELECT * FROM system_role WHERE role_id = ?').get(roleId) as
      | ISystemRole
      | undefined
  }

  /**
   * 添加角色
   *
   * @param role 角色信息对象（不含role_id）
   * @returns 新创建的角色ID
   */
  addRole(role: Omit<ISystemRole, 'role_id'>): number {
    const stmt = this.db.prepare('INSERT INTO system_role (role_name, permissions) VALUES (?, ?)')
    const result = stmt.run(role.role_name, role.permissions)
    return result.lastInsertRowid as number
  }

  /**
   * 更新角色
   *
   * @param role 角色信息对象
   * @returns 操作是否成功
   */
  updateRole(role: ISystemRole): boolean {
    const stmt = this.db.prepare(
      'UPDATE system_role SET role_name = ?, permissions = ? WHERE role_id = ?'
    )
    const result = stmt.run(role.role_name, role.permissions, role.role_id)
    return result.changes > 0
  }

  /**
   * 删除角色
   * 如有关联用户，则无法删除
   *
   * @param roleId 角色ID
   * @returns 操作是否成功
   */
  deleteRole(roleId: number): boolean {
    // 检查是否有关联的用户
    const userCount = this.db
      .prepare('SELECT COUNT(*) as count FROM system_user WHERE role_id = ?')
      .get(roleId) as { count: number }

    // 存在关联用户时不允许删除
    if (userCount.count > 0) {
      return false
    }

    const stmt = this.db.prepare('DELETE FROM system_role WHERE role_id = ?')
    const result = stmt.run(roleId)
    return result.changes > 0
  }

  /**
   * 获取所有系统配置
   *
   * @returns 配置列表
   */
  getAllConfigs(): ISystemConfig[] {
    return this.db.prepare('SELECT * FROM system_config').all() as ISystemConfig[]
  }

  /**
   * 根据键获取配置
   *
   * @param configKey 配置键名
   * @returns 配置信息对象或undefined（不存在时）
   */
  getConfigByKey(configKey: string): ISystemConfig | undefined {
    return this.db.prepare('SELECT * FROM system_config WHERE config_key = ?').get(configKey) as
      | ISystemConfig
      | undefined
  }

  /**
   * 更新配置
   *
   * @param configKey 配置键名
   * @param configValue 配置值
   * @returns 操作是否成功
   */
  updateConfig(configKey: string, configValue: string): boolean {
    const stmt = this.db.prepare('UPDATE system_config SET config_value = ? WHERE config_key = ?')
    const result = stmt.run(configValue, configKey)
    return result.changes > 0
  }

  /**
   * 数据库备份
   * 创建数据库文件的副本并记录备份信息
   *
   * @returns 包含操作结果、消息和备份路径的对象
   */
  backupDatabase(): { success: boolean; message: string; backupPath?: string } {
    try {
      // 当前数据库文件路径
      const dbPath = this.db.name
      // 生成时间戳（格式适合用作文件名）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      // 备份目录路径（在应用数据目录下）
      const backupDir = path.join(app.getPath('userData'), 'backups')

      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      // 备份文件完整路径
      const backupPath = path.join(backupDir, `library_backup_${timestamp}.db`)

      // 关闭当前连接，确保数据完整性
      this.db.close()

      // 复制数据库文件作为备份
      fs.copyFileSync(dbPath, backupPath)

      // 重新打开数据库连接
      this.db = new Database(dbPath)
      // 启用外键约束
      this.db.pragma('foreign_keys = ON')

      // 计算备份文件大小（MB）
      const stats = fs.statSync(backupPath)
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

      // 记录备份信息到数据库
      this.db
        .prepare(
          `
        INSERT INTO data_backup (backup_path, backup_size, remark)
        VALUES (?, ?, ?)
      `
        )
        .run(backupPath, `${fileSizeInMB} MB`, '手动备份')

      return { success: true, message: '数据库备份成功', backupPath }
    } catch (error) {
      return {
        success: false,
        message: `数据库备份失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 获取所有备份记录
   * 按备份日期降序排列
   *
   * @returns 备份记录列表
   */
  getAllBackups(): IDataBackup[] {
    return this.db
      .prepare(
        `
      SELECT * FROM data_backup
      ORDER BY backup_date DESC
    `
      )
      .all() as IDataBackup[]
  }

  /**
   * 删除备份
   * 同时删除物理文件和数据库记录
   *
   * @param backupId 备份记录ID
   * @returns 包含操作结果和消息的对象
   */
  deleteBackup(backupId: number): { success: boolean; message: string } {
    try {
      // 先获取备份记录
      const backup = this.db
        .prepare('SELECT * FROM data_backup WHERE backup_id = ?')
        .get(backupId) as IDataBackup | undefined

      if (!backup) {
        return { success: false, message: '备份记录不存在' }
      }

      // 删除物理文件（如果存在）
      if (fs.existsSync(backup.backup_path)) {
        fs.unlinkSync(backup.backup_path)
      }

      // 删除数据库记录
      this.db.prepare('DELETE FROM data_backup WHERE backup_id = ?').run(backupId)

      return { success: true, message: '备份删除成功' }
    } catch (error) {
      return {
        success: false,
        message: `删除备份失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 还原备份
   * 先创建当前数据库安全副本，然后用备份文件替换当前数据库
   *
   * @param backupId 备份记录ID
   * @returns 包含操作结果和消息的对象
   */
  restoreBackup(backupId: number): { success: boolean; message: string } {
    try {
      // 先获取备份记录
      const backup = this.db
        .prepare('SELECT * FROM data_backup WHERE backup_id = ?')
        .get(backupId) as IDataBackup | undefined

      if (!backup) {
        return { success: false, message: '备份记录不存在' }
      }

      // 检查备份文件是否存在
      if (!fs.existsSync(backup.backup_path)) {
        return { success: false, message: '备份文件不存在，无法还原' }
      }

      // 当前数据库文件路径
      const currentDbPath = this.db.name

      // 关闭当前数据库连接
      this.db.close()

      try {
        // 备份当前数据库(在恢复前创建一个安全备份)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const safeBackupPath = `${currentDbPath}.before_restore_${timestamp}`
        fs.copyFileSync(currentDbPath, safeBackupPath)

        // 复制备份文件到当前数据库位置（执行还原）
        fs.copyFileSync(backup.backup_path, currentDbPath)

        // 重新打开数据库连接
        this.db = new Database(currentDbPath)
        // 启用外键约束
        this.db.pragma('foreign_keys = ON')

        return { success: true, message: '数据库还原成功' }
      } catch (error) {
        // 出错时尝试重新打开原数据库连接
        this.db = new Database(currentDbPath)
        this.db.pragma('foreign_keys = ON')

        return {
          success: false,
          message: `还原备份过程中出错: ${error instanceof Error ? error.message : '未知错误'}`
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `还原备份失败: ${error instanceof Error ? error.message : '未知错误'}`
      }
    }
  }

  /**
   * 记录操作日志
   *
   * @param userId 用户ID（0表示未登录用户或系统操作）
   * @param operation 操作类型
   * @param ip 操作者IP地址
   * @param details 操作详情
   * @returns 操作是否成功
   */
  logOperation(userId: number, operation: string, ip: string, details: string): boolean {
    try {
      this.db
        .prepare(
          `
        INSERT INTO operation_log (user_id, operation, ip, details)
        VALUES (?, ?, ?, ?)
      `
        )
        .run(userId, operation, ip, details)

      return true
    } catch (_error) {
      // 记录日志失败不应影响主要业务流程
      return false
    }
  }

  /**
   * 获取操作日志
   * 支持分页，包含用户信息
   *
   * @param limit 每页记录数，默认100
   * @param offset 偏移量（跳过的记录数），默认0
   * @returns 日志记录列表
   */
  getOperationLogs(limit: number = 100, offset: number = 0): any[] {
    return this.db
      .prepare(
        `
      SELECT l.*, u.username, u.real_name
      FROM operation_log l
      LEFT JOIN system_user u ON l.user_id = u.user_id
      ORDER BY l.operation_time DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(limit, offset)
  }

  /**
   * 获取指定用户的操作日志
   * 支持分页，包含用户信息
   *
   * @param userId 用户ID
   * @param limit 每页记录数，默认100
   * @param offset 偏移量（跳过的记录数），默认0
   * @returns 日志记录列表
   */
  getUserOperationLogs(userId: number, limit: number = 100, offset: number = 0): any[] {
    return this.db
      .prepare(
        `
      SELECT l.*, u.username, u.real_name
      FROM operation_log l
      LEFT JOIN system_user u ON l.user_id = u.user_id
      WHERE l.user_id = ?
      ORDER BY l.operation_time DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(userId, limit, offset)
  }

  /**
   * 导出操作日志
   * 支持根据日期范围、用户、操作类型筛选
   * 导出为CSV格式到下载目录
   *
   * @param filters 过滤条件对象
   * @returns 包含操作结果、消息和文件路径的对象
   */
  exportOperationLogs(filters?: {
    startDate?: string // 开始日期，格式：YYYY-MM-DD
    endDate?: string // 结束日期，格式：YYYY-MM-DD
    userId?: number // 用户ID
    operation?: string // 操作类型（模糊匹配）
  }): { success: boolean; message: string; filePath?: string } {
    try {
      // 构建查询条件
      let whereClause = '1=1'
      const params: any[] = []

      // 添加日期范围过滤
      if (filters?.startDate) {
        whereClause += ' AND l.operation_time >= ?'
        params.push(filters.startDate)
      }

      if (filters?.endDate) {
        whereClause += ' AND l.operation_time <= ?'
        params.push(filters.endDate + ' 23:59:59') // 包含结束日期当天
      }

      // 添加用户ID过滤
      if (filters?.userId) {
        whereClause += ' AND l.user_id = ?'
        params.push(filters.userId)
      }

      // 添加操作类型过滤（模糊匹配）
      if (filters?.operation) {
        whereClause += ' AND l.operation LIKE ?'
        params.push(`%${filters.operation}%`)
      }

      // 查询满足条件的日志记录
      const logs = this.db
        .prepare(
          `
        SELECT l.log_id, l.operation_time, u.username, u.real_name,
               l.operation, l.ip, l.details
        FROM operation_log l
        LEFT JOIN system_user u ON l.user_id = u.user_id
        WHERE ${whereClause}
        ORDER BY l.operation_time DESC
      `
        )
        .all(...params)

      // 生成CSV内容
      const headers = ['日志ID', '操作时间', '用户名', '真实姓名', '操作类型', 'IP地址', '操作详情']
      const csvContent = [
        headers.join(','),
        ...logs.map((log: any) =>
          [
            log.log_id,
            log.operation_time,
            log.username || '',
            log.real_name || '',
            `"${log.operation}"`, // 使用双引号包裹可能包含逗号的字段
            log.ip,
            `"${(log.details || '').replace(/"/g, '""')}"` // CSV中双引号需转义为两个双引号
          ].join(',')
        )
      ].join('\n')

      // 添加BOM以支持中文在Excel中正确显示
      const csvWithBOM = '\uFEFF' + csvContent

      // 创建导出文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const fileName = `操作日志_${timestamp}.csv`
      const downloadsPath = app.getPath('downloads') // 使用Electron的下载目录路径
      const filePath = path.join(downloadsPath, fileName)

      // 写入文件
      fs.writeFileSync(filePath, csvWithBOM, 'utf8')

      return {
        success: true,
        message: '操作日志导出成功',
        filePath
      }
    } catch (error) {
      console.error('导出操作日志失败:', error)
      return {
        success: false,
        message: '导出操作日志失败: ' + (error as Error).message
      }
    }
  }
}
