import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '../screens/LoginScreen';
import {TapScreen} from '../screens/TapScreen';
import {RunningScreen} from '../screens/RunningScreen';
import {useRunStore} from '../stores/runStore';

export type RootStackParamList = {
  Login: undefined;
  Tap: undefined;
  Running: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const accessToken = useRunStore(s => s.accessToken);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: '#0a0a0a'},
        }}
        initialRouteName={accessToken ? 'Tap' : 'Login'}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Tap" component={TapScreen} />
        <Stack.Screen name="Running" component={RunningScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
