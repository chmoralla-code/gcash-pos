// In-memory mock for expo-sqlite
const mockDb = {
  _tables: {},

  execAsync: async function(sql) {
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (createMatch) {
      this._tables[createMatch[1]] = [];
    }
    const truncate = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (truncate && this._tables[truncate[1]]) {
      this._tables[truncate[1]] = [];
    }
    // ALTER TABLE - ignore
  },

  runAsync: async function(sql, ...params) {
    const flatParams = Array.isArray(params[0]) ? params[0] : params;

    // INSERT
    const insertMatch = sql.match(/INSERT\s+(?:OR\s+REPLACE\s+)?INTO\s+(\w+)/i);
    if (insertMatch) {
      const table = insertMatch[1];
      if (!this._tables[table]) this._tables[table] = [];
      const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
      const valsMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
      const row = {};
      if (colsMatch && valsMatch) {
        const cols = colsMatch[1].split(',').map(c => c.trim());
        // Parse each value token: ? (param), number, 'string'
        const valTokens = valsMatch[1].split(',').map(v => v.trim());
        let paramIdx = 0;
        cols.forEach((col, i) => {
          const token = valTokens[i] || 'null';
          if (token === '?' || token === '?') {
            row[col] = paramIdx < flatParams.length ? flatParams[paramIdx++] : null;
          } else if (/^-?\d+(\.\d+)?$/.test(token)) {
            row[col] = Number(token);
          } else if (/^'.*'$/.test(token)) {
            row[col] = token.slice(1, -1);
          } else if (/^null$/i.test(token)) {
            row[col] = null;
          } else {
            row[col] = paramIdx < flatParams.length ? flatParams[paramIdx++] : null;
          }
        });
        // Fill remaining params if any
        while (paramIdx < flatParams.length) {
          // Extra params - ignore
          paramIdx++;
        }
      } else {
        row.id = this._tables[table].length + 1;
      }
      if (row.id === undefined || row.id === null) {
        row.id = this._tables[table].length + 1;
      }
      this._tables[table].push(row);
      return { lastInsertRowId: row.id, changes: 1 };
    }

    // UPDATE
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE|\s*$)/is);
    if (updateMatch) {
      const table = updateMatch[1];
      const setClause = updateMatch[2];
      const rows = this._tables[table] || [];

      // Parse SET: collect {col, isParam, value}
      const setSpecs = [];
      const paramCount = { value: 0 };
      setClause.split(',').forEach(pair => {
        const m = pair.match(/(\w+)\s*=\s*(?:\?|(-?\d+|'[^']*'))/);
        if (m) {
          setSpecs.push({
            col: m[1],
            isParam: !m[2],
            value: m[2] ? (isNaN(m[2]) ? m[2].replace(/'/g, '') : Number(m[2])) : null,
          });
          if (!m[2]) paramCount.value++;
        }
      });

      // Parse WHERE: col = ? or col = literal
      let whereCol = null, whereLitVal = null, whereIsLit = false;
      const wq = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (wq) whereCol = wq[1];
      const wl = sql.match(/WHERE\s+(\w+)\s*=\s*(-?\d+|'[^']*')/i);
      if (wl) { whereCol = wl[1]; whereLitVal = isNaN(wl[2]) ? wl[2].replace(/'/g, '') : Number(wl[2]); whereIsLit = true; }

      rows.forEach((row) => {
        let matches = true;
        if (whereCol) {
          if (whereIsLit) {
            matches = (row[whereCol] == whereLitVal);
          } else {
            const whereIdx = paramCount.value;
            const whereVal = flatParams[whereIdx];
            matches = (row[whereCol] == whereVal);
          }
        }
        if (matches) {
          let idx = 0;
          setSpecs.forEach(spec => {
            row[spec.col] = spec.isParam ? flatParams[idx++] : spec.value;
          });
        }
      });
      return { changes: 1 };
    }

    // DELETE
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
    if (deleteMatch) {
      const table = deleteMatch[1];
      const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
      if (whereMatch && this._tables[table]) {
        const col = whereMatch[1];
        const val = flatParams[0];
        this._tables[table] = this._tables[table].filter(r => !(r[col] === val || r[col] == val));
      } else {
        this._tables[table] = [];
      }
      return { changes: 1 };
    }

    // ALTER TABLE
    if (/ALTER TABLE/i.test(sql)) return {};

    return {};
  },

  getAllAsync: async function(sql, ...params) {
    const flatParams = Array.isArray(params[0]) ? params[0] : params;
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) return [];
    const table = tableMatch[1];
    let rows = [...(this._tables[table] || [])];

    // WHERE
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/is);
    if (whereMatch) {
      const clause = whereMatch[1].trim();
      // LIKE
      let paramIdx = 0;
      const likeMatches = [...clause.matchAll(/(\w+)\s+LIKE\s+\?/gi)];
      likeMatches.forEach((m) => {
        const col = m[1];
        const pattern = flatParams[paramIdx++] || '';
        const regex = new RegExp('^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
        rows = rows.filter(r => regex.test(String(r[col] || '')));
      });
      // col <= ? (range conditions with IS NULL OR)
      const leMatches = [...clause.matchAll(/(\w+)\s*<=\s*\?/gi)];
      leMatches.forEach((m) => {
        const col = m[1];
        const val = flatParams[paramIdx++];
        const hasUpperClause = clause.includes('OR ' + col + ' IS NULL OR ' + col + ' >=');
        rows = rows.filter(r => r[col] <= val);
      });
      // col >= ?
      const geMatches = [...clause.matchAll(/(\w+)\s*>=\s*\?/gi)];
      geMatches.forEach((m) => {
        const col = m[1];
        // Only use if not part of a (IS NULL OR >=) pair
        const isInOrGroup = clause.indexOf('IS NULL OR') !== -1 && clause.indexOf(col + ' >=') !== -1;
        if (!isInOrGroup) {
          const val = flatParams[paramIdx++];
          rows = rows.filter(r => r[col] >= val);
        } else {
          // Handle (max_amount IS NULL OR max_amount >= ?)
          const val = flatParams[paramIdx++];
          rows = rows.filter(r => r[col] === null || r[col] === undefined || r[col] >= val);
        }
      });
      // col = ? (exact matches)
      const eqMatches = [...clause.matchAll(/(\w+)\s*=\s*\?/g)];
      eqMatches.forEach((m) => {
        const col = m[1];
        const val = flatParams[paramIdx++];
        if (val !== undefined) {
          rows = rows.filter(r => r[col] === val || r[col] == val);
        }
      });
      // col = literal_value (hardcoded in SQL, not ?)
      const litMatches = [...clause.matchAll(/(\w+)\s*=\s*(-?\d+|\'[^\']*\'|null)/gi)];
      litMatches.forEach((m) => {
        const col = m[1];
        let raw = m[2];
        if (raw === 'null') {
          rows = rows.filter(r => r[col] === null || r[col] === undefined);
        } else if (raw.startsWith("'")) {
          const val = raw.replace(/'/g, '');
          rows = rows.filter(r => String(r[col]) === val);
        } else {
          const val = Number(raw);
          rows = rows.filter(r => Number(r[col]) === val);
        }
      });
      // IS NOT
      const notMatch = clause.match(/(\w+)\s+IS NOT\s+(.+)/i);
      if (notMatch) {
        const col = notMatch[1];
        const val = notMatch[2].trim();
        rows = rows.filter(r => String(r[col]) !== val);
      }
    }

    const hasGroupBy = /GROUP BY/i.test(sql);

    // Handle aggregate queries (SUM/COUNT with GROUP BY)
    if (hasGroupBy || /COALESCE\(SUM/i.test(sql)) {
      const cashin = rows.filter(r => r.type === 'cashin');
      const cashout = rows.filter(r => r.type === 'cashout');
      return [{
        type: 'cashin',
        count: cashin.length,
        total_amount: cashin.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        total_fee: cashin.reduce((s, r) => s + (Number(r.fee) || 0), 0),
      }, {
        type: 'cashout',
        count: cashout.length,
        total_amount: cashout.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        total_fee: cashout.reduce((s, r) => s + (Number(r.fee) || 0), 0),
      }];
    }

    // COUNT(*)
    if (/COUNT\(\*\)/i.test(sql)) {
      return [{ 'count(*)': rows.length }];
    }

    // ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(DESC|ASC)?/i);
    if (orderMatch) {
      const orderCol = orderMatch[1];
      const dir = (orderMatch[2] || '').toUpperCase();
      rows.sort((a, b) => {
        const va = a[orderCol] || '';
        const vb = b[orderCol] || '';
        if (dir === 'DESC') return va > vb ? -1 : va < vb ? 1 : 0;
        return va < vb ? -1 : va > vb ? 1 : 0;
      });
    }

    // LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      rows = rows.slice(0, parseInt(limitMatch[1]));
    }

    return rows;
  },
};

module.exports = {
  openDatabaseAsync: async (name) => mockDb,
  mockDb,
};
