/**
 * Tests básicos para el sistema de estado y dados customizables
 * Ejecutar en la consola del navegador después de cargar la página
 */

// Test 1: Estado inicial
console.log('=== Test 1: Estado Inicial ===');
import('./js/modules/gameState.js').then(({ gameState }) => {
  const state = gameState.getState();
  console.log('Estado inicial:', state);
  console.assert(Array.isArray(state.gameSet), 'gameSet debe ser un array');
  console.assert(Array.isArray(state.lastResult), 'lastResult debe ser un array');
  console.assert(typeof state.sum === 'number', 'sum debe ser un número');
  console.log('✅ Test 1 pasado');
});

// Test 2: Conversión de notación
console.log('\n=== Test 2: Conversión de Notación ===');
import('./js/modules/notationUtils.js').then(({ notationToGameSet, gameSetToNotation }) => {
  const notation = "4d6 + 2d8";
  const gameSet = notationToGameSet(notation);
  const backToNotation = gameSetToNotation(gameSet);
  
  console.log('Original:', notation);
  console.log('GameSet:', gameSet);
  console.log('De vuelta:', backToNotation);
  
  console.assert(gameSet.length === 2, 'Debe haber 2 tipos de dados');
  console.assert(gameSet[0].quantity === 4, 'Debe haber 4 d6');
  console.assert(gameSet[1].quantity === 2, 'Debe haber 2 d8');
  console.log('✅ Test 2 pasado');
});

// Test 3: Cálculo de suma
console.log('\n=== Test 3: Cálculo de Suma ===');
import('./js/modules/gameState.js').then(({ gameState }) => {
  gameState.setLastResult(["5", "10", "3", "7"]);
  const sum = gameState.getState('sum');
  
  console.log('Resultados:', ["5", "10", "3", "7"]);
  console.log('Suma calculada:', sum);
  console.assert(sum === 25, `Suma debe ser 25, pero es ${sum}`);
  console.log('✅ Test 3 pasado');
});

// Test 4: Suma con valores no numéricos
console.log('\n=== Test 4: Suma con Valores No Numéricos ===');
import('./js/modules/gameState.js').then(({ gameState }) => {
  gameState.setLastResult(["5", "+", "10", "X", "3"]);
  const sum = gameState.getState('sum');
  
  console.log('Resultados:', ["5", "+", "10", "X", "3"]);
  console.log('Suma calculada:', sum);
  console.assert(sum === 18, `Suma debe ser 18 (5+10+3), pero es ${sum}`);
  console.log('✅ Test 4 pasado');
});

// Test 5: Dados Fudge
console.log('\n=== Test 5: Dados Fudge ===');
import('./js/modules/customDice.js').then(({ createFudgeDice, calculateFudgeSum }) => {
  const fudgeDice = createFudgeDice(4);
  
  console.log('Dados Fudge creados:', fudgeDice);
  console.assert(fudgeDice.quantity === 4, 'Debe haber 4 dados');
  console.assert(fudgeDice.sides.length === 6, 'Debe tener 6 caras');
  
  const testResult = ["+", "+", "0", "-"];
  const fudgeSum = calculateFudgeSum(testResult);
  console.log('Resultado de prueba:', testResult);
  console.log('Suma Fudge:', fudgeSum);
  console.assert(fudgeSum === 1, `Suma Fudge debe ser 1, pero es ${fudgeSum}`);
  console.log('✅ Test 5 pasado');
});

// Test 6: Dados customizados
console.log('\n=== Test 6: Dados Customizados ===');
import('./js/modules/customDice.js').then(({ createCustomDice }) => {
  const symbolDice = createCustomDice(1, ["⚔️", "🛡️", "🏹", "🔮", "💀", "⭐"]);
  
  console.log('Dado de símbolos:', symbolDice);
  console.assert(symbolDice.quantity === 1, 'Debe haber 1 dado');
  console.assert(symbolDice.sides.length === 6, 'Debe tener 6 caras');
  console.assert(symbolDice.sides[0] === "⚔️", 'Primera cara debe ser ⚔️');
  console.log('✅ Test 6 pasado');
});

// Test 7: Dados con rango
console.log('\n=== Test 7: Dados con Rango ===');
import('./js/modules/customDice.js').then(({ createRangeDice }) => {
  const rangeDice = createRangeDice(2, 0, 9);
  
  console.log('Dados de rango 0-9:', rangeDice);
  console.assert(rangeDice.quantity === 2, 'Debe haber 2 dados');
  console.assert(rangeDice.sides.length === 10, 'Debe tener 10 caras (0-9)');
  console.assert(rangeDice.sides[0] === "0", 'Primera cara debe ser "0"');
  console.assert(rangeDice.sides[9] === "9", 'Última cara debe ser "9"');
  console.log('✅ Test 7 pasado');
});

// Test 8: Dados ponderados
console.log('\n=== Test 8: Dados Ponderados ===');
import('./js/modules/customDice.js').then(({ createWeightedDice }) => {
  const weightedDice = createWeightedDice(1, { "6": 3, "1": 1 });
  
  console.log('Dado ponderado:', weightedDice);
  console.assert(weightedDice.sides.length === 4, 'Debe tener 4 caras totales');
  
  const sixCount = weightedDice.sides.filter(s => s === "6").length;
  const oneCount = weightedDice.sides.filter(s => s === "1").length;
  console.assert(sixCount === 3, 'Debe tener 3 caras con "6"');
  console.assert(oneCount === 1, 'Debe tener 1 cara con "1"');
  console.log('✅ Test 8 pasado');
});

// Test 9: Suscripciones
console.log('\n=== Test 9: Suscripciones ===');
import('./js/modules/gameState.js').then(({ gameState }) => {
  let called = false;
  const unsubscribe = gameState.subscribe('sum', (sum) => {
    called = true;
    console.log('Callback ejecutado con sum:', sum);
  });
  
  gameState.setLastResult(["10", "20"]);
  console.assert(called === true, 'Callback debería haberse ejecutado');
  
  called = false;
  unsubscribe();
  gameState.setLastResult(["5", "5"]);
  console.assert(called === false, 'Callback no debería ejecutarse después de unsubscribe');
  console.log('✅ Test 9 pasado');
});

// Test 10: Presets
console.log('\n=== Test 10: Presets ===');
import('./js/modules/customDice.js').then(({ CUSTOM_DICE_PRESETS, getCustomDicePreset }) => {
  console.log('Presets disponibles:', Object.keys(CUSTOM_DICE_PRESETS));
  
  const fudge = getCustomDicePreset('fudge');
  console.assert(fudge.sides.includes('+'), 'Preset fudge debe incluir "+"');
  
  const coin = getCustomDicePreset('coin');
  console.assert(coin.sides.includes('Heads'), 'Preset coin debe incluir "Heads"');
  
  console.log('✅ Test 10 pasado');
});

console.log('\n🎉 Todos los tests completados!');
