////////////////////////////////////////////////////////////////////////////////
// App.tsx
////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// 各画面をインポート
import DashboardScreen from './src/screens/DashboardScreen';
import MyAssetScreen from './src/screens/MyAssetScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'ダッシュボード' }}
        />
        <Tab.Screen
          name="MyAsset"
          component={MyAssetScreen}
          options={{ title: 'マイ資産' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
