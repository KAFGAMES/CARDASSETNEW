////////////////////////////////////////////////////////////////////////////////
// src/screens/FinancialAssetScreen.tsx
////////////////////////////////////////////////////////////////////////////////
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Modal,
  Button,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native';
import {
  initDB,
  getAllAssets,
  insertAsset,
  updateAsset,
  deleteAsset,
} from '../database/Database';
import { RAKUTEN_APP_ID } from '../config';

type Asset = {
  id?: number;
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
};

const categoryOptions = ['株', '仮想通貨', '債券', '投資信託', 'その他'];
const conditionOptions = ['未設定'];
const sortOptions = ['新しい順', '古い順', '価格の安い順', '価格の高い順'];

async function fetchMarketPriceFromRakuten(name: string) {
  if (!name) throw new Error('商品名が空です');
  const appId = RAKUTEN_APP_ID;
  const endpoint = 'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706';
  const url = `${endpoint}?applicationId=${appId}&keyword=${encodeURIComponent(name)}&format=json`;
  
  const response = await fetch(url);
  const json = await response.json();
  
  if (json.Items && json.Items.length > 0) {
    const item = json.Items[0].Item;
    return { sale_price: item.itemPrice || 0, buy_price: 0 };
  }
  throw new Error('商品が見つかりませんでした');
}

function openSearchSitesByName(name: string) {
  if (!name) {
    Alert.alert('エラー', '商品名が空です。');
    return;
  }
  Alert.alert('サイトを選択', 'どのサイトで検索しますか？', [
    {
      text: 'メルカリ',
      onPress: () => {
        Linking.openURL('https://www.mercari.com/jp/search/?keyword=' + encodeURIComponent(name));
      },
    },
    {
      text: 'ヤフオク',
      onPress: () => {
        Linking.openURL('https://auctions.yahoo.co.jp/search/search?p=' + encodeURIComponent(name));
      },
    },
    { text: 'キャンセル', style: 'cancel' },
  ]);
}

const FinancialAssetScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchText, setSearchText] = useState('');
  const isFocused = useIsFocused();

  const [sortOption, setSortOption] = useState(sortOptions[0]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCondition, setFilterCondition] = useState('');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newForm, setNewForm] = useState<Asset>({
    product_id: '2',
    name: '',
    category: categoryOptions[0],
    condition: conditionOptions[0],
    sale_price: 0,
    buy_price: 0,
    purchase_date: '',
    selling_date: '',
    quantity: 1,
    estimated_flag: 0,
    memo: '',
    cost_price: 0,
    sold_price: 0,
    sold_commission: 0,
    trade_profit: 0,
  });
  const [loadingNewPrice, setLoadingNewPrice] = useState(false);

  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailForm, setDetailForm] = useState<Asset | null>(null);
  const [loadingDetailPrice, setLoadingDetailPrice] = useState(false);

  // 株番号入力モーダル用の状態
  const [stockInputModalVisible, setStockInputModalVisible] = useState(false);
  const [stockNumber, setStockNumber] = useState('');

  useEffect(() => { initDB(); }, []);
  useEffect(() => { if (isFocused) fetchData(); }, [isFocused]);

  const fetchData = async () => {
    try {
      const data = await getAllAssets();
      setAssets(data.filter(asset => asset.product_id === '2'));
    } catch (error) {
      console.log(error);
    }
  };

  const handleNewFormChange = (key: keyof Asset, value: string | number) => {
    const numericFields: (keyof Asset)[] = ['sale_price', 'buy_price', 'quantity'];
    setNewForm(prev => ({
      ...prev,
      [key]: numericFields.includes(key) ? Number(value) : value,
    }));
  };

  const handleAdd = async () => {
    try {
      await insertAsset(newForm);
      setAddModalVisible(false);
      fetchData();
      Alert.alert('登録完了', '新しい資産を登録しました。');
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '登録に失敗しました。');
    } finally {
      setNewForm({
        product_id: '2',
        name: '',
        category: categoryOptions[0],
        condition: conditionOptions[0],
        sale_price: 0,
        buy_price: 0,
        purchase_date: '',
        selling_date: '',
        quantity: 1,
        estimated_flag: 0,
        memo: '',
        cost_price: 0,
        sold_price: 0,
        sold_commission: 0,
        trade_profit: 0,
      });
      setLoadingNewPrice(false);
    }
  };

  const fetchPriceByStockNumber = async (stockNumberInput: string) => {
    try {
      setLoadingNewPrice(true);
      const symbol = stockNumberInput + '.T';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?region=US&lang=ja-JP`;
      const response = await fetch(url);
      const json = await response.json();
      const result = json.chart.result;
      if(!result || result.length === 0) throw new Error('データが見つかりません');
      const meta = result[0].meta;
      if(meta === undefined || meta.regularMarketPrice === undefined) {
        throw new Error('有効なデータがありません');
      }
      const sale_price = meta.regularMarketPrice;
      setNewForm(prev => ({
        ...prev,
        sale_price,
      }));
      Alert.alert('取得成功', `販売価格: ${sale_price} 円`);
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '相場の取得に失敗しました。');
    } finally {
      setLoadingNewPrice(false);
      setStockInputModalVisible(false);
      setStockNumber('');
    }
  };

  const handleFetchNewPriceByNumber = () => {
    setStockInputModalVisible(true);
  };

  const openDetail = (asset: Asset) => {
    setDetailForm({ ...asset });
    setDetailModalVisible(true);
  };

  const handleDetailFormChange = (key: keyof Asset, value: string | number) => {
    if (!detailForm) return;
    const numericFields: (keyof Asset)[] = [
      'sale_price','buy_price','quantity','estimated_flag','cost_price',
      'sold_price','sold_commission','trade_profit',
    ];
    setDetailForm(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: numericFields.includes(key) ? Number(value) : value,
      };
    });
  };

  const handleUpdate = async () => {
    if (!detailForm?.id) return;
    try {
      await updateAsset(detailForm.id, detailForm);
      setDetailModalVisible(false);
      fetchData();
      Alert.alert('更新完了', '資産情報を更新しました。');
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '更新に失敗しました。');
    } finally {
      setLoadingDetailPrice(false);
    }
  };

  const handleFetchDetailPrice = async () => {
    if (!detailForm?.name) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    try {
      setLoadingDetailPrice(true);
      const result = await fetchMarketPriceFromRakuten(detailForm.name);
      setDetailForm(prev => prev ? {
        ...prev,
        sale_price: result.sale_price,
      } : null);
      Alert.alert('取得成功', `販売価格:${result.sale_price} 円`);
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '相場の取得に失敗しました。');
    } finally {
      setLoadingDetailPrice(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    Alert.alert('削除確認', '本当に削除しますか？', [
      { text: 'いいえ', style: 'cancel' },
      {
        text: 'はい',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAsset(id);
            fetchData();
            Alert.alert('削除完了', '資産を削除しました。');
          } catch (error) {
            console.log(error);
            Alert.alert('エラー', '削除に失敗しました。');
          }
        },
      },
    ]);
  };

  const sortedAssets = useMemo(() => {
    let sorted = [...assets];
    switch(sortOption) {
      case '新しい順':
        sorted.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
        break;
      case '古い順':
        sorted.sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime());
        break;
      case '価格の安い順':
        sorted.sort((a, b) => a.sale_price - b.sale_price);
        break;
      case '価格の高い順':
        sorted.sort((a, b) => b.sale_price - a.sale_price);
        break;
      default:
        break;
    }
    return sorted;
  }, [assets, sortOption]);

  const filteredAssets = useMemo(() => {
    return sortedAssets.filter(asset => {
      const lowerSearch = searchText.toLowerCase();
      const matchesSearch = 
        asset.name.toLowerCase().includes(lowerSearch) ||
        asset.category.toLowerCase().includes(lowerSearch) ||
        asset.condition.toLowerCase().includes(lowerSearch);
      const matchesCategory = filterCategory ? asset.category === filterCategory : true;
      const matchesCondition = filterCondition ? asset.condition === filterCondition : true;
      return matchesSearch && matchesCategory && matchesCondition;
    });
  }, [searchText, sortedAssets, filterCategory, filterCondition]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>金融資産一覧</Text>
      <View style={styles.filterRow}>
        <Picker
          style={styles.pickerSmall}
          selectedValue={sortOption}
          onValueChange={value => setSortOption(value)}
        >
          {sortOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
        </Picker>
        <Picker
          style={styles.pickerSmall}
          selectedValue={filterCategory}
          onValueChange={value => setFilterCategory(value)}
        >
          <Picker.Item label="全てのカテゴリ" value="" />
          {categoryOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
        </Picker>
        <Picker
          style={styles.pickerSmall}
          selectedValue={filterCondition}
          onValueChange={value => setFilterCondition(value)}
        >
          <Picker.Item label="全ての状態" value="" />
          {conditionOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
        </Picker>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="名称・カテゴリ・状態を検索"
        value={searchText}
        onChangeText={setSearchText}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
        <Text style={styles.addButtonText}>+ 新規登録</Text>
      </TouchableOpacity>
      <FlatList
        data={filteredAssets}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <View style={[styles.assetItem, styles.highlightItem]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assetName}>{item.name}</Text>
              <Text style={styles.assetText}>カテゴリ: {item.category}</Text>
              <Text style={styles.assetText}>状態: {item.condition}</Text>
              <Text style={styles.assetText}>販売価格: {item.sale_price} 円</Text>
              <Text style={styles.assetText}>買取価格: {item.buy_price} 円</Text>
              <Text style={styles.assetText}>所持枚数: {item.quantity}</Text>
              <Text style={styles.assetText}>購入日: {item.purchase_date || '-'}</Text>
              <Text style={styles.assetText}>メモ: {item.memo || '-'}</Text>
            </View>
            <View style={styles.buttonColumn}>
              <TouchableOpacity style={styles.detailButton} onPress={() => openDetail(item)}>
                <Text style={styles.detailButtonText}>詳細</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
                <Text style={styles.deleteButtonText}>削除</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>新規資産を登録</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            placeholder="商品IDは自動設定"
            editable={false}
            value={newForm.product_id}
          />
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            placeholder="名称 (例: 銘柄名)"
            value={newForm.name}
            onChangeText={text => handleNewFormChange('name', text)}
          />
          <Text style={styles.label}>カテゴリー</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={newForm.category} onValueChange={value => handleNewFormChange('category', value)}>
              {categoryOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
            </Picker>
          </View>
          <Text style={styles.label}>状態</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={newForm.condition} onValueChange={value => handleNewFormChange('condition', value)}>
              {conditionOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
            </Picker>
          </View>
          <View style={styles.row}>
            {newForm.category === '株' && (
              <>
                <Button title="株番号から相場を取得" onPress={handleFetchNewPriceByNumber} />
                <View style={{ width: 10 }} />
              </>
            )}
            <Button title="買取相場の検索" onPress={() => openSearchSitesByName(newForm.name)} />
            {loadingNewPrice && <ActivityIndicator style={{ marginLeft: 8 }} />}
          </View>
          <Text style={[styles.label, { marginTop: 10, color: 'blue' }]}>販売価格 (数字)</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            keyboardType="numeric"
            value={String(newForm.sale_price || '')}
            onChangeText={text => handleNewFormChange('sale_price', text)}
          />
          <Text style={[styles.label, { color: 'blue' }]}>買取価格 (数字)</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            keyboardType="numeric"
            value={String(newForm.buy_price || '')}
            onChangeText={text => handleNewFormChange('buy_price', text)}
          />
          <Text style={[styles.label, { color: 'blue' }]}>購入日 (例: 2025-01-01)</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            value={newForm.purchase_date}
            onChangeText={text => handleNewFormChange('purchase_date', text)}
          />
          <Text style={[styles.label, { color: 'blue' }]}>所持枚数 (数字)</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            keyboardType="numeric"
            value={String(newForm.quantity || '')}
            onChangeText={text => handleNewFormChange('quantity', text)}
          />
          <Text style={[styles.label, { color: 'blue' }]}>メモ (任意)</Text>
          <TextInput
            style={[styles.modalInput, { color: 'blue' }]}
            value={newForm.memo}
            onChangeText={text => handleNewFormChange('memo', text)}
          />
          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <Button title="登録" onPress={handleAdd} />
            <Button title="キャンセル" onPress={() => setAddModalVisible(false)} color="#999" />
          </View>
        </ScrollView>
      </Modal>

      {/* 株番号入力モーダル */}
      <Modal
        visible={stockInputModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStockInputModalVisible(false)}
      >
        <View style={styles.stockModalOverlay}>
          <View style={styles.stockModalContainer}>
            <Text style={styles.modalTitle}>株番号入力</Text>
            <TextInput
              style={[styles.modalInput, { color: 'black' }]}
              placeholder="株番号を入力"
              value={stockNumber}
              onChangeText={setStockNumber}
              keyboardType="numeric"
            />
            <View style={styles.buttonRow}>
              <Button title="取得" onPress={() => fetchPriceByStockNumber(stockNumber)} />
              <Button title="キャンセル" onPress={() => setStockInputModalVisible(false)} color="#999" />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        {detailForm && (
          <ScrollView style={styles.modalContainer}>
            <Text style={styles.modalTitle}>詳細情報</Text>
            {/* 以下、詳細情報モーダルの内容 */}
          </ScrollView>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default FinancialAssetScreen;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#2e1c0b',
    padding: 16 
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 16,
    color: '#FFD700',
    textShadowColor: '#B22222',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  searchInput: { 
    backgroundColor: '#3b2a1a', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8, 
    marginBottom: 16, 
    fontSize: 16,
    color: '#FFD700'
  },
  addButton: { 
    backgroundColor: '#B8860B', 
    padding: 10, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginBottom: 12,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.9,
  },
  addButtonText: { 
    color: '#2e1c0b', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  assetItem: { 
    flexDirection: 'row', 
    padding: 12, 
    marginBottom: 8, 
    backgroundColor: '#3b2a1a', 
    borderRadius: 8, 
    elevation: 1,
    shadowColor: '#B22222',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  highlightItem: { 
    borderWidth: 2, 
    borderColor: '#FFD700' 
  },
  assetName: { 
    fontSize: 16, 
    fontWeight: '700',
    color: '#FFD700',
    textShadowColor: '#B22222',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  assetText: { 
    fontSize: 14, 
    color: '#EEE', 
    marginTop: 2 
  },
  buttonColumn: { 
    justifyContent: 'space-around', 
    marginLeft: 10 
  },
  detailButton: { 
    backgroundColor: '#8B0000', 
    padding: 8, 
    borderRadius: 8, 
    marginBottom: 8, 
    width: 60, 
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  detailButtonText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
  deleteButton: { 
    backgroundColor: '#4B0000', 
    padding: 8, 
    borderRadius: 8, 
    width: 60, 
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  deleteButtonText: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#3b2a1a', 
    padding: 16 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12, 
    alignSelf: 'center',
    color: '#FFD700',
    textShadowColor: '#B22222',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  modalInput: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    borderRadius: 8, 
    marginBottom: 10,
    backgroundColor: '#2e1c0b',
  },
  label: { 
    fontWeight: '600', 
    marginBottom: 4,
    color: '#FFD700'
  },
  pickerWrapper: { 
    borderWidth: 1, 
    borderColor: '#DDD', 
    borderRadius: 8, 
    marginBottom: 10, 
    overflow: 'hidden',
    backgroundColor: '#2e1c0b'
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#CCC', 
    marginVertical: 12 
  },
  subTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8,
    color: '#FFD700'
  },
  buttonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    marginBottom: 20 
  },
  filterRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  pickerSmall: { 
    flex: 1, 
    height: 50,
    color: '#FFD700',
    backgroundColor: '#2e1c0b'
  },
  stockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockModalContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 8,
  },
});
