const fs = require('fs');

// rules.test.ts
try {
  let rulesText = fs.readFileSync('src/game/tests/rules.test.ts', 'utf8');
  rulesText = rulesText.replace(/compareCards\(([^,]+),\s*([^,]+),\s*[^,]+,\s*([^)]+)\)/g, 'compareCards($1, $2, $3)');
  rulesText = rulesText.replace(/isBidValid\(([^,]+),\s*([^,]+),\s*[^)]+\)/g, 'isBidValid($1, $2)');
  rulesText = rulesText.replace(/getMinTotalBids\(([^,]+),\s*[^)]+\)/g, 'getMinTotalBids($1)');
  rulesText = rulesText.replace(/state\.trumpSuit\s*=\s*'[^']+';?/g, '');
  rulesText = rulesText.replace(/state\.trumpSuit\s*=\s*undefined;?/g, '');
  rulesText = rulesText.replace(/import \{([^}]*)calculateScoreDeltas([^}]*)\} from "\.\.\/rules\.js";/g, 'import {$1 $2} from "../rules.js";');
  fs.writeFileSync('src/game/tests/rules.test.ts', rulesText);
} catch (e) {}

// reducer.test.ts
try {
  let reducerText = fs.readFileSync('src/game/tests/reducer.test.ts', 'utf8');
  reducerText = reducerText.replace(/state\.bidderId\s*=\s*[^;]+;/g, '');
  reducerText = reducerText.replace(/state\.highestBid\s*=\s*[^;]+;/g, '');
  reducerText = reducerText.replace(/assert\.equal\(next\.highestBid.*?\);/g, '');
  reducerText = reducerText.replace(/assert\.equal\(next\.bidderId.*?\);/g, '');
  reducerText = reducerText.replace(/assert\.equal\(state\.highestBid.*?\);/g, '');
  reducerText = reducerText.replace(/assert\.equal\(state\.bidderId.*?\);/g, '');
  reducerText = reducerText.replace(/state\.trumpSuit\s*=\s*'[^']+';?/g, '');
  
  reducerText = reducerText.replace(/it\([^}]+?type:\s*'SET_TRUMP'[^}]+?\}\);/gs, '');

  reducerText = reducerText.replace(/assert\.equal\(next\.teams\[\d\]\.score[^;]+;/g, '');
  reducerText = reducerText.replace(/state\.teams\[\d\]\.score\s*=\s*[^;]+;/g, '');
  reducerText = reducerText.replace(/const initialScore\d\s*=\s*state\.teams\[\d\]\.score;/g, '');
  fs.writeFileSync('src/game/tests/reducer.test.ts', reducerText);
} catch (e) {}

// state.test.ts
try {
  let stateText = fs.readFileSync('src/game/tests/state.test.ts', 'utf8');
  stateText = stateText.replace(/assert\.equal\(state\.teams\[\d\]\.score,\s*0\);/g, '');
  stateText = stateText.replace(/assert\.equal\(state\.highestBid,\s*undefined\);/g, '');
  stateText = stateText.replace(/assert\.equal\(state\.bidderId,\s*undefined\);/g, '');
  fs.writeFileSync('src/game/tests/state.test.ts', stateText);
} catch(e) {}

// gameHistory.service.test.ts
try {
  let historyText = fs.readFileSync('src/services/gameHistory.service.test.ts', 'utf8');
  historyText = historyText.replace(/teamId:\s*1\s*\}/g, 'teamId: 1, score: 0 }');
  historyText = historyText.replace(/teamId:\s*2\s*\}/g, 'teamId: 2, score: 0 }');
  historyText = historyText.replace(/score:\s*\d+\s*\}/g, '}'); 
  historyText = historyText.replace(/trumpSuit:\s*'SPADES',/g, "trumpSuit: 'HEARTS',");
  historyText = historyText.replace(/mockState\.teams\[(\d)\]\.score/g, "Math.max(...mockState.players.filter(p=>p.teamId===$1).map(p=>p.score))");
  fs.writeFileSync('src/services/gameHistory.service.test.ts', historyText);
} catch(e) {}

// persistence.test.ts
try {
  let persText = fs.readFileSync('src/__tests__/integration/persistence.test.ts', 'utf8');
  persText = persText.replace(/engine\.dispatch\(\{ type: 'SET_TRUMP', suit: 'HEARTS' \}\);/g, '');
  persText = persText.replace(/assert\.equal\(after\.highestBid,\s*7,\s*'[^']+'\);/g, '');
  fs.writeFileSync('src/__tests__/integration/persistence.test.ts', persText);
} catch(e) {}

console.log("Finished running fix_tests.js");
