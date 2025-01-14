////////////////////////////////////////////////////////////////////////////////
// App.tsx
////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 各画面をインポート
import DashboardScreen from './src/screens/DashboardScreen';
import MemoEditScreen from './src/screens/MemoEditScreen';
import AssetNavigator from './src/screens/AssetNavigator';

const Tab = createBottomTabNavigator();
const NativeStack = createNativeStackNavigator();

const DashboardStackScreen = () => (
  <NativeStack.Navigator>
    <NativeStack.Screen 
      name="DashboardMain" 
      component={DashboardScreen} 
      options={{ headerShown: false }} 
    />
    <NativeStack.Screen 
      name="MemoEdit" 
      component={MemoEditScreen} 
      options={{ title: 'メモ編集' }} 
    />
  </NativeStack.Navigator>
);

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,  // タブナビゲーターの上部ヘッダーを非表示
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardStackScreen}
          options={{ title: 'ダッシュボード' }}
        />
        <Tab.Screen
          name="Asset"
          component={AssetNavigator}
          options={{ title: '資産' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
