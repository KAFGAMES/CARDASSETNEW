////////////////////////////////////////////////////////////////////////////////
// src/screens/MyAssetScreen.tsx
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
  ActivityIndicator, // ローディングインジケータ
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

type Asset = {
  id?: number; // 内部ID（ユーザーには非表示）
  product_id: string;  // 商品ID
  name: string;        // 名称
  category: string;    // カテゴリー
  condition: string;   // 状態
  sale_price: number;  // 販売価格
  buy_price: number;   // 買取価格
  purchase_date: string;  
  selling_date: string;    // 売却日 (詳細のみ)
  quantity: number;        // 所持枚数
  estimated_flag: number;  // 査定済みフラグ (詳細のみ)
  memo: string;            // メモ
  cost_price: number;      // 仕入価格(詳細のみ)
  sold_price: number;      // 売却価格(詳細のみ)
  sold_commission: number; // 売却手数料(詳細のみ)
  trade_profit: number;    // 売買利益(詳細のみ)
};

const categoryOptions = ['カード', '家具', 'PC備品', '不動産', '金融商品'];
const conditionOptions = ['状態S', '状態A', '状態B', '状態C'];

/**
 * 商品名を元に相場(販売価格,買取価格)を取得するダミー関数。
 * 
 * 実際には下記のような流れになります:
 *   - fetch('https://example.com/api/getPrice?keyword=xxx')
 *   - レスポンスをJSON化
 *   - そこから sale_price, buy_price を取り出す
 */
async function fetchMarketPriceByName(name: string) {
  if (!name) {
    throw new Error('商品名が空です');
  }
  
  // ★ダミー実装★
  // 例えば実際には下記のような形：
  // const response = await fetch(`https://example.com/api/price?keyword=${encodeURIComponent(name)}`);
  // const json = await response.json();
  // return { sale_price: json.sale, buy_price: json.buy };

  // ここでは単に乱数で相場を返す例
  return new Promise<{ sale_price: number; buy_price: number }>((resolve) => {
    setTimeout(() => {
      const randomSale = Math.floor(Math.random() * 5000) + 1000; // 1000~6000
      const randomBuy = Math.floor(randomSale * 0.5);            // 買取は販売価格の半分くらい
      resolve({ sale_price: randomSale, buy_price: randomBuy });
    }, 1000); // 1秒後に返す
  });
}

const MyAssetScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchText, setSearchText] = useState('');
  const isFocused = useIsFocused();

  // --- 新規登録モーダル ---
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newForm, setNewForm] = useState<Asset>({
    product_id: '',
    name: '',
    category: categoryOptions[0],
    condition: conditionOptions[1], // 状態A
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
  const [loadingNewPrice, setLoadingNewPrice] = useState(false); // 相場取得中のローディング

  // --- 詳細モーダル ---
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailForm, setDetailForm] = useState<Asset | null>(null);
  const [loadingDetailPrice, setLoadingDetailPrice] = useState(false); // 相場取得中のローディング

  // DB 初期化(1回) 
  useEffect(() => {
    initDB();
  }, []);

  // フォーカス時にデータ取得
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

  // ---------------------------------------------
  // 新規登録フォーム操作
  // ---------------------------------------------
  const handleNewFormChange = (key: keyof Asset, value: string | number) => {
    const numericFields: (keyof Asset)[] = ['sale_price','buy_price','quantity'];
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
      // フォームリセット
      setNewForm({
        product_id: '',
        name: '',
        category: categoryOptions[0],
        condition: conditionOptions[1],
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

  /** 新規登録モーダル → 商品名から相場取得 */
  const handleFetchNewPrice = async () => {
    if (!newForm.name) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    try {
      setLoadingNewPrice(true);
      const result = await fetchMarketPriceByName(newForm.name);
      // 取得結果をフォームに反映
      setNewForm(prev => ({
        ...prev,
        sale_price: result.sale_price,
        buy_price: result.buy_price,
      }));
      Alert.alert('取得成功', `販売価格:${result.sale_price} / 買取価格:${result.buy_price}`);
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '相場の取得に失敗しました。');
    } finally {
      setLoadingNewPrice(false);
    }
  };

  // ---------------------------------------------
  // 詳細フォーム操作
  // ---------------------------------------------
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
      if (!prev) return prev;
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

  /** 詳細モーダル → 商品名から相場取得 */
  const handleFetchDetailPrice = async () => {
    if (!detailForm?.name) {
      Alert.alert('エラー', '商品名を入力してください');
      return;
    }
    try {
      setLoadingDetailPrice(true);
      const result = await fetchMarketPriceByName(detailForm.name);
      setDetailForm(prev => (prev ? {
        ...prev,
        sale_price: result.sale_price,
        buy_price: result.buy_price,
      } : null));
      Alert.alert('取得成功', `販売価格:${result.sale_price} / 買取価格:${result.buy_price}`);
    } catch (error) {
      console.log(error);
      Alert.alert('エラー', '相場の取得に失敗しました。');
    } finally {
      setLoadingDetailPrice(false);
    }
  };

  // ---------------------------------------------
  // 削除
  // ---------------------------------------------
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

  // ---------------------------------------------
  // ソート＆フィルター
  // ---------------------------------------------
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => b.sale_price - a.sale_price);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    if (!searchText) return sortedAssets;
    const lowerSearch = searchText.toLowerCase();
    return sortedAssets.filter(({ name, category, condition }) => {
      return (
        name.toLowerCase().includes(lowerSearch) ||
        category.toLowerCase().includes(lowerSearch) ||
        condition.toLowerCase().includes(lowerSearch)
      );
    });
  }, [searchText, sortedAssets]);

  const highestSalePrice = filteredAssets.length
    ? filteredAssets[0].sale_price
    : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>マイ資産一覧</Text>

      {/* 検索欄 */}
      <TextInput
        style={styles.searchInput}
        placeholder="名称・カテゴリ・状態を検索"
        value={searchText}
        onChangeText={setSearchText}
      />

      {/* 新規登録ボタン */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+ 新規登録</Text>
      </TouchableOpacity>

      {/* 資産一覧 */}
      <FlatList
        data={filteredAssets}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => {
          const isHighlight = item.sale_price === highestSalePrice && highestSalePrice > 0;
          return (
            <View
              style={[styles.assetItem, isHighlight && styles.highlightItem]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.assetName}>
                  {item.name} (商品ID: {item.product_id})
                </Text>
                <Text style={styles.assetText}>
                  カテゴリ: {item.category}
                </Text>
                <Text style={styles.assetText}>
                  状態: {item.condition}
                </Text>
                <Text style={styles.assetText}>
                  販売価格: {item.sale_price} 円
                </Text>
                <Text style={styles.assetText}>
                  買取価格: {item.buy_price} 円
                </Text>
                <Text style={styles.assetText}>
                  所持枚数: {item.quantity}
                </Text>
                <Text style={styles.assetText}>
                  購入日: {item.purchase_date || '-'}
                </Text>
                <Text style={styles.assetText}>
                  メモ: {item.memo || '-'}
                </Text>
              </View>

              {/* 右側ボタン群 */}
              <View style={styles.buttonColumn}>
                <TouchableOpacity
                  style={styles.detailButton}
                  onPress={() => openDetail(item)}
                >
                  <Text style={styles.detailButtonText}>詳細</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Text style={styles.deleteButtonText}>削除</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* ------------------------------------------------ */}
      {/* 新規登録モーダル */}
      {/* ------------------------------------------------ */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>新規資産を登録</Text>

          <TextInput
            style={styles.modalInput}
            placeholder="商品ID (例: CARD001)"
            value={newForm.product_id}
            onChangeText={text => handleNewFormChange('product_id', text)}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="名称 (例: レアカード)"
            value={newForm.name}
            onChangeText={text => handleNewFormChange('name', text)}
          />

          <Text style={styles.label}>カテゴリー</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={newForm.category}
              onValueChange={value => handleNewFormChange('category', value)}
            >
              {categoryOptions.map(opt => (
                <Picker.Item label={opt} value={opt} key={opt} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>状態</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={newForm.condition}
              onValueChange={value => handleNewFormChange('condition', value)}
            >
              {conditionOptions.map(opt => (
                <Picker.Item label={opt} value={opt} key={opt} />
              ))}
            </Picker>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="販売価格 (数字)"
            keyboardType="numeric"
            value={String(newForm.sale_price || '')}
            onChangeText={text => handleNewFormChange('sale_price', text)}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="買取価格 (数字)"
            keyboardType="numeric"
            value={String(newForm.buy_price || '')}
            onChangeText={text => handleNewFormChange('buy_price', text)}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="購入日 (例: 2025-01-01)"
            value={newForm.purchase_date}
            onChangeText={text => handleNewFormChange('purchase_date', text)}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="所持枚数 (数字)"
            keyboardType="numeric"
            value={String(newForm.quantity || '')}
            onChangeText={text => handleNewFormChange('quantity', text)}
          />

          <TextInput
            style={styles.modalInput}
            placeholder="メモ (任意)"
            value={newForm.memo}
            onChangeText={text => handleNewFormChange('memo', text)}
          />

          {/* 相場取得ボタン + ローディング表示 */}
          <View style={styles.row}>
            <Button title="相場を取得" onPress={handleFetchNewPrice} />
            {loadingNewPrice && <ActivityIndicator style={{ marginLeft: 8 }} />}
          </View>

          <View style={[styles.buttonRow, { marginTop: 20 }]}>
            <Button title="登録" onPress={handleAdd} />
            <Button
              title="キャンセル"
              onPress={() => setAddModalVisible(false)}
              color="#999"
            />
          </View>
        </ScrollView>
      </Modal>

      {/* ------------------------------------------------ */}
      {/* 詳細モーダル */}
      {/* ------------------------------------------------ */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {detailForm && (
          <ScrollView style={styles.modalContainer}>
            <Text style={styles.modalTitle}>詳細情報</Text>

            <Text style={styles.label}>商品ID</Text>
            <TextInput
              style={styles.modalInput}
              value={detailForm.product_id}
              onChangeText={v => handleDetailFormChange('product_id', v)}
            />

            <Text style={styles.label}>名称</Text>
            <TextInput
              style={styles.modalInput}
              value={detailForm.name}
              onChangeText={v => handleDetailFormChange('name', v)}
            />

            <Text style={styles.label}>カテゴリー</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={detailForm.category}
                onValueChange={v => handleDetailFormChange('category', v)}
              >
                {categoryOptions.map(opt => (
                  <Picker.Item label={opt} value={opt} key={opt} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>状態</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={detailForm.condition}
                onValueChange={v => handleDetailFormChange('condition', v)}
              >
                {conditionOptions.map(opt => (
                  <Picker.Item label={opt} value={opt} key={opt} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>販売価格</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.sale_price || '')}
              onChangeText={v => handleDetailFormChange('sale_price', v)}
            />

            <Text style={styles.label}>買取価格</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.buy_price || '')}
              onChangeText={v => handleDetailFormChange('buy_price', v)}
            />

            <Text style={styles.label}>購入日</Text>
            <TextInput
              style={styles.modalInput}
              value={detailForm.purchase_date}
              onChangeText={v => handleDetailFormChange('purchase_date', v)}
            />

            <Text style={styles.label}>所持枚数</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.quantity || '')}
              onChangeText={v => handleDetailFormChange('quantity', v)}
            />

            <Text style={styles.label}>メモ</Text>
            <TextInput
              style={styles.modalInput}
              value={detailForm.memo}
              onChangeText={v => handleDetailFormChange('memo', v)}
            />

            {/* 売却関連 */}
            <View style={styles.divider} />
            <Text style={styles.subTitle}>売却関連</Text>

            <Text style={styles.label}>売却日</Text>
            <TextInput
              style={styles.modalInput}
              value={detailForm.selling_date}
              onChangeText={v => handleDetailFormChange('selling_date', v)}
            />

            <Text style={styles.label}>仕入価格</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.cost_price || '')}
              onChangeText={v => handleDetailFormChange('cost_price', v)}
            />

            <Text style={styles.label}>売却価格</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.sold_price || '')}
              onChangeText={v => handleDetailFormChange('sold_price', v)}
            />

            <Text style={styles.label}>売却手数料</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.sold_commission || '')}
              onChangeText={v => handleDetailFormChange('sold_commission', v)}
            />

            <Text style={styles.label}>売買利益</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.trade_profit || '')}
              onChangeText={v => handleDetailFormChange('trade_profit', v)}
            />

            <Text style={styles.label}>査定済みフラグ (0 or 1)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={String(detailForm.estimated_flag || '')}
              onChangeText={v => handleDetailFormChange('estimated_flag', v)}
            />

            {/* 相場取得ボタン + ローディング表示 */}
            <View style={styles.row}>
              <Button title="相場を取得" onPress={handleFetchDetailPrice} />
              {loadingDetailPrice && <ActivityIndicator style={{ marginLeft: 8 }} />}
            </View>

            <View style={[styles.buttonRow, { marginTop: 20 }]}>
              <Button title="更新" onPress={handleUpdate} />
              <Button
                title="閉じる"
                onPress={() => setDetailModalVisible(false)}
                color="#999"
              />
            </View>
          </ScrollView>
        )}
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default MyAssetScreen;

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
  addButton: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
  },
  assetItem: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    elevation: 1,
  },
  highlightItem: {
    borderWidth: 2,
    borderColor: 'orange',
  },
  assetName: {
    fontSize: 16,
    fontWeight: '700',
  },
  assetText: {
    fontSize: 14,
    color: '#333',
    marginTop: 2,
  },
  buttonColumn: {
    justifyContent: 'space-around',
    marginLeft: 10,
  },
  detailButton: {
    backgroundColor: '#00AACC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    width: 60,
    alignItems: 'center',
  },
  detailButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#CC0033',
    padding: 8,
    borderRadius: 8,
    width: 60,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    alignSelf: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 10,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#CCC',
    marginVertical: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  // ActivityIndicator はデフォルトスタイルのまま
});
