import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { initDB, getAllAssets, getMemo } from '../database/Database';
import { Calendar } from 'react-native-calendars';

type Asset = {
  id?: number;
  name: string;
  product_id: string;
  sale_price: number;
  buy_price: number;
};

const DashboardScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [memoText, setMemoText] = useState<string>('');
  const isFocused = useIsFocused();
  const navigation = useNavigation();

  useEffect(() => {
    initDB();
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchData();
      if (selectedDate) {
        loadMemo(selectedDate);
      }
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

  const loadMemo = async (date: string) => {
    try {
      const memo = await getMemo(date);
      setMemoText(memo);
    } catch (error) {
      console.log(error);
    }
  };

  const totalSalePrice = assets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);
  const realAssets = assets.filter(asset => asset.product_id === '1');
  const financialAssets = assets.filter(asset => asset.product_id === '2');
  const realSalePrice = realAssets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);
  const financialSalePrice = financialAssets.reduce((acc, cur) => acc + (cur.sale_price || 0), 0);
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
    loadMemo(day.dateString);
  };

  const navigateToEditMemo = () => {
    if (selectedDate) {
      navigation.navigate('MemoEdit', { date: selectedDate, memo: memoText });
    } else {
      Alert.alert('日付未選択', 'まず日付を選択してください。');
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

      {/* 常に表示されるメモエリア */}
      {selectedDate ? (
        <View style={styles.memoContainer}>
          <Text style={styles.memoLabel}>メモ ({selectedDate}):</Text>
          <TouchableOpacity style={styles.memoDisplay} activeOpacity={1}>
            <Text style={styles.memoText}>
              {memoText || 'メモなし'}
            </Text>
          </TouchableOpacity>
          <Button title="メモ編集" onPress={navigateToEditMemo} />
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
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  memoContainer: {
    marginVertical: 16,
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  memoDisplay: {
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFF',
    minHeight: 100,
    justifyContent: 'flex-start',
  },
  memoText: {
    fontSize: 14,
    color: '#333',
  },
});
