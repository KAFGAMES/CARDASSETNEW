/**
 * App.tsx
 * タブ切り替えで「Dashboard」と「MyCard」を行き来できるようにする
 */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

// 先ほど作成した画面コンポーネントをインポート
import DashboardScreen from './Screens/DashboardScreen';
import MyCardScreen from './Screens/MyCardScreen';

const Tab = createBottomTabNavigator();

function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{title: 'ダッシュボード'}}
        />
        <Tab.Screen
          name="MyCard"
          component={MyCardScreen}
          options={{title: 'マイカード'}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default App;
