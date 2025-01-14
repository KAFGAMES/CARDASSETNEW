import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { initDB, getAllAssets, getMemo } from '../database/Database';
import { Calendar } from 'react-native-calendars';

type Asset = {
  id?: number;
  name: string;
  product_id: string;
  sale_price: number;
  buy_price: number;
  selling_date?: string;    // 売却日
  trade_profit?: number;    // 売買利益
};

const DashboardScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [memoText, setMemoText] = useState<string>('');
  const [profitStats, setProfitStats] = useState({ yearly: 0, monthly: 0, daily: 0 });
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

  useEffect(() => {
    if (selectedDate && assets.length > 0) {
      computeProfitStats();
    }
  }, [selectedDate, assets]);

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

  const computeProfitStats = () => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    let yearly = 0, monthly = 0, daily = 0;

    assets.forEach(asset => {
      if (asset.selling_date) {
        const assetDate = new Date(asset.selling_date);
        const assetYear = assetDate.getFullYear();
        const assetMonth = assetDate.getMonth() + 1;
        const assetDay = assetDate.getDate();
        const profit = asset.trade_profit || 0;
        if (assetYear === year) {
          yearly += profit;
          if (assetMonth === month) {
            monthly += profit;
            if (assetDay === day) {
              daily += profit;
            }
          }
        }
      }
    });

    setProfitStats({ yearly, monthly, daily });
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

      {/* 売買損益の表示 */}
      {/*{selectedDate ? (*/}
        <View style={styles.profitContainer}>
          <Text style={styles.profitText}>
          年間損益: {profitStats.yearly} 円｜月間損益: {profitStats.monthly} 円｜日時損益: {profitStats.daily} 円
          </Text>
        </View>
      {/*) : null}*/}

      {/* 常に表示されるメモエリア */}
      <View style={styles.memoContainer}>
        <Text style={styles.memoLabel}>
          メモ {selectedDate ? `(${selectedDate})` : ''}:
        </Text>
        <ScrollView style={styles.memoDisplay}>
          <Text style={styles.memoText}>
            {memoText || 'メモなし'}
          </Text>
        </ScrollView>
        <Button title="メモ編集" onPress={navigateToEditMemo} />
      </View>
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
  profitContainer: {
    marginBottom: 0,
    padding: 3,
    backgroundColor: '#eef',
    borderRadius: 8,
  },
  profitText: {
    fontSize: 14,
    marginBottom: 4,
  },
  memoContainer: {
    marginVertical: 3,
    height: 250,
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
    flex: 1,
    marginBottom: 8,
  },
  memoText: {
    fontSize: 14,
    color: '#333',
  },
});
