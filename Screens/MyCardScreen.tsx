/**
 * MyCardScreen.tsx
 * 価格の高い順で並べつつ、テキスト入力によるフィルター検索を実装
 */
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type Card = {
  id: number;
  name: string;
  status: string;
  price: number;
};

const MyCardScreen = () => {
  // サンプルデータ
  const [cards] = useState<Card[]>([
    {id: 1, name: 'カードA', status: '美品', price: 1000},
    {id: 2, name: 'カードB', status: '使用感あり', price: 700},
    {id: 3, name: 'カードC', status: '未使用', price: 2000},
    {id: 4, name: 'カードD', status: 'レア', price: 5000},
    {id: 5, name: 'カードE', status: '美品', price: 1500},
  ]);

  // フィルター用のテキスト
  const [searchText, setSearchText] = useState('');

  // カードを価格の高い順にソート
  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => b.price - a.price);
  }, [cards]);

  // テキスト入力でフィルター
  const filteredCards = useMemo(() => {
    if (!searchText) return sortedCards;
    const lowerSearchText = searchText.toLowerCase();
    return sortedCards.filter(card =>
      card.name.toLowerCase().includes(lowerSearchText) ||
      card.status.toLowerCase().includes(lowerSearchText),
    );
  }, [searchText, sortedCards]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>My Card 一覧</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="カード名や状態で検索"
        value={searchText}
        onChangeText={setSearchText}
      />

      <FlatList
        data={filteredCards}
        keyExtractor={item => item.id.toString()}
        renderItem={({item}) => (
          <View style={styles.cardItem}>
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardStatus}>{`状態: ${item.status}`}</Text>
            <Text style={styles.cardPrice}>{`価格: ${item.price} 円`}</Text>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
};

export default MyCardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  cardItem: {
    padding: 12,
    marginBottom: 8,
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
