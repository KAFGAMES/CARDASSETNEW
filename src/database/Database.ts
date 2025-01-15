////////////////////////////////////////////////////////////////////////////////
// src/database/Database.ts
////////////////////////////////////////////////////////////////////////////////
import SQLite, { SQLError, SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(false);

const db: SQLiteDatabase = SQLite.openDatabase(
  { name: 'myassets.db', location: 'default' },
  () => {
    console.log('Database opened');
  },
  (error: SQLError) => {
    console.log('Database error: ', error);
  }
);

/**
 * DB初期化用関数。
 */
export const initDB = () => {
  db.transaction(tx => {
    // メインの資産テーブル
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT,
        name TEXT,
        category TEXT,
        condition TEXT,
        sale_price REAL,
        buy_price REAL,
        purchase_date TEXT,
        selling_date TEXT,
        quantity INTEGER,
        estimated_flag INTEGER,
        memo TEXT,
        cost_price REAL,
        sold_price REAL,
        sold_commission REAL,
        trade_profit REAL
      );`
    );

    // 取引履歴テーブルを追加
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS asset_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER,
        trans_date TEXT,        -- 取引日
        trans_type TEXT,        -- 'BUY' or 'SELL'
        quantity INTEGER,       -- 取引数
        price REAL,             -- 1単位あたりの取引価格
        commission REAL,        -- 手数料
        profit REAL,            -- 売却時の損益 (買い増し時は0扱い)
        memo TEXT
      );`
    );

    // memos テーブルの作成(既存)
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS memos (
        date TEXT PRIMARY KEY,
        memo TEXT
      );`
    );
  });
};

/**
 * 全データ取得
 */
export const getAllAssets = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM assets',
        [],
        (_, result) => {
          resolve(result.rows.raw());
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getAllTransactions = (): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM asset_transactions',
        [],
        (_, result) => {
          resolve(result.rows.raw());
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * 特定資産の取引履歴を取得
 */
export const getAssetTransactions = (assetId: number): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM asset_transactions WHERE asset_id = ? ORDER BY id DESC',
        [assetId],
        (_, result) => {
          resolve(result.rows.raw());
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * 新規登録 (assets)
 */
export const insertAsset = (asset: {
  product_id: string;
  name: string;
  category: string;
  condition: string;
  sale_price: number;
  buy_price: number;
  purchase_date: string;
  selling_date: string;
  quantity: number;
  estimated_flag: number;
  memo: string;
  cost_price: number;
  sold_price: number;
  sold_commission: number;
  trade_profit: number;
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO assets
          (product_id, name, category, condition, sale_price, buy_price, purchase_date, selling_date,
           quantity, estimated_flag, memo, cost_price, sold_price, sold_commission, trade_profit)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          asset.product_id,
          asset.name,
          asset.category,
          asset.condition,
          asset.sale_price,
          asset.buy_price,
          asset.purchase_date,
          asset.selling_date,
          asset.quantity,
          asset.estimated_flag,
          asset.memo,
          asset.cost_price,
          asset.sold_price,
          asset.sold_commission,
          asset.trade_profit,
        ],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * 更新 (assets)
 */
export const updateAsset = (
  id: number,
  asset: {
    product_id: string;
    name: string;
    category: string;
    condition: string;
    sale_price: number;
    buy_price: number;
    purchase_date: string;
    selling_date: string;
    quantity: number;
    estimated_flag: number;
    memo: string;
    cost_price: number;
    sold_price: number;
    sold_commission: number;
    trade_profit: number;
  }
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE assets SET
          product_id = ?,
          name = ?,
          category = ?,
          condition = ?,
          sale_price = ?,
          buy_price = ?,
          purchase_date = ?,
          selling_date = ?,
          quantity = ?,
          estimated_flag = ?,
          memo = ?,
          cost_price = ?,
          sold_price = ?,
          sold_commission = ?,
          trade_profit = ?
         WHERE id = ?;`,
        [
          asset.product_id,
          asset.name,
          asset.category,
          asset.condition,
          asset.sale_price,
          asset.buy_price,
          asset.purchase_date,
          asset.selling_date,
          asset.quantity,
          asset.estimated_flag,
          asset.memo,
          asset.cost_price,
          asset.sold_price,
          asset.sold_commission,
          asset.trade_profit,
          id,
        ],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * 削除
 */
export const deleteAsset = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM assets WHERE id = ?',
        [id],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

/**
 * 取引履歴の追加
 */
export const insertTransaction = (
  assetId: number,
  transDate: string,
  transType: 'BUY' | 'SELL',
  quantity: number,
  price: number,
  commission: number,
  profit: number,
  memo: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO asset_transactions
          (asset_id, trans_date, trans_type, quantity, price, commission, profit, memo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [assetId, transDate, transType, quantity, price, commission, profit, memo],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const insertMemo = (date: string, memo: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `REPLACE INTO memos (date, memo) VALUES (?, ?);`,
        [date, memo],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getMemo = (date: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT memo FROM memos WHERE date = ?;`,
        [date],
        (_, result) => {
          if (result.rows.length > 0) {
            resolve(result.rows.item(0).memo);
          } else {
            resolve('');
          }
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getAllMemos = (): Promise<{date: string, memo: string}[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM memos',
        [],
        (_, result) => {
          resolve(result.rows.raw());
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

