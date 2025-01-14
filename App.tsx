////////////////////////////////////////////////////////////////////////////////
// App.tsx
////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 各画面をインポート
import DashboardScreen from './src/screens/DashboardScreen';
import AssetNavigator from './src/screens/AssetNavigator';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,  // これで上部ヘッダーを非表示にします
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
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
