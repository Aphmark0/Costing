// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DataProvider } from './src/context/DataContext';
import RecipesScreen from './src/screens/RecipesScreen';
import RecipeFormScreen from './src/screens/RecipeFormScreen';
import IngredientsScreen from './src/screens/IngredientsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <DataProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Recipes">
          <Stack.Screen name="Recipes" component={RecipesScreen} options={{ title: 'Mis Recetas' }} />
          <Stack.Screen name="RecipeForm" component={RecipeFormScreen} options={{ title: 'Receta' }} />
          <Stack.Screen name="Ingredients" component={IngredientsScreen} options={{ title: 'Ingredientes' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </DataProvider>
  );
}
