import Database from 'better-sqlite3'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { ISystemUser, ISystemRole, ISystemConfig, IDataBackup } from '../../types/systemTypes'

export class SystemService {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  // 用户登录验证
  login(username: string, password: string): { success: boolean; message: string; user?: any } {
    // 获取用户信息
    const user = this.db.prepare('SELECT * FROM system_user WHERE username = ?').get(username) as
      | ISystemUser
      | undefined

    if (!user) {
      return { success: false, message: '用户不存在' }
    }

    // 验证密码
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')

    if (user.password_hash !== passwordHash) {
      return { success: false, message: '密码错误' }
    }

    if (user.status !== 1) {
      return { success: false, message: '账号已被锁定或禁用' }
    }

    // 更新最后登录时间
    this.db
      .prepare("UPDATE system_user SET last_login = datetime('now', 'localtime') WHERE user_id = ?")
      .run(user.user_id)

    // 获取角色信息
    const role = this.getRoleById(user.role_id)

    // 返回用户信息（不包含密码）
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

  // 修改密码
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

    const oldPasswordHash = crypto.createHash('sha256').update(oldPassword).digest('hex')

    if (user.password_hash !== oldPasswordHash) {
      return { success: false, message: '原密码错误' }
    }

    // 更新密码
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    this.db
      .prepare('UPDATE system_user SET password_hash = ? WHERE user_id = ?')
      .run(newPasswordHash, userId)

    return { success: true, message: '密码修改成功' }
  }

  // 重置密码
  resetPassword(userId: number, newPassword: string): boolean {
    const newPasswordHash = crypto.createHash('sha256').update(newPassword).digest('hex')
    const result = this.db
      .prepare('UPDATE system_user SET password_hash = ? WHERE user_id = ?')
      .run(newPasswordHash, userId)
    return result.changes > 0
  }

  // 获取所有系统用户
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

  // 根据ID获取用户
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

  // 添加系统用户
  addUser(user: Omit<ISystemUser, 'user_id'>): number {
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
      user.status || 1
    )

    return result.lastInsertRowid as number
  }

  // 更新用户信息
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

  // 删除用户
  deleteUser(userId: number): boolean {
    const stmt = this.db.prepare('DELETE FROM system_user WHERE user_id = ?')
    const result = stmt.run(userId)
    return result.changes > 0
  }

  // 获取所有角色
  getAllRoles(): ISystemRole[] {
    return this.db.prepare('SELECT * FROM system_role').all() as ISystemRole[]
  }

  // 根据ID获取角色
  getRoleById(roleId: number): ISystemRole | undefined {
    return this.db.prepare('SELECT * FROM system_role WHERE role_id = ?').get(roleId) as
      | ISystemRole
      | undefined
  }

  // 添加角色
  addRole(role: Omit<ISystemRole, 'role_id'>): number {
    const stmt = this.db.prepare('INSERT INTO system_role (role_name, permissions) VALUES (?, ?)')
    const result = stmt.run(role.role_name, role.permissions)
    return result.lastInsertRowid as number
  }

  // 更新角色
  updateRole(role: ISystemRole): boolean {
    const stmt = this.db.prepare(
      'UPDATE system_role SET role_name = ?, permissions = ? WHERE role_id = ?'
    )
    const result = stmt.run(role.role_name, role.permissions, role.role_id)
    return result.changes > 0
  }

  // 删除角色
  deleteRole(roleId: number): boolean {
    // 检查是否有关联的用户
    const userCount = this.db
      .prepare('SELECT COUNT(*) as count FROM system_user WHERE role_id = ?')
      .get(roleId) as { count: number }

    if (userCount.count > 0) {
      return false // 存在关联用户，无法删除
    }

    const stmt = this.db.prepare('DELETE FROM system_role WHERE role_id = ?')
    const result = stmt.run(roleId)
    return result.changes > 0
  }

  // 获取所有系统配置
  getAllConfigs(): ISystemConfig[] {
    return this.db.prepare('SELECT * FROM system_config').all() as ISystemConfig[]
  }

  // 根据键获取配置
  getConfigByKey(configKey: string): ISystemConfig | undefined {
    return this.db.prepare('SELECT * FROM system_config WHERE config_key = ?').get(configKey) as
      | ISystemConfig
      | undefined
  }

  // 更新配置
  updateConfig(configKey: string, configValue: string): boolean {
    const stmt = this.db.prepare('UPDATE system_config SET config_value = ? WHERE config_key = ?')
    const result = stmt.run(configValue, configKey)
    return result.changes > 0
  }

  // 数据备份
  backupDatabase(): { success: boolean; message: string; backupPath?: string } {
    try {
      const dbPath = this.db.name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupDir = path.join(app.getPath('userData'), 'backups')

      // 确保备份目录存在
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }

      const backupPath = path.join(backupDir, `library_backup_${timestamp}.db`)

      // 关闭当前连接，进行备份
      this.db.close()

      // 复制数据库文件
      fs.copyFileSync(dbPath, backupPath)

      // 重新打开数据库连接
      this.db = new Database(dbPath)
      this.db.pragma('foreign_keys = ON')

      // 获取文件大小
      const stats = fs.statSync(backupPath)
      const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2)

      // 记录备份信息
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

  // 获取所有备份记录
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

  // 删除备份
  deleteBackup(backupId: number): { success: boolean; message: string } {
    try {
      // 先获取备份记录
      const backup = this.db
        .prepare('SELECT * FROM data_backup WHERE backup_id = ?')
        .get(backupId) as IDataBackup | undefined

      if (!backup) {
        return { success: false, message: '备份记录不存在' }
      }

      // 删除物理文件
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

  // 还原备份
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

      const currentDbPath = this.db.name

      // 关闭当前数据库连接
      this.db.close()

      try {
        // 备份当前数据库(在恢复前创建一个安全备份)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const safeBackupPath = `${currentDbPath}.before_restore_${timestamp}`
        fs.copyFileSync(currentDbPath, safeBackupPath)

        // 复制备份文件到当前数据库位置
        fs.copyFileSync(backup.backup_path, currentDbPath)

        // 重新打开数据库连接
        this.db = new Database(currentDbPath)
        this.db.pragma('foreign_keys = ON')

        return { success: true, message: '数据库还原成功' }
      } catch (error) {
        // 尝试重新打开数据库连接
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

  // 记录操作日志
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
      return false
    }
  }

  // 获取操作日志
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

  // 获取用户操作日志
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
}
