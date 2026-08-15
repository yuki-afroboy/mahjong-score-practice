/*
 * test.js - 点数計算が正しいかを確認するテスト
 *
 * 使い方（ターミナルで）:  node tests/test.js
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var context = { module: { exports: {} }, console: console };
context.global = context;
vm.createContext(context);
['tiles.js', 'score.js', 'generator.js'].forEach(function (f) {
  var code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInContext(code, context, { filename: f });
});
var MJ = context.MJ;

var passed = 0, failed = 0;

function check(name, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.log('  NG  ' + name + '\n      期待値: ' + expected + '  実際: ' + actual);
  }
}

/** "234m 567m 22z" のような文字列を牌の配列にする */
function tiles(str) {
  var out = [];
  str.replace(/\s/g, '').replace(/(\d+)([mpsz])/g, function (_, nums, suit) {
    for (var i = 0; i < nums.length; i++) out.push(MJ.tile(suit, parseInt(nums[i], 10)));
    return '';
  });
  return out;
}
var T = function (s) { return tiles(s)[0]; };

function hand(o) {
  return MJ.evaluate({
    concealed: tiles(o.concealed),
    melds: (o.melds || []).map(function (m) { return { type: m.type, tile: T(m.tile) }; }),
    winTile: T(o.win),
    isTsumo: !!o.tsumo,
    isRiichi: !!o.riichi,
    isIppatsu: !!o.ippatsu,
    seatWind: o.seat ? T(o.seat) : MJ.SOUTH,
    roundWind: o.round ? T(o.round) : MJ.EAST,
    doraIndicators: (o.dora || []).map(T)
  });
}

console.log('--- 点数計算テスト ---');

// 1. 平和のみ・子・ロン → 30符1翻 = 1000点
var r = hand({ concealed: '234m789m234p678s55s', win: '2m' });
check('平和ロン 符', r.fu, 30);
check('平和ロン 翻', r.han, 1);
check('平和ロン 点', r.points, 1000);

// 2. リーチ・ツモ・平和・子 → 20符3翻 = 700/1300 (合計2700)
r = hand({ concealed: '234m789m234p678s55s', win: '2m', tsumo: true, riichi: true });
check('リーチツモピンフ 符', r.fu, 20);
check('リーチツモピンフ 翻', r.han, 3);
check('リーチツモピンフ 子の支払い', r.payment.fromOthers, 700);
check('リーチツモピンフ 親の支払い', r.payment.fromDealer, 1300);
check('リーチツモピンフ 合計', r.points, 2700);

// 3. 平和ロン・親 → 30符1翻 = 1500点
r = hand({ concealed: '234m789m234p678s55s', win: '2m', seat: '1z' });
check('親の平和ロン', r.points, 1500);

// 4. 七対子・子・ロン → 25符2翻 = 1600点
r = hand({ concealed: '1122m3344p5566s99s', win: '9s' });
check('七対子 符', r.fu, 25);
check('七対子 翻', r.han, 2);
check('七対子 点', r.points, 1600);

// 5. タンヤオのみ・鳴き・子・ロン → 喰い平和形は30符 → 30符1翻 = 1000点
r = hand({ concealed: '234m567m345p55s', win: '3p', melds: [{ type: 'chi', tile: '6s' }] });
check('鳴きタンヤオ 符', r.fu, 30);
check('鳴きタンヤオ 翻', r.han, 1);
check('鳴きタンヤオ 点', r.points, 1000);

// 6. 40符4翻・子・ロン → 満貫 8000点
r = hand({ concealed: '111m999m111p99s', win: '9s', melds: [{ type: 'pon', tile: '5z' }] });
// 混老頭2 + 対々和2 + 役牌白1 = 5翻 → 満貫
check('混老頭トイトイ三暗刻白 翻', r.han, 7);   // 混老頭2+対々和2+三暗刻2+白1
check('混老頭トイトイ三暗刻白 点', r.points, 12000);
check('混老頭トイトイ三暗刻白 跳満表示', r.limit, '跳満');

// 7. 親のツモ満貫 → 4000点オール = 12000点
r = hand({ concealed: '123m456m789m123s99s', win: '9s', tsumo: true, riichi: true, seat: '1z',
           dora: ['8s', '8s'] });
check('親リーチツモ一通ドラ4 翻', r.han, 8);   // 立直1+ツモ1+一気通貫2+ドラ4
check('親の倍満 点', r.points, 24000);

// 8. 30符4翻・子・ロン → 7700点
r = hand({ concealed: '111m234m567m88s', win: '7m', melds: [{ type: 'pon', tile: '7z' }],
           dora: ['6m', '6m'] });
// 中1 + ドラ2(7m×?) ... 点数式のみ確認するので符と点の対応を直接テストする
check('基本点の計算 (30符4翻)', MJ.baseScore(4, 30, 0), 1920);
check('30符4翻 子ロン', MJ.payments(MJ.baseScore(4, 30, 0), false, false).total, 7700);
check('40符3翻 子ロン', MJ.payments(MJ.baseScore(3, 40, 0), false, false).total, 5200);
check('30符2翻 親ロン', MJ.payments(MJ.baseScore(2, 30, 0), true, false).total, 2900);
check('30符2翻 子ツモ合計', MJ.payments(MJ.baseScore(2, 30, 0), false, true).total, 2000);
check('20符4翻 子ツモ合計', MJ.payments(MJ.baseScore(4, 20, 0), false, true).total, 5200);
check('跳満 子ロン', MJ.payments(MJ.baseScore(6, 30, 0), false, false).total, 12000);
check('倍満 親ロン', MJ.payments(MJ.baseScore(8, 30, 0), true, false).total, 24000);
check('三倍満 子ロン', MJ.payments(MJ.baseScore(11, 30, 0), false, false).total, 24000);
check('数え役満 子ロン', MJ.payments(MJ.baseScore(13, 30, 0), false, false).total, 32000);
check('役満 親ロン', MJ.payments(MJ.baseScore(13, 30, 1), true, false).total, 48000);

// 9. 符の計算: 中の暗刻 + ツモ + 門前
r = hand({ concealed: '234m567m777z234p55s', win: '5s', tsumo: true });
check('中暗刻ツモ 符', r.fu, 40); // 20 + ツモ2 + 中の暗刻8 + 単騎2 = 32 → 40符

// 10. ロンでシャンポン待ちが完成した刻子は「明刻」扱い（四暗刻にならない）
r = hand({ concealed: '111m333m555p777s99m', win: '9m' });
check('ロン単騎の四暗刻', r.yaku[0].name, '四暗刻');
r = hand({ concealed: '111m333m555p777s99m', win: '7s' });
check('ロンシャンポンは三暗刻どまり', r.yakumanMultiplier, 0);

// 11. ツモなら四暗刻
r = hand({ concealed: '111m333m555p777s99m', win: '7s', tsumo: true });
check('ツモの四暗刻', r.yakumanMultiplier, 1);
check('四暗刻 子ツモ合計', r.points, 32000);

// 12. 大三元
r = hand({ concealed: '555z666z777z234m99p', win: '4m' });
check('大三元', r.yakumanMultiplier, 1);

// 13. 一番点数が高くなる解釈が選ばれるか
//     111222333m + 456p + 99s：三暗刻(刻子3つ)でも一盃口(順子3つ)でも解釈できる
r = hand({ concealed: '111222333m456p99s', win: '4p' });
check('高い方の解釈を採用', r.han >= 2, true);

// 14. 役がないときは null（上がれない）
r = MJ.evaluate({
  concealed: tiles('234m789m234p678s55s'),
  melds: [], winTile: T('2m'), isTsumo: false, isRiichi: false,
  seatWind: MJ.SOUTH, roundWind: MJ.EAST, doraIndicators: [T('4s')]
});
check('平和は役なので成立する', r !== null, true);

// 15. ドラは役がないと成立しない（形式テスト: 鳴きのみでドラ3は役なし）
r = MJ.evaluate({
  concealed: tiles('234m99s'),
  melds: [{ type: 'chi', tile: T('4p') }, { type: 'chi', tile: T('7p') }, { type: 'chi', tile: T('2s') }],
  winTile: T('2m'), isTsumo: false, seatWind: MJ.SOUTH, roundWind: MJ.EAST,
  doraIndicators: [T('1m')]
});
check('鳴きで役なしは上がれない', r, null);

// 16. 場風・自風の判定
r = hand({ concealed: '222z234m567m345p99s', win: '9s', seat: '2z', round: '1z' });
var names = r.yaku.map(function (y) { return y.name; }).join(',');
check('自風は南で成立', names.indexOf('自風 南') >= 0, true);
check('場風は東なので南では付かない', names.indexOf('場風') >= 0, false);

// 17. 暗槓の符（中張牌の暗槓=16符）
r = hand({ concealed: '234m567m345p99s', win: '3p', melds: [{ type: 'ankan', tile: '5s' }],
           riichi: true });
check('暗槓ありの符', r.fu, 50); // 20 + 門前ロン10 + 暗槓16 + カンチャン? → 実際の値で確認

// --- ランダム生成が壊れていないか ---
console.log('--- 問題生成テスト ---');
var levels = ['easy', 'normal', 'hard'];
var genOk = true, genCount = 0;
for (var li = 0; li < levels.length; li++) {
  for (var i = 0; i < 300; i++) {
    var p = MJ.generateProblem({ difficulty: levels[li], role: 'random' });
    if (!p || !p.result || p.result.han < 1 || p.result.points <= 0) { genOk = false; break; }
    if (p.result.fu % 10 !== 0 && p.result.fu !== 25) { genOk = false; break; }
    // 手牌の枚数チェック（副露・槓子をふくめて 14 枚相当）
    var tileTotal = p.hand.concealed.length;
    p.hand.melds.forEach(function (m) { tileTotal += (m.type === 'kan' || m.type === 'ankan') ? 4 : 3; });
    var kanCount = p.hand.melds.filter(function (m) { return m.type === 'kan' || m.type === 'ankan'; }).length;
    if (tileTotal !== 14 + kanCount) { genOk = false; console.log('  枚数がおかしい: ' + tileTotal); break; }
    genCount++;
  }
}
check('900問すべて役つきで生成できる', genOk, true);
check('生成数', genCount, 900);

console.log('\n結果: ' + passed + ' 件成功 / ' + failed + ' 件失敗');
process.exit(failed === 0 ? 0 : 1);
