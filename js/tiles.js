/*
 * tiles.js - 牌（パイ）のあつかい方をまとめたファイル
 *
 * 牌は 0〜33 の数字（インデックス）で表します。
 *   0〜8   : 萬子(マンズ) の 1〜9
 *   9〜17  : 筒子(ピンズ) の 1〜9
 *   18〜26 : 索子(ソウズ) の 1〜9
 *   27〜33 : 字牌(ジハイ) 東・南・西・北・白・發・中
 *
 * 数字で持っておくと「3つ並んでいるか？」などの計算がとても簡単になります。
 */
var MJ = (typeof MJ !== 'undefined') ? MJ : {};

(function (ns) {
  'use strict';

  ns.TILE_KINDS = 34;          // 牌の種類は全部で34種類
  ns.EAST = 27;
  ns.SOUTH = 28;
  ns.WEST = 29;
  ns.NORTH = 30;
  ns.HAKU = 31;                // 白
  ns.HATSU = 32;               // 發
  ns.CHUN = 33;                // 中

  var HONOR_LABELS = ['東', '南', '西', '北', '白', '發', '中'];
  var SUIT_LABELS = { m: '萬', p: '筒', s: '索' };

  /** 'm'/'p'/'s' と 1〜9、または 'z' と 1〜7 から牌インデックスを作る */
  function tile(suit, num) {
    if (suit === 'm') return num - 1;
    if (suit === 'p') return 9 + num - 1;
    if (suit === 's') return 18 + num - 1;
    return 27 + num - 1; // 'z' = 字牌
  }

  /** "1m" "5p" "東" のような文字列 → インデックス（テスト用） */
  function parse(str) {
    var honorPos = HONOR_LABELS.indexOf(str);
    if (honorPos >= 0) return 27 + honorPos;
    var num = parseInt(str[0], 10);
    return tile(str[1], num);
  }

  function isHonor(t) { return t >= 27; }
  function isWind(t) { return t >= 27 && t <= 30; }
  function isDragon(t) { return t >= 31; }
  /** 0=萬子 1=筒子 2=索子 3=字牌 */
  function suitOf(t) { return isHonor(t) ? 3 : Math.floor(t / 9); }
  /** 数牌なら1〜9、字牌なら1〜7 */
  function numberOf(t) { return isHonor(t) ? t - 26 : (t % 9) + 1; }
  /** 1と9（老頭牌） */
  function isTerminal(t) { return !isHonor(t) && (numberOf(t) === 1 || numberOf(t) === 9); }
  /** 1・9・字牌（幺九牌 ヤオチュウハイ） */
  function isYaochu(t) { return isHonor(t) || isTerminal(t); }
  /** 2〜8（中張牌 チュンチャンパイ） */
  function isSimple(t) { return !isYaochu(t); }

  /** 画面表示用のラベル。{ main: '3', sub: '萬', suit: 'm' } の形 */
  function label(t) {
    if (isHonor(t)) {
      return { main: HONOR_LABELS[t - 27], sub: '', suit: 'z' };
    }
    var suit = ['m', 'p', 's'][suitOf(t)];
    return { main: String(numberOf(t)), sub: SUIT_LABELS[suit], suit: suit };
  }

  /** "3m" のような短い文字列（デバッグ・テスト用） */
  function name(t) {
    if (isHonor(t)) return HONOR_LABELS[t - 27];
    return numberOf(t) + ['m', 'p', 's'][suitOf(t)];
  }

  /** 「3萬」「5筒」「東」のような読み上げ用の名前（画面の読み上げ機能で使う） */
  function readableName(t) {
    if (isHonor(t)) return HONOR_LABELS[t - 27];
    return numberOf(t) + ['萬子', '筒子', '索子'][suitOf(t)];
  }

  /** ドラ表示牌 → 実際のドラ（次の牌） */
  function doraFromIndicator(t) {
    if (isWind(t)) return 27 + ((t - 27 + 1) % 4);      // 東→南→西→北→東
    if (isDragon(t)) return 31 + ((t - 31 + 1) % 3);    // 白→發→中→白
    var n = numberOf(t);
    return t - (n - 1) + (n % 9);                       // 9→1 に戻る
  }

  /** 牌の配列 → 34種類ぶんの枚数の配列 */
  function toCounts(tiles) {
    var c = new Array(34);
    for (var i = 0; i < 34; i++) c[i] = 0;
    for (var j = 0; j < tiles.length; j++) c[tiles[j]]++;
    return c;
  }

  ns.tile = tile;
  ns.parse = parse;
  ns.isHonor = isHonor;
  ns.isWind = isWind;
  ns.isDragon = isDragon;
  ns.suitOf = suitOf;
  ns.numberOf = numberOf;
  ns.isTerminal = isTerminal;
  ns.isYaochu = isYaochu;
  ns.isSimple = isSimple;
  ns.label = label;
  ns.name = name;
  ns.readableName = readableName;
  ns.doraFromIndicator = doraFromIndicator;
  ns.toCounts = toCounts;
  ns.HONOR_LABELS = HONOR_LABELS;
})(MJ);

if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
