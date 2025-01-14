import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { insertMemo } from '../database/Database';

type RootStackParamList = {
  MemoEdit: { date: string; memo: string };
};

type MemoEditScreenRouteProp = RouteProp<RootStackParamList, 'MemoEdit'>;

const MemoEditScreen = () => {
  const route = useRoute<MemoEditScreenRouteProp>();
  const navigation = useNavigation();
  const { date, memo } = route.params;
  const [memoText, setMemoText] = useState<string>(memo);

  useEffect(() => {
    setMemoText(memo);
  }, [memo]);

  const saveAndGoBack = async () => {
    try {
      await insertMemo(date, memoText);
      Alert.alert('保存完了', 'メモが保存されました', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('エラー', 'メモの保存に失敗しました');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>メモ編集 ({date}):</Text>
      <TextInput
        style={styles.memoInput}
        multiline
        value={memoText}
        onChangeText={setMemoText}
      />
      <Button title="戻る" onPress={saveAndGoBack} />
    </View>
  );
};

export default MemoEditScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F7F7F7',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 8,
    borderRadius: 8,
    height: 200,
    textAlignVertical: 'top',
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
});
