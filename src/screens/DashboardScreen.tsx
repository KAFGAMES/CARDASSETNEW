////////////////////////////////////////////////////////////////////////////////
// src/screens/DashboardScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, ScrollView } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  initDB,
  getAllAssets,
  getMemo,
  getAllMemos,
  getAllTransactions, // ← 新規追加
} from '../database/Database';
import { Calendar } from 'react-native-calendars';

type Asset = {
  id?: number;
  name: string;
  product_id: string;
  sale_price: number;
  buy_price: number;
  selling_date?: string;
  trade_profit?: number;
  quantity?: number;
};

type Transaction = {
  id?: number;
  asset_id: number;
  trans_date: string;      // 取引日(売却日)
  trans_type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  profit: number;          // 売却時の損益
  memo?: string;
};

const DashboardScreen = () => {
  const today = new Date().toISOString().split('T')[0];
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]); // 追加
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [memoText, setMemoText] = useState<string>('');
  const [profitStats, setProfitStats] = useState({ yearly: 0, monthly: 0, daily: 0 });
  const [calendarMarks, setCalendarMarks] = useState({});
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

  // ここで assets & transactions の読み込みが終わったら損益集計を実施
  useEffect(() => {
    if (selectedDate && (assets.length > 0 || transactions.length > 0)) {
      computeProfitStats();
    }
  }, [selectedDate, assets, transactions]);

  useEffect(() => {
    if (assets.length > 0 || transactions.length > 0) {
      computeCalendarMarks();
    }
  }, [assets, transactions]);

  const fetchData = async () => {
    try {
      // 全assets取得
      const data = await getAllAssets();
      setAssets(data);

      // 全transactions取得（金融資産ID=2の売却取引をここで使う）
      const trans = await getAllTransactions();
      setTransactions(trans);

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

  /**
   * 実物資産(ID=1)は assetsから
   * 金融資産(ID=2)は transactionsから
   * 日付が一致する取引の profit を合算して、
   * 年間・月間・日次の損益を計算
   */
  const computeProfitStats = () => {
    const dateObj = new Date(selectedDate);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();

    let yearly = 0, monthly = 0, daily = 0;

    // 1) 実物資産 (ID=1): selling_date & trade_profit
    assets
      .filter(a => a.product_id === '1' && a.selling_date)
      .forEach(a => {
        const date = new Date(a.selling_date!);
        const assetYear = date.getFullYear();
        const assetMonth = date.getMonth() + 1;
        const assetDay = date.getDate();
        const profit = a.trade_profit || 0;

        if (assetYear === year) {
          yearly += profit;
          if (assetMonth === month) {
            monthly += profit;
            if (assetDay === day) {
              daily += profit;
            }
          }
        }
      });

    // 2) 金融資産 (ID=2): SELLトランザクションの trans_date & profit
    transactions
      .filter(tr => tr.trans_type === 'SELL')
      .forEach(tr => {
        const date = new Date(tr.trans_date);
        const trYear = date.getFullYear();
        const trMonth = date.getMonth() + 1;
        const trDay = date.getDate();
        const profit = tr.profit;

        if (trYear === year) {
          yearly += profit;
          if (trMonth === month) {
            monthly += profit;
            if (trDay === day) {
              daily += profit;
            }
          }
        }
      });

    setProfitStats({ yearly, monthly, daily });
  };

  /**
   * カレンダー用マーク: 
   * ID=1 → assets の selling_date
   * ID=2 → transactions の trans_date
   */
  const computeCalendarMarks = async () => {
    const profitByDate: { [key: string]: number } = {};

    // (1) 実物資産 (ID=1) の売却
    assets
      .filter(a => a.product_id === '1' && a.selling_date)
      .forEach(a => {
        const dateKey = a.selling_date as string;
        profitByDate[dateKey] = (profitByDate[dateKey] || 0) + (a.trade_profit || 0);
      });

    // (2) 金融資産 (ID=2) の売却トランザクション
    transactions
      .filter(tr => tr.trans_type === 'SELL')
      .forEach(tr => {
        const dateKey = tr.trans_date;
        profitByDate[dateKey] = (profitByDate[dateKey] || 0) + tr.profit;
      });

    // メモ有無のチェック
    let memos: { date: string; memo: string }[] = [];
    try {
      memos = await getAllMemos();
    } catch (error) {
      console.log(error);
    }
    const memoDates: { [key: string]: boolean } = {};
    memos.forEach(({ date, memo }) => {
      if (memo.trim() !== '') {
        memoDates[date] = true;
      }
    });

    // カレンダーマーク生成
    const marks: { [key: string]: any } = {};
    Object.keys(profitByDate).forEach(date => {
      const totalProfit = profitByDate[date];
      const dots = [];
      if (totalProfit > 0) {
        dots.push({ key: 'profit', color: '#39FF14' });
      } else if (totalProfit < 0) {
        dots.push({ key: 'loss', color: '#FF3131' });
      }
      if (memoDates[date]) {
        dots.push({ key: 'memo', color: '#000' });
      }
      marks[date] = { dots };
    });

    // メモのみの日付も反映
    Object.keys(memoDates).forEach(date => {
      if (!marks[date]) {
        marks[date] = { dots: [{ key: 'memo', color: '#000' }] };
      }
    });

    setCalendarMarks(marks);
  };

  // 以下、既存の表示やUIはほぼ同じ
  // 価格×個数で総資産を計算
  const totalSalePrice = assets.reduce((acc, cur) => {
    const price = cur.sale_price || 0;
    const quantity = cur.quantity || 1;
    return acc + (price * quantity);
  }, 0);

  const realSalePrice = assets
    .filter(a => a.product_id === '1')
    .reduce((acc, cur) => {
      const price = cur.sale_price || 0;
      const quantity = cur.quantity || 1;
      return acc + (price * quantity);
    }, 0);

  const financialSalePrice = assets
    .filter(a => a.product_id === '2')
    .reduce((acc, cur) => {
      const price = cur.sale_price || 0;
      const quantity = cur.quantity || 1;
      return acc + (price * quantity);
    }, 0);

  const highestAsset = assets.reduce((prev, current) =>
    (current.sale_price * (current.quantity || 1) >
     (prev?.sale_price * (prev?.quantity || 1) || 0) ? current : prev),
    {} as Asset
  );
  const highestSalePrice = highestAsset?.sale_price
    ? highestAsset.sale_price * (highestAsset.quantity || 1)
    : 0;
  const highestAssetName = highestAsset?.name || 'なし';

  const showBuyPriceDetails = () => {
    const totalBuyPrice = assets.reduce((acc, cur) => {
      const qty = cur.quantity || 1;
      return acc + ((cur.buy_price || 0) * qty);
    }, 0);
    const details = `合計買取価格: ${totalBuyPrice} 円\n` +
      assets.map(asset => {
        const qty = asset.quantity || 1;
        return `${asset.name}: ${(asset.buy_price || 0) * qty} 円`;
      }).join('\n');
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

  const markedDates = {
    ...calendarMarks,
    ...(selectedDate && {
      [selectedDate]: {
        ...(calendarMarks[selectedDate] || {}),
        selected: true,
        selectedColor: '#004080',
      },
    }),
  };

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <Text style={[styles.summaryText, { color: '#39FF14' }]}>
          総合総資産（販売価格）: {totalSalePrice} 円(実物: {realSalePrice} 円｜金融: {financialSalePrice} 円)
        </Text>
        <Text style={[styles.summaryText, { color: '#FFD700' }]}>
          資産ハイライト: {highestAssetName} : {highestSalePrice} 円
        </Text>
      </View>

      {/* ← ここが年間損益等を表示する部分。ID=1 + ID=2 (transactions) を合算した結果が表示されます */}
      <View style={styles.profitContainer}>
        <Text style={styles.profitText}>
          年間損益: {profitStats.yearly} 円｜月間損益: {profitStats.monthly} 円｜日時損益: {profitStats.daily} 円
        </Text>
      </View>

      <Button title="買取価格詳細を見る" onPress={showBuyPriceDetails} color="#1E90FF" />

      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType={'multi-dot'}
        monthFormat={'yyyy年 M月'}
        theme={{
          backgroundColor: '#001f3f',
          calendarBackground: '#003366',
          textSectionTitleColor: '#39FF14',
          dayTextColor: '#FFFFFF',
          todayTextColor: '#FF4500',
          selectedDayBackgroundColor: '#004080',
          selectedDayTextColor: '#FFFFFF',
          dotColor: '#39FF14',
          selectedDotColor: '#FFFFFF',
          arrowColor: '#39FF14',
          monthTextColor: '#FFFFFF',
          indicatorColor: '#39FF14',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 14,
        }}
      />

      <View style={styles.memoContainer}>
        <Text style={styles.memoLabel}>
          メモ {selectedDate ? `(${selectedDate})` : ''}:
        </Text>
        <ScrollView style={styles.memoDisplay}>
          <Text style={styles.memoText}>
            {memoText || 'メモなし'}
          </Text>
        </ScrollView>
        <Button title="メモ編集" onPress={navigateToEditMemo} color="#FF1493" />
      </View>
    </View>
  );
};

export default DashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#001f3f', 
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: '#39FF14',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  profitContainer: {
    marginBottom: 16,
    padding: 10,
    backgroundColor: '#003366',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  profitText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  memoContainer: {
    minHeight: 220,
    maxHeight: 220,
    backgroundColor: '#003366',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#39FF14',
  },
  memoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFD700',
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  memoDisplay: {
    borderWidth: 1,
    borderColor: '#333',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#000',
    flex: 1,
    flexGrow: 1,
    marginBottom: 8,
  },
  memoText: {
    fontSize: 14,
    color: '#39FF14',
    lineHeight: 20,
  },
});
