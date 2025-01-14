////////////////////////////////////////////////////////////////////////////////
// src/screens/DashboardScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Button, Alert, TextInput } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { initDB, getAllAssets, insertMemo, getMemo } from '../database/Database';
import { Calendar } from 'react-native-calendars';

type Asset = {
  id?: number;
  name: string;
  product_id: string;
  sale_price: number; // 販売価格
  buy_price: number;  // 買取価格
};

const DashboardScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [memoText, setMemoText] = useState<string>('');
  const isFocused = useIsFocused();

  useEffect(() => {
    initDB();
  }, []);

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

  // 集計処理
  const totalSalePrice = assets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);

  const realAssets = assets.filter(asset => asset.product_id === '1');
  const financialAssets = assets.filter(asset => asset.product_id === '2');

  const realSalePrice = realAssets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);
  const financialSalePrice = financialAssets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);

  const realPercentage = totalSalePrice > 0 ? ((realSalePrice / totalSalePrice) * 100).toFixed(2) : '0.00';
  const financialPercentage = totalSalePrice > 0 ? ((financialSalePrice / totalSalePrice) * 100).toFixed(2) : '0.00';

  const highestAsset = assets.reduce((prev, current) => (current.sale_price > (prev?.sale_price || 0) ? current : prev), {} as Asset);
  const highestSalePrice = highestAsset?.sale_price || 0;
  const highestAssetName = highestAsset?.name || 'なし';

  const showBuyPriceDetails = () => {
    const totalBuyPrice = assets.reduce((acc, cur) => acc + (cur.buy_price || 0), 0);
    const details = `合計買取価格: ${totalBuyPrice} 円\n` +
      assets.map(asset => `${asset.name}: ${asset.buy_price} 円`).join('\n');
    Alert.alert('買取価格詳細', details || 'データなし');
  };

  const onDayPress = async (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    const memo = await getMemo(day.dateString);
    setMemoText(memo);
  };

  const saveMemo = async () => {
    if (selectedDate) {
      try {
        await insertMemo(selectedDate, memoText);
        Alert.alert('保存完了', 'メモが保存されました');
      } catch (error) {
        Alert.alert('エラー', 'メモの保存に失敗しました');
      }
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.summaryContainer}>
        <Text style={[styles.summaryText, { color: 'green' }]}>
          総合総資産（販売価格）: {totalSalePrice} 円(実物: {realSalePrice} 円｜金融: {financialSalePrice} 円)
        </Text>
        <Text style={[styles.summaryText, { color: 'orange' }]}>
          資産ハイライト: {highestAssetName} : {highestSalePrice} 円
        </Text>
      </View>

      <Button title="買取価格詳細を見る" onPress={showBuyPriceDetails} />

      <Calendar
        onDayPress={onDayPress}
        markedDates={selectedDate ? { [selectedDate]: { selected: true } } : {}}
      />
      {selectedDate ? (
  <View style={styles.memoContainer}>
    <Text style={styles.memoLabel}>メモ ({selectedDate}):</Text>
    <TextInput
      style={[styles.memoInput, { height: 200, textAlignVertical: 'top' }]} // 高さを150に設定
      multiline
      value={memoText}
      onChangeText={setMemoText}
    />
    <Button title="メモ保存" onPress={saveMemo} />
  </View>
) : null}

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
  memoContainer: {
    marginVertical: 16,
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
});
