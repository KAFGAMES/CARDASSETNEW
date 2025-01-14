////////////////////////////////////////////////////////////////////////////////
// src/screens/AssetNavigator.tsx
////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import MyAssetScreen from './MyAssetScreen';
import FinancialAssetScreen from './FinancialAssetScreen';

const TopTab = createMaterialTopTabNavigator();

const AssetNavigator = () => {
  return (
    <TopTab.Navigator>
      <TopTab.Screen
        name="RealAsset"
        component={MyAssetScreen}
        options={{ tabBarLabel: '実物資産' }}
      />
      <TopTab.Screen
        name="FinancialAsset"
        component={FinancialAssetScreen}
        options={{ tabBarLabel: '金融資産' }}
      />
    </TopTab.Navigator>
  );
};

export default AssetNavigator;
