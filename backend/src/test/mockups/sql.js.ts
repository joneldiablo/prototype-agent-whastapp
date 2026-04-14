/**
 * Mockup de sql.js para pruebas unitarias
 */

export interface Database {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string, params?: unknown[]): QueryResult[];
  getRowsModified(): number;
  export(): Uint8Array;
}

export interface QueryResult {
  columns: string[];
  values: unknown[][];
}

export interface SqlJsStatic {
  Database: new (data?: ArrayLike<number>) => Database;
}

export function createMockDb(initialData?: Record<string, unknown[][]>): Database {
  const data: Record<string, unknown[][]> = initialData || {};
  const columns: Record<string, string[]> = {};
  let rowCount = 0;

  return {
    run(sql: string, params?: unknown[]) {
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        rowCount++;
      } else if (sql.trim().toUpperCase().startsWith('DELETE')) {
        rowCount = 0;
      }
    },
    exec(sql: string, _params?: unknown[]) {
      if (sql.includes('FROM whitelist')) {
        if (!data.whitelist) data.whitelist = [];
        return [{
          columns: ['id', 'phone', 'prompt', 'enabled', 'is_blacklist', 'created_at', 'updated_at'],
          values: data.whitelist,
        }];
      }
      if (sql.includes('FROM system_config')) {
        return [{
          columns: ['key', 'value'],
          values: data.system_config || [],
        }];
      }
      if (sql.includes('FROM messages_log')) {
        return [{
          columns: ['id', 'from_number', 'message', 'response', 'timestamp'],
          values: data.messages_log || [],
        }];
      }
      if (sql.includes('FROM sessions')) {
        return [{
          columns: ['id', 'phone', 'opencode_session_id'],
          values: data.sessions || [],
        }];
      }
      if (sql.includes('last_insert_rowid()')) {
        return [{ columns: ['id'], values: [[rowCount]] }];
      }
      if (sql.includes('COUNT(*)')) {
        return [{ columns: ['count'], values: [[0]] }];
      }
      return [];
    },
    getRowsModified() {
      return 1;
    },
    export() {
      return new Uint8Array();
    },
  };
}

export const mockSqlJs: SqlJsStatic = {
  Database: class MockDatabase {
    constructor() {}
  },
};

export default mockSqlJs;