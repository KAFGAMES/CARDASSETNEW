////////////////////////////////////////////////////////////////////////////////
// src/screens/DashboardScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useIsFocused } from '@react-navigation/native';  // ← 追加
import { initDB, getAllAssets } from '../database/Database';

type Asset = {
  id?: number;
  sale_price: number; // 販売価格
  buy_price: number;  // 買取価格
};

const DashboardScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const isFocused = useIsFocused(); // タブ/画面がフォーカスされたときに true

  useEffect(() => {
    initDB();
  }, []);

  // フォーカスが戻るたびに最新データを取得
  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  const fetchData = async () => {
    try {
      const data = await getAllAssets();
      setAssets(data);
    } catch (error) {
      console.log(error);
    }
  };

  // 総資産(買取価格合計) / 総資産(販売価格合計)
  const totalBuyPrice = assets.reduce((acc, cur) => acc + (cur.buy_price || 0), 0);
  const totalSalePrice = assets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>カードダッシュボード</Text>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          総資産(買取価格合計): {totalBuyPrice} 円
        </Text>
        <Text style={styles.summaryText}>
          総資産(販売価格合計): {totalSalePrice} 円
        </Text>
      </View>

      {/* 参考：全データの一部を表示 */}
      <FlatList
        data={assets}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.cardItem}>
            <Text style={styles.cardPrice}>
              買取価格: {item.buy_price} 円 / 販売価格: {item.sale_price} 円
            </Text>
          </View>
        )}
      />
    </View>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F7F7F7',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardItem: {
    padding: 12,
    marginVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 1,
  },
  cardPrice: {
    fontSize: 14,
    color: '#333',
  },
});
