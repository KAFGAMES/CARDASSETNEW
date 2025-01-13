/**
 * DashboardScreen.tsx
 * 既存の CardDashboard 仕様を踏襲してダッシュボードを表示
 */
import React, {useState} from 'react';
import {View, Text, StyleSheet, FlatList} from 'react-native';

type Card = {
  id: number;
  name: string;
  status: string;
  price: number;
};

const DashboardScreen = () => {
  // サンプルデータ
  const [cards, setCards] = useState<Card[]>([
    {id: 1, name: 'カードA', status: '美品', price: 1000},
    {id: 2, name: 'カードB', status: '使用感あり', price: 700},
    {id: 3, name: 'カードC', status: '未使用', price: 2000},
  ]);

  const totalCardCount = cards.length;
  const totalPrice = cards.reduce((acc, card) => acc + card.price, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>カードダッシュボード</Text>

      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>総カード枚数: {totalCardCount} 枚</Text>
        <Text style={styles.summaryText}>総資産(価格合計): {totalPrice} 円</Text>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.cardItem}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardStatus}>{`状態: ${item.status}`}</Text>
            <Text style={styles.cardPrice}>{`価格: ${item.price} 円`}</Text>
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
  cardName: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardStatus: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
});
