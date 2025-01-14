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
    product_id: '2', // 金融資産として分類
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

  useEffect(() => { initDB(); }, []);
  useEffect(() => { if (isFocused) fetchData(); }, [isFocused]);

  const fetchData = async () => {
    try {
      const data = await getAllAssets();
      setAssets(data.filter(asset => asset.product_id === '2')); // 金融資産のみ表示
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
        product_id: '2', // 金融資産として分類
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

  const handleFetchNewPrice = async () => {
    if (!newForm.name) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    try {
      setLoadingNewPrice(true);
      const result = await fetchMarketPriceFromRakuten(newForm.name);
      setNewForm(prev => ({
        ...prev,
        sale_price: result.sale_price,
      }));
      Alert.alert('取得成功', `販売価格:${result.sale_price} 円`);
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '相場の取得に失敗しました。');
    } finally {
      setLoadingNewPrice(false);
    }
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

  // ソート処理
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

  // フィルタ処理（検索、カテゴリー、状態）
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

  const highestSalePrice = filteredAssets.length ? filteredAssets[0].sale_price : 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>金融資産一覧</Text>

      {/* ソートとフィルタの選択UI */}
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
        renderItem={({ item }) => {
          //const isHighlight = item.sale_price === highestSalePrice && highestSalePrice > 0;
          return (
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
          );
        }}
      />
      <Modal visible={addModalVisible} animationType="slide" onRequestClose={() => setAddModalVisible(false)}>
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>新規資産を登録</Text>
          <TextInput style={styles.modalInput} placeholder="商品IDは自動設定" editable={false} value={newForm.product_id} />
          <TextInput style={styles.modalInput} placeholder="名称 (例: 銘柄名)" value={newForm.name} onChangeText={text => handleNewFormChange('name', text)} />
          <Text style={styles.label}>カテゴリー</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={newForm.category} onValueChange={value => handleNewFormChange('category', value)}>
              {categoryOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
            </Picker>
          </View>
          {/* 金融資産では状態の選択肢は固定 */}
          <Text style={styles.label}>状態</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={newForm.condition} onValueChange={value => handleNewFormChange('condition', value)}>
              {conditionOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
            </Picker>
          </View>
          <View style={styles.row}>
            <Button title="販売相場を取得" onPress={handleFetchNewPrice} />
            <View style={{ width: 10 }} />
            <Button title="買取相場の検索" onPress={() => openSearchSitesByName(newForm.name)} />
            {loadingNewPrice && <ActivityIndicator style={{ marginLeft: 8 }} />}
          </View>
          <Text style={[styles.label, { marginTop: 10 }]}>販売価格 (数字)</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={String(newForm.sale_price || '')} onChangeText={text => handleNewFormChange('sale_price', text)} />
          <Text style={styles.label}>買取価格 (数字)</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={String(newForm.buy_price || '')} onChangeText={text => handleNewFormChange('buy_price', text)} />
          <Text style={styles.label}>購入日 (例: 2025-01-01)</Text>
          <TextInput style={styles.modalInput} value={newForm.purchase_date} onChangeText={text => handleNewFormChange('purchase_date', text)} />
          <Text style={styles.label}>所持枚数 (数字)</Text>
          <TextInput style={styles.modalInput} keyboardType="numeric" value={String(newForm.quantity || '')} onChangeText={text => handleNewFormChange('quantity', text)} />
          <Text style={styles.label}>メモ (任意)</Text>
          <TextInput style={styles.modalInput} value={newForm.memo} onChangeText={text => handleNewFormChange('memo', text)} />
          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <Button title="登録" onPress={handleAdd} />
            <Button title="キャンセル" onPress={() => setAddModalVisible(false)} color="#999" />
          </View>
        </ScrollView>
      </Modal>
      <Modal visible={detailModalVisible} animationType="slide" onRequestClose={() => setDetailModalVisible(false)}>
        {detailForm && (
          <ScrollView style={styles.modalContainer}>
            <Text style={styles.modalTitle}>詳細情報</Text>
            <Text style={styles.label}>商品ID</Text>
            <TextInput style={styles.modalInput} value={detailForm.product_id} editable={false} />
            <Text style={styles.label}>名称</Text>
            <TextInput style={styles.modalInput} value={detailForm.name} onChangeText={v => handleDetailFormChange('name', v)} />
            <Text style={styles.label}>カテゴリー</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={detailForm.category} onValueChange={v => handleDetailFormChange('category', v)}>
                {categoryOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
              </Picker>
            </View>
            {/* 金融資産では状態固定 */}
            <Text style={styles.label}>状態</Text>
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={detailForm.condition} onValueChange={v => handleDetailFormChange('condition', v)}>
                {conditionOptions.map(opt => <Picker.Item label={opt} value={opt} key={opt} />)}
              </Picker>
            </View>
            <View style={styles.row}>
              <Button title="販売相場を取得" onPress={handleFetchDetailPrice} />
              <View style={{ width: 10 }} />
              <Button title="買取相場の検索" onPress={() => openSearchSitesByName(detailForm.name)} />
              {loadingDetailPrice && <ActivityIndicator style={{ marginLeft: 8 }} />}
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>販売価格</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.sale_price || '')} onChangeText={v => handleDetailFormChange('sale_price', v)} />
            <Text style={styles.label}>買取価格</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.buy_price || '')} onChangeText={v => handleDetailFormChange('buy_price', v)} />
            <Text style={styles.label}>購入日</Text>
            <TextInput style={styles.modalInput} value={detailForm.purchase_date} onChangeText={v => handleDetailFormChange('purchase_date', v)} />
            <Text style={styles.label}>所持枚数</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.quantity || '')} onChangeText={v => handleDetailFormChange('quantity', v)} />
            <Text style={styles.label}>メモ</Text>
            <TextInput style={styles.modalInput} value={detailForm.memo} onChangeText={v => handleDetailFormChange('memo', v)} />
            <View style={styles.divider} />
            <Text style={styles.subTitle}>売却関連</Text>
            <Text style={styles.label}>売却日</Text>
            <TextInput style={styles.modalInput} value={detailForm.selling_date} onChangeText={v => handleDetailFormChange('selling_date', v)} />
            <Text style={styles.label}>仕入価格</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.cost_price || '')} onChangeText={v => handleDetailFormChange('cost_price', v)} />
            <Text style={styles.label}>売却価格</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.sold_price || '')} onChangeText={v => handleDetailFormChange('sold_price', v)} />
            <Text style={styles.label}>売却手数料</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.sold_commission || '')} onChangeText={v => handleDetailFormChange('sold_commission', v)} />
            <Text style={styles.label}>売買利益</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.trade_profit || '')} onChangeText={v => handleDetailFormChange('trade_profit', v)} />
            <Text style={styles.label}>査定済みフラグ (0 or 1)</Text>
            <TextInput style={styles.modalInput} keyboardType="numeric" value={String(detailForm.estimated_flag || '')} onChangeText={v => handleDetailFormChange('estimated_flag', v)} />
            <View style={[styles.buttonRow, { marginTop: 20 }]}>
              <Button title="更新" onPress={handleUpdate} />
              <Button title="閉じる" onPress={() => setDetailModalVisible(false)} color="#999" />
            </View>
          </ScrollView>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default FinancialAssetScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7', padding: 16 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  searchInput: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 16, fontSize: 16 },
  addButton: { backgroundColor: 'green', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  addButtonText: { color: '#FFF', fontSize: 16 },
  assetItem: { flexDirection: 'row', padding: 12, marginBottom: 8, backgroundColor: '#FFF', borderRadius: 8, elevation: 1 },
  highlightItem: { borderWidth: 2, borderColor: 'orange' },
  assetName: { fontSize: 16, fontWeight: '700' },
  assetText: { fontSize: 14, color: '#333', marginTop: 2 },
  buttonColumn: { justifyContent: 'space-around', marginLeft: 10 },
  detailButton: { backgroundColor: '#00AACC', padding: 8, borderRadius: 8, marginBottom: 8, width: 60, alignItems: 'center' },
  detailButtonText: { color: '#FFF', fontWeight: '600' },
  deleteButton: { backgroundColor: '#CC0033', padding: 8, borderRadius: 8, width: 60, alignItems: 'center' },
  deleteButtonText: { color: '#FFF', fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#FFF', padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, alignSelf: 'center' },
  modalInput: { borderWidth: 1, borderColor: '#DDD', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, marginBottom: 10 },
  label: { fontWeight: '600', marginBottom: 4 },
  pickerWrapper: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#CCC', marginVertical: 12 },
  subTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  pickerSmall: { flex: 1, height: 50 },
});
