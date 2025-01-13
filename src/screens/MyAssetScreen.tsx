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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useIsFocused } from '@react-navigation/native'; // ← 追加
import {
  initDB,
  getAllAssets,
  insertAsset,
  updateAsset,
  deleteAsset,
} from '../database/Database';

type Asset = {
  id?: number;             // 内部ID（ユーザーには非表示）
  product_id: string;      // 商品ID
  name: string;            // 名称
  category: string;        // カテゴリー
  condition: string;       // 状態
  sale_price: number;      // 販売価格
  buy_price: number;       // 買取価格
  purchase_date: string;   // 購入日
  selling_date: string;    // 売却日 (詳細のみ)
  quantity: number;        // 所持枚数
  estimated_flag: number;  // 査定済みフラグ (詳細のみ)
  memo: string;            // メモ
  cost_price: number;      // 仕入価格(詳細のみ)
  sold_price: number;      // 売却価格(詳細のみ)
  sold_commission: number; // 売却手数料(詳細のみ)
  trade_profit: number;    // 売買利益(詳細のみ)
};

/** カテゴリ選択肢 */
const categoryOptions = ['カード', '家具', 'PC備品', '不動産', '金融商品'];
/** 状態選択肢 */
const conditionOptions = ['状態S', '状態A', '状態B', '状態C'];

const MyAssetScreen = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchText, setSearchText] = useState('');
  const isFocused = useIsFocused(); // タブ切り替え等で再描画時に呼ばれる

  // 新規登録用モーダル
  const [addModalVisible, setAddModalVisible] = useState(false);

  // 新規登録フォーム
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

  // 詳細表示用モーダル & そのフォーム
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailForm, setDetailForm] = useState<Asset | null>(null);

  /** 
   * 画面初期化：DB初期化（1回だけ） 
   */
  useEffect(() => {
    initDB();
  }, []);

  /**
   * タブがフォーカスされる度にデータ取得
   */
  useEffect(() => {
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);

  /**
   * DB から全アセット取得
   */
  const fetchData = async () => {
    try {
      const data = await getAllAssets();
      setAssets(data);
    } catch (error) {
      console.log(error);
    }
  };

  /**
   * 新規登録フォームの入力ハンドラ
   */
  const handleNewFormChange = (key: keyof Asset, value: string | number) => {
    const numericFields: (keyof Asset)[] = ['sale_price','buy_price','quantity'];
    setNewForm(prev => ({
      ...prev,
      [key]: numericFields.includes(key) ? Number(value) : value,
    }));
  };

  /**
   * 新規登録実行
   */
  const handleAdd = async () => {
    try {
      // 詳細項目は空のままでもOK
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
    }
  };

  /**
   * 詳細ボタン押下 → 詳細モーダルを表示 & フォーム設定
   */
  const openDetail = (asset: Asset) => {
    setDetailForm({ ...asset });
    setDetailModalVisible(true);
  };

  /**
   * 詳細フォームの入力ハンドラ（編集したい場合）
   */
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

  /**
   * 詳細更新
   */
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
    }
  };

  /**
   * 削除実行
   */
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

  // 価格の高い順にソート
  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => b.sale_price - a.sale_price);
  }, [assets]);

  // テキスト検索フィルター
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

  // 一番高い販売価格
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
                {/* 
                  ↓↓↓
                  売却日／売却価格／売却手数料／売買利益／査定フラグは
                  一覧には表示しない
                */}
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

      {/* -------- 新規登録モーダル -------- */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>新規資産を登録</Text>

          {/* 商品ID */}
          <TextInput
            style={styles.modalInput}
            placeholder="商品ID (例: CARD001)"
            value={newForm.product_id}
            onChangeText={text => handleNewFormChange('product_id', text)}
          />
          {/* 名称 */}
          <TextInput
            style={styles.modalInput}
            placeholder="名称 (例: レアカード)"
            value={newForm.name}
            onChangeText={text => handleNewFormChange('name', text)}
          />
          {/* カテゴリ */}
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
          {/* 状態 */}
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
          {/* 販売価格 */}
          <TextInput
            style={styles.modalInput}
            placeholder="販売価格 (数字)"
            keyboardType="numeric"
            value={String(newForm.sale_price || '')}
            onChangeText={text => handleNewFormChange('sale_price', text)}
          />
          {/* 買取価格 */}
          <TextInput
            style={styles.modalInput}
            placeholder="買取価格 (数字)"
            keyboardType="numeric"
            value={String(newForm.buy_price || '')}
            onChangeText={text => handleNewFormChange('buy_price', text)}
          />
          {/* 購入日 */}
          <TextInput
            style={styles.modalInput}
            placeholder="購入日 (例: 2025-01-01)"
            value={newForm.purchase_date}
            onChangeText={text => handleNewFormChange('purchase_date', text)}
          />
          {/* 所持枚数 */}
          <TextInput
            style={styles.modalInput}
            placeholder="所持枚数 (数字)"
            keyboardType="numeric"
            value={String(newForm.quantity || '')}
            onChangeText={text => handleNewFormChange('quantity', text)}
          />
          {/* メモ */}
          <TextInput
            style={styles.modalInput}
            placeholder="メモ (任意)"
            value={newForm.memo}
            onChangeText={text => handleNewFormChange('memo', text)}
          />

          <View style={styles.buttonRow}>
            <Button title="登録" onPress={handleAdd} />
            <Button
              title="キャンセル"
              onPress={() => setAddModalVisible(false)}
              color="#999"
            />
          </View>
        </ScrollView>
      </Modal>

      {/* -------- 詳細モーダル -------- */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        {detailForm && (
          <ScrollView style={styles.modalContainer}>
            <Text style={styles.modalTitle}>詳細情報</Text>

            {/* 例として、詳細内でも編集可能にしています（不要なら editable={false} などに） */}
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

            {/* ここから先は一覧に表示しなかった詳細項目 */}
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

            <View style={styles.buttonRow}>
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
});
