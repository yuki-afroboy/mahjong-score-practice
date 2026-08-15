/*
 * generator.js - 練習問題（ランダムな上がり手）を作るファイル
 *
 * 「4つの面子 + 1つの雀頭」をランダムに組み立てて、
 * 役があるかどうかを score.js で確かめ、役があれば問題として採用します。
 */
var MJ = (typeof MJ !== 'undefined') ? MJ : {};

(function (ns) {
  'use strict';

  function randInt(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[randInt(arr.length)]; }
  function chance(p) { return Math.random() < p; }

  var DIFFICULTY = {
    easy:   { runRate: 0.75, openRate: 0.0,  kanRate: 0.0,  doraIndicators: 0, honitsuRate: 0.0,  toitoiRate: 0.05, maxHan: 5 },
    normal: { runRate: 0.65, openRate: 0.35, kanRate: 0.05, doraIndicators: 1, honitsuRate: 0.10, toitoiRate: 0.10, maxHan: 8 },
    hard:   { runRate: 0.55, openRate: 0.5,  kanRate: 0.2,  doraIndicators: 1, honitsuRate: 0.18, toitoiRate: 0.15, maxHan: 99 }
  };

  /** 面子1つをランダムに作る。作れなければ null */
  function makeSet(counts, opt) {
    for (var attempt = 0; attempt < 60; attempt++) {
      var wantKan = chance(opt.kanRate);
      var wantRun = !opt.toitoi && !wantKan && chance(opt.runRate);

      if (wantRun) {
        var suit = pick(opt.suits.filter(function (s) { return s < 3; }));
        if (suit === undefined) continue;
        var start = suit * 9 + randInt(7);
        if (counts[start] < 4 && counts[start + 1] < 4 && counts[start + 2] < 4) {
          counts[start]++; counts[start + 1]++; counts[start + 2]++;
          return { type: 'run', tile: start };
        }
      } else {
        var t = randomTile(opt);
        var need = wantKan ? 4 : 3;
        if (counts[t] + need <= 4) {
          counts[t] += need;
          return { type: wantKan ? 'kan' : 'triplet', tile: t };
        }
      }
    }
    return null;
  }

  function randomTile(opt) {
    var suit = pick(opt.suits);
    if (suit === 3) return 27 + randInt(7);
    return suit * 9 + randInt(9);
  }

  function buildHand(opt) {
    var counts = new Array(34);
    for (var i = 0; i < 34; i++) counts[i] = 0;
    var sets = [];

    // 鳴いた手は役がないと上がれないので、役牌の刻子を優先的に入れておく
    if (opt.forceYakuhai) {
      var yakuhai = pick([ns.HAKU, ns.HATSU, ns.CHUN, opt.seatWind, opt.roundWind]);
      counts[yakuhai] += 3;
      sets.push({ type: 'triplet', tile: yakuhai });
    }

    while (sets.length < 4) {
      var s = makeSet(counts, opt);
      if (!s) return null;
      sets.push(s);
    }

    // 雀頭（同じ牌2枚）
    var pair = null;
    for (var a = 0; a < 60 && pair === null; a++) {
      var t = randomTile(opt);
      if (counts[t] + 2 <= 4) { counts[t] += 2; pair = t; }
    }
    if (pair === null) return null;

    // どの面子を鳴くか決める（順子はチー、刻子はポン、槓子はカン）
    var openCount = 0;
    if (opt.open) openCount = chance(0.35) ? 2 : 1;
    var order = sets.map(function (_, idx) { return idx; });
    for (var k = order.length - 1; k > 0; k--) {
      var j = randInt(k + 1); var tmp = order[k]; order[k] = order[j]; order[j] = tmp;
    }
    var openIdx = order.slice(0, openCount);

    var melds = [], concealedSets = [];
    for (i = 0; i < sets.length; i++) {
      var set = sets[i];
      var isOpen = openIdx.indexOf(i) >= 0;
      if (set.type === 'kan') {
        // 槓子はかならず「面子」として確定させる（暗槓 or 明槓）
        melds.push({ type: isOpen ? 'kan' : 'ankan', tile: set.tile });
      } else if (isOpen) {
        melds.push({ type: set.type === 'run' ? 'chi' : 'pon', tile: set.tile });
      } else {
        concealedSets.push(set);
      }
    }
    if (concealedSets.length === 0) return null; // 上がり牌を置く場所が必要

    // 上がり牌を決める（門前の面子か雀頭のどれかを、上がり牌で完成させたことにする）
    var winGroupIndex = randInt(concealedSets.length + 1) - 1; // -1 は雀頭（単騎待ち）
    var winTile;
    if (winGroupIndex === -1) {
      winTile = pair;
    } else {
      var wg = concealedSets[winGroupIndex];
      winTile = wg.type === 'run' ? wg.tile + randInt(3) : wg.tile;
    }

    var concealed = [];
    for (i = 0; i < concealedSets.length; i++) {
      concealed = concealed.concat(ns.groupTiles(concealedSets[i]));
    }
    concealed.push(pair, pair);

    return { concealed: concealed, melds: melds, winTile: winTile, usedCounts: counts };
  }

  /**
   * 問題を1問つくる。
   * options = { difficulty: 'easy'|'normal'|'hard', role: 'dealer'|'nondealer'|'random' }
   */
  function generateProblem(options) {
    options = options || {};
    var conf = DIFFICULTY[options.difficulty] || DIFFICULTY.normal;

    for (var attempt = 0; attempt < 400; attempt++) {
      var roundWind = chance(0.75) ? ns.EAST : ns.SOUTH;
      var isDealer = options.role === 'dealer' ? true
        : options.role === 'nondealer' ? false
        : chance(0.4);
      var seatWind = isDealer ? ns.EAST : pick([ns.SOUTH, ns.WEST, ns.NORTH]);

      var suits = [0, 1, 2, 3];
      if (chance(conf.honitsuRate)) suits = [randInt(3), 3];       // 混一色ぎみ
      var open = chance(conf.openRate);

      var opt = {
        suits: suits,
        runRate: conf.runRate,
        kanRate: conf.kanRate,
        toitoi: chance(conf.toitoiRate),
        open: open,
        forceYakuhai: open && chance(0.6),
        seatWind: seatWind,
        roundWind: roundWind
      };

      var built = buildHand(opt);
      if (!built) continue;

      var menzen = built.melds.every(function (m) { return m.type === 'ankan'; });
      var isTsumo = chance(0.5);
      var isRiichi = menzen && chance(0.7);

      // ドラ表示牌（手牌に4枚使われている牌は表示牌にできない）
      var doraIndicators = [];
      var indicatorCount = conf.doraIndicators;
      for (var d = 0; d < indicatorCount; d++) {
        for (var tries = 0; tries < 30; tries++) {
          var ind = randInt(34);
          if (built.usedCounts[ind] < 4) { doraIndicators.push(ind); break; }
        }
      }

      var hand = {
        concealed: built.concealed,
        melds: built.melds,
        winTile: built.winTile,
        isTsumo: isTsumo,
        isRiichi: isRiichi,
        isIppatsu: isRiichi && chance(0.15),
        seatWind: seatWind,
        roundWind: roundWind,
        doraIndicators: doraIndicators
      };

      var result = ns.evaluate(hand);
      if (!result) continue;                       // 役なし → 作り直し
      if (result.han > conf.maxHan) continue;      // 難易度に合わない → 作り直し
      if (options.difficulty === 'easy' && result.yakumanMultiplier > 0) continue;

      return { hand: hand, result: result };
    }

    // ここに来ることはほぼないが、念のための固定問題（リーチのみ・30符1翻）
    var fallback = {
      concealed: [0, 1, 2, 9, 10, 11, 18, 19, 20, 4, 5, 6, 30, 30],
      melds: [], winTile: 6, isTsumo: false, isRiichi: true, isIppatsu: false,
      seatWind: ns.SOUTH, roundWind: ns.EAST, doraIndicators: []
    };
    return { hand: fallback, result: ns.evaluate(fallback) };
  }

  ns.generateProblem = generateProblem;
  ns.DIFFICULTY = DIFFICULTY;
})(MJ);

if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
