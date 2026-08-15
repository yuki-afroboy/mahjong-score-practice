/*
 * score.js - 麻雀の点数計算エンジン
 *
 * やっていること:
 *   1. 手牌を「面子（メンツ）」の組み合わせに分解する
 *   2. 役（やく）を判定して翻（ハン）を数える
 *   3. 符（フ）を数える
 *   4. 翻と符から点数を出す
 *
 * 手牌の分け方が複数ある場合は、全部ためして「一番高い点数になる分け方」を採用します。
 * （麻雀のルールでは、点数が最も高くなる解釈を採用します）
 */
var MJ = (typeof MJ !== 'undefined') ? MJ : {};

(function (ns) {
  'use strict';

  // ---------------------------------------------------------------
  // 1. 手牌の分解
  // ---------------------------------------------------------------

  /** 面子（run=順子, triplet=刻子, kan=槓子）に含まれる牌を列挙する */
  function groupTiles(g) {
    if (g.type === 'run') return [g.tile, g.tile + 1, g.tile + 2];
    if (g.type === 'kan') return [g.tile, g.tile, g.tile, g.tile];
    return [g.tile, g.tile, g.tile];
  }

  /** 枚数の配列から「面子 need 個」の取り出し方を全部集める */
  function extractSets(counts, start, need, acc, out) {
    if (need === 0) {
      out.push(acc.slice());
      return;
    }
    var i = start;
    while (i < 34 && counts[i] === 0) i++;
    if (i >= 34) return;

    // 刻子（同じ牌3枚）として取る
    if (counts[i] >= 3) {
      counts[i] -= 3;
      acc.push({ type: 'triplet', tile: i, open: false });
      extractSets(counts, i, need - 1, acc, out);
      acc.pop();
      counts[i] += 3;
    }
    // 順子（続き数字3枚）として取る ※字牌は不可
    if (i < 27 && (i % 9) <= 6 && counts[i + 1] > 0 && counts[i + 2] > 0) {
      counts[i]--; counts[i + 1]--; counts[i + 2]--;
      acc.push({ type: 'run', tile: i, open: false });
      extractSets(counts, i, need - 1, acc, out);
      acc.pop();
      counts[i]++; counts[i + 1]++; counts[i + 2]++;
    }
  }

  /** 手牌（枚数配列）を「雀頭1つ + 面子 needSets 個」に分解する全パターン */
  function decompose(counts, needSets) {
    var results = [];
    for (var t = 0; t < 34; t++) {
      if (counts[t] < 2) continue;
      counts[t] -= 2;
      var sets = [];
      extractSets(counts, 0, needSets, [], sets);
      counts[t] += 2;
      for (var i = 0; i < sets.length; i++) {
        results.push({ pair: t, sets: sets[i] });
      }
    }
    return results;
  }

  /** 七対子（同じ牌2枚 × 7組）かどうか */
  function isChiitoitsuShape(counts) {
    var pairs = 0;
    for (var t = 0; t < 34; t++) {
      if (counts[t] === 0) continue;
      if (counts[t] !== 2) return false;
      pairs++;
    }
    return pairs === 7;
  }

  // ---------------------------------------------------------------
  // 2. 役の判定
  // ---------------------------------------------------------------

  var GREEN_TILES = [MJ.tile('s', 2), MJ.tile('s', 3), MJ.tile('s', 4),
                     MJ.tile('s', 6), MJ.tile('s', 8), ns.HATSU];

  function isYakuhaiTile(t, seatWind, roundWind) {
    return ns.isDragon(t) || t === seatWind || t === roundWind;
  }

  /** 順子・刻子に幺九牌（1・9・字牌）が含まれるか */
  function groupHasYaochu(g) {
    if (g.type === 'run') {
      var n = ns.numberOf(g.tile);
      return n === 1 || n === 7; // 123 か 789
    }
    return ns.isYaochu(g.tile);
  }

  function groupHasHonor(g) {
    return g.type !== 'run' && ns.isHonor(g.tile);
  }

  function detectYakuman(ctx) {
    var list = [];
    var groups = ctx.groups;
    var tiles = ctx.allTiles;
    var i;

    if (!ctx.isChiitoi) {
      var concealedTriplets = 0, dragons = 0, winds = 0, kans = 0;
      for (i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.type === 'kan') kans++;
        if (g.type === 'triplet' || g.type === 'kan') {
          if (!g.open) concealedTriplets++;
          if (ns.isDragon(g.tile)) dragons++;
          if (ns.isWind(g.tile)) winds++;
        }
      }
      if (concealedTriplets === 4) list.push({ name: '四暗刻', han: 13 });
      if (dragons === 3) list.push({ name: '大三元', han: 13 });
      if (winds === 4) list.push({ name: '大四喜', han: 13 });
      else if (winds === 3 && ns.isWind(ctx.pair)) list.push({ name: '小四喜', han: 13 });
      if (kans === 4) list.push({ name: '四槓子', han: 13 });
    }

    var allHonor = true, allTerminal = true, allGreen = true;
    for (i = 0; i < tiles.length; i++) {
      if (!ns.isHonor(tiles[i])) allHonor = false;
      if (!ns.isTerminal(tiles[i])) allTerminal = false;
      if (GREEN_TILES.indexOf(tiles[i]) < 0) allGreen = false;
    }
    if (allHonor) list.push({ name: '字一色', han: 13 });
    if (allTerminal) list.push({ name: '清老頭', han: 13 });
    if (allGreen) list.push({ name: '緑一色', han: 13 });

    // 九蓮宝燈（門前・清一色で 1112345678999 + 1枚 の形）
    if (ctx.menzen && !ctx.isChiitoi) {
      var suit = ns.suitOf(tiles[0]);
      var sameSuit = suit < 3;
      for (i = 0; i < tiles.length; i++) if (ns.suitOf(tiles[i]) !== suit) sameSuit = false;
      if (sameSuit) {
        var c = ns.toCounts(tiles);
        var base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
        var extra = 0, ok = true;
        for (i = 0; i < 9; i++) {
          var diff = c[suit * 9 + i] - base[i];
          if (diff < 0) { ok = false; break; }
          extra += diff;
        }
        if (ok && extra === 1) list.push({ name: '九蓮宝燈', han: 13 });
      }
    }
    return list;
  }

  function detectYaku(ctx) {
    var yaku = [];
    var groups = ctx.groups;
    var tiles = ctx.allTiles;
    var menzen = ctx.menzen;
    var i, g;

    if (ctx.isRiichi) yaku.push({ name: '立直（リーチ）', han: 1 });
    if (ctx.isIppatsu) yaku.push({ name: '一発', han: 1 });
    if (menzen && ctx.isTsumo) yaku.push({ name: '門前清自摸和（ツモ）', han: 1 });
    if (ctx.hasPinfu) yaku.push({ name: '平和（ピンフ）', han: 1 });

    var allSimple = true, hasHonorTile = false, suits = {};
    for (i = 0; i < tiles.length; i++) {
      if (ns.isYaochu(tiles[i])) allSimple = false;
      if (ns.isHonor(tiles[i])) hasHonorTile = true;
      else suits[ns.suitOf(tiles[i])] = true;
    }
    if (allSimple) yaku.push({ name: '断幺九（タンヤオ）', han: 1 });

    if (ctx.isChiitoi) {
      yaku.push({ name: '七対子（チートイツ）', han: 2 });
    } else {
      // 役牌（三元牌・場風・自風）
      for (i = 0; i < groups.length; i++) {
        g = groups[i];
        if (g.type === 'run') continue;
        if (ns.isDragon(g.tile)) {
          yaku.push({ name: '役牌 ' + ns.label(g.tile).main, han: 1 });
        }
        if (g.tile === ctx.roundWind) {
          yaku.push({ name: '場風 ' + ns.label(g.tile).main, han: 1 });
        }
        if (g.tile === ctx.seatWind) {
          yaku.push({ name: '自風 ' + ns.label(g.tile).main, han: 1 });
        }
      }

      // 一盃口 / 二盃口（同じ順子のペア）
      if (menzen) {
        var runCount = {};
        for (i = 0; i < groups.length; i++) {
          if (groups[i].type === 'run') runCount[groups[i].tile] = (runCount[groups[i].tile] || 0) + 1;
        }
        var peiko = 0;
        for (var key in runCount) peiko += Math.floor(runCount[key] / 2);
        if (peiko >= 2) yaku.push({ name: '二盃口', han: 3 });
        else if (peiko === 1) yaku.push({ name: '一盃口', han: 1 });
      }

      // 三色同順
      var runStarts = {};
      for (i = 0; i < groups.length; i++) {
        if (groups[i].type === 'run') {
          var n = ns.numberOf(groups[i].tile);
          runStarts[n] = (runStarts[n] || 0) | (1 << ns.suitOf(groups[i].tile));
        }
      }
      for (var num in runStarts) {
        if (runStarts[num] === 0b111) { yaku.push({ name: '三色同順', han: menzen ? 2 : 1 }); break; }
      }

      // 一気通貫（同じ色で 123・456・789）
      var ittsuu = {};
      for (i = 0; i < groups.length; i++) {
        if (groups[i].type === 'run') {
          var st = ns.numberOf(groups[i].tile);
          if (st === 1 || st === 4 || st === 7) {
            var s = ns.suitOf(groups[i].tile);
            ittsuu[s] = (ittsuu[s] || 0) | (1 << ((st - 1) / 3));
          }
        }
      }
      for (var sk in ittsuu) {
        if (ittsuu[sk] === 0b111) { yaku.push({ name: '一気通貫', han: menzen ? 2 : 1 }); break; }
      }

      // 対々和・三暗刻・三色同刻・三槓子
      var triplets = 0, concealed = 0, kans = 0, tripletNums = {};
      for (i = 0; i < groups.length; i++) {
        g = groups[i];
        if (g.type === 'triplet' || g.type === 'kan') {
          triplets++;
          if (!g.open) concealed++;
          if (g.type === 'kan') kans++;
          if (!ns.isHonor(g.tile)) {
            var tn = ns.numberOf(g.tile);
            tripletNums[tn] = (tripletNums[tn] || 0) | (1 << ns.suitOf(g.tile));
          }
        }
      }
      if (triplets === 4) yaku.push({ name: '対々和（トイトイ）', han: 2 });
      if (concealed === 3) yaku.push({ name: '三暗刻', han: 2 });
      if (kans === 3) yaku.push({ name: '三槓子', han: 2 });
      for (var tnum in tripletNums) {
        if (tripletNums[tnum] === 0b111) { yaku.push({ name: '三色同刻', han: 2 }); break; }
      }

      // 小三元（三元牌の刻子2つ + 三元牌の雀頭）
      var dragonSets = 0;
      for (i = 0; i < groups.length; i++) {
        if (groups[i].type !== 'run' && ns.isDragon(groups[i].tile)) dragonSets++;
      }
      if (dragonSets === 2 && ns.isDragon(ctx.pair)) yaku.push({ name: '小三元', han: 2 });

      // チャンタ / 純チャン
      var allYaochuGroups = ns.isYaochu(ctx.pair);
      var anyHonorGroup = ns.isHonor(ctx.pair);
      var hasRun = false;
      for (i = 0; i < groups.length; i++) {
        if (!groupHasYaochu(groups[i])) allYaochuGroups = false;
        if (groupHasHonor(groups[i])) anyHonorGroup = true;
        if (groups[i].type === 'run') hasRun = true;
      }
      if (allYaochuGroups && hasRun) {
        if (anyHonorGroup) yaku.push({ name: '混全帯幺九（チャンタ）', han: menzen ? 2 : 1 });
        else yaku.push({ name: '純全帯幺九（ジュンチャン）', han: menzen ? 3 : 2 });
      }
    }

    // 混老頭（全部が1・9・字牌）
    var allYaochuTiles = true;
    for (i = 0; i < tiles.length; i++) if (!ns.isYaochu(tiles[i])) allYaochuTiles = false;
    if (allYaochuTiles && hasHonorTile) yaku.push({ name: '混老頭', han: 2 });

    // 混一色 / 清一色
    var suitKinds = Object.keys(suits).length;
    if (suitKinds === 1) {
      if (hasHonorTile) yaku.push({ name: '混一色（ホンイツ）', han: menzen ? 3 : 2 });
      else yaku.push({ name: '清一色（チンイツ）', han: menzen ? 6 : 5 });
    }

    return yaku;
  }

  // ---------------------------------------------------------------
  // 3. 符の計算
  // ---------------------------------------------------------------

  function groupFu(g) {
    if (g.type === 'run') return 0;
    var yao = ns.isYaochu(g.tile);
    if (g.type === 'kan') {
      return g.open ? (yao ? 16 : 8) : (yao ? 32 : 16);
    }
    return g.open ? (yao ? 4 : 2) : (yao ? 8 : 4);
  }

  function groupFuLabel(g) {
    var kind = ns.isYaochu(g.tile) ? '幺九牌' : '中張牌';
    var open = g.open ? '明' : '暗';
    var type = g.type === 'kan' ? '槓' : '刻';
    return open + type + '子（' + kind + ' ' + ns.readableName(g.tile) + '）';
  }

  var WAIT_LABEL = {
    ryanmen: '両面待ち', kanchan: '嵌張（カンチャン）待ち', penchan: '辺張（ペンチャン）待ち',
    shanpon: '双碰（シャンポン）待ち', tanki: '単騎待ち'
  };

  function calcFu(ctx) {
    var details = [];
    var fu = 0;
    var i;

    if (ctx.isChiitoi) {
      return { fu: 25, details: [{ label: '七対子は25符固定', fu: 25 }] };
    }

    if (ctx.hasPinfu) {
      if (ctx.isTsumo) {
        return { fu: 20, details: [{ label: '平和ツモは20符固定', fu: 20 }] };
      }
      return {
        fu: 30,
        details: [{ label: '副底（基本の符）', fu: 20 }, { label: '門前ロン', fu: 10 }]
      };
    }

    fu = 20;
    details.push({ label: '副底（基本の符）', fu: 20 });

    if (ctx.menzen && !ctx.isTsumo) { fu += 10; details.push({ label: '門前ロン', fu: 10 }); }
    if (ctx.isTsumo) { fu += 2; details.push({ label: 'ツモ', fu: 2 }); }

    for (i = 0; i < ctx.groups.length; i++) {
      var add = groupFu(ctx.groups[i]);
      if (add > 0) { fu += add; details.push({ label: groupFuLabel(ctx.groups[i]), fu: add }); }
    }

    if (isYakuhaiTile(ctx.pair, ctx.seatWind, ctx.roundWind)) {
      fu += 2;
      details.push({ label: '役牌の雀頭（' + ns.label(ctx.pair).main + '）', fu: 2 });
    }

    if (ctx.waitType === 'kanchan' || ctx.waitType === 'penchan' || ctx.waitType === 'tanki') {
      fu += 2;
      details.push({ label: WAIT_LABEL[ctx.waitType], fu: 2 });
    }

    // 鳴いていて符が付かない形（喰い平和形）は30符として扱う
    if (fu === 20 && !ctx.menzen) {
      fu = 30;
      details.push({ label: '鳴きで符がつかない形（20符 → 30符）', fu: 10 });
    }

    var rounded = Math.ceil(fu / 10) * 10;
    if (rounded !== fu) {
      details.push({ label: '切り上げ（' + fu + '符 → ' + rounded + '符）', fu: 0 });
    }
    return { fu: rounded, details: details, raw: fu };
  }

  // ---------------------------------------------------------------
  // 4. 点数の計算
  // ---------------------------------------------------------------

  function ceil100(x) { return Math.ceil(x / 100) * 100; }

  /** 基本点（この数字を4倍・6倍などして支払いを出す） */
  function baseScore(han, fu, yakumanMultiplier) {
    if (yakumanMultiplier > 0) return 8000 * yakumanMultiplier;
    if (han >= 13) return 8000;   // 数え役満
    if (han >= 11) return 6000;   // 三倍満
    if (han >= 8) return 4000;    // 倍満
    if (han >= 6) return 3000;    // 跳満
    if (han >= 5) return 2000;    // 満貫
    return Math.min(fu * Math.pow(2, 2 + han), 2000);
  }

  function limitName(han, fu, yakumanMultiplier) {
    if (yakumanMultiplier >= 2) return 'ダブル役満';
    if (yakumanMultiplier === 1) return '役満';
    if (han >= 13) return '数え役満';
    if (han >= 11) return '三倍満';
    if (han >= 8) return '倍満';
    if (han >= 6) return '跳満';
    if (han >= 5) return '満貫';
    if (fu * Math.pow(2, 2 + han) >= 2000) return '満貫';
    return '';
  }

  /** 基本点から実際のやり取りを計算する */
  function payments(base, isDealer, isTsumo) {
    if (isTsumo) {
      if (isDealer) {
        var each = ceil100(base * 2);
        return { total: each * 3, each: each, text: each + '点オール', isTsumo: true, isDealer: true };
      }
      var fromDealer = ceil100(base * 2);
      var fromOthers = ceil100(base * 1);
      return {
        total: fromDealer + fromOthers * 2,
        fromDealer: fromDealer, fromOthers: fromOthers,
        text: fromOthers + ' / ' + fromDealer,
        isTsumo: true, isDealer: false
      };
    }
    var total = ceil100(base * (isDealer ? 6 : 4));
    return { total: total, text: total + '点', isTsumo: false, isDealer: isDealer };
  }

  // ---------------------------------------------------------------
  // 5. 手牌ぜんぶをまとめて計算する
  // ---------------------------------------------------------------

  /** 上がり牌がどの面子に使われたかから「待ちの形」を判定する */
  function waitTypeOf(group, winTile) {
    if (group.type === 'pair') return 'tanki';
    if (group.type === 'triplet' || group.type === 'kan') return 'shanpon';
    var pos = winTile - group.tile; // 0=下端 1=真ん中 2=上端
    if (pos === 1) return 'kanchan';
    var start = ns.numberOf(group.tile);
    if (pos === 2 && start === 1) return 'penchan';  // 12 に 3 が来た
    if (pos === 0 && start === 7) return 'penchan';  // 89 に 7 が来た
    return 'ryanmen';
  }

  function countDora(tiles, doraIndicators) {
    var dora = 0;
    for (var i = 0; i < doraIndicators.length; i++) {
      var d = ns.doraFromIndicator(doraIndicators[i]);
      for (var j = 0; j < tiles.length; j++) if (tiles[j] === d) dora++;
    }
    return dora;
  }

  /**
   * ひとつの解釈（面子の分け方 + 待ち）を採点する
   */
  function evaluateOne(ctx) {
    ctx.hasPinfu = false;
    if (!ctx.isChiitoi && ctx.menzen && ctx.waitType === 'ryanmen') {
      var allRuns = true;
      for (var i = 0; i < ctx.groups.length; i++) if (ctx.groups[i].type !== 'run') allRuns = false;
      if (allRuns && !isYakuhaiTile(ctx.pair, ctx.seatWind, ctx.roundWind)) ctx.hasPinfu = true;
    }

    var yakumanList = detectYakuman(ctx);
    var yaku, han, yakumanMultiplier = 0, doraCount = 0, doraList = [];

    if (yakumanList.length > 0) {
      yaku = yakumanList;
      yakumanMultiplier = yakumanList.length;
      han = 13 * yakumanMultiplier;
    } else {
      yaku = detectYaku(ctx);
      han = 0;
      for (var y = 0; y < yaku.length; y++) han += yaku[y].han;
      if (han === 0) return null; // 役なしは上がれない
      doraCount = countDora(ctx.allTiles, ctx.doraIndicators);
      if (doraCount > 0) {
        doraList.push({ name: 'ドラ', han: doraCount });
        han += doraCount;
      }
    }

    var fuResult = calcFu(ctx);
    var base = baseScore(han, fuResult.fu, yakumanMultiplier);
    var pay = payments(base, ctx.isDealer, ctx.isTsumo);

    return {
      yaku: yaku.concat(doraList),
      han: han,
      yakumanMultiplier: yakumanMultiplier,
      fu: fuResult.fu,
      fuDetails: fuResult.details,
      base: base,
      limit: limitName(han, fuResult.fu, yakumanMultiplier),
      payment: pay,
      points: pay.total,
      waitType: ctx.waitType,
      waitLabel: WAIT_LABEL[ctx.waitType],
      groups: ctx.groups,
      pair: ctx.pair,
      isChiitoi: ctx.isChiitoi,
      chiitoiPairs: ctx.chiitoiPairs || null,
      hasPinfu: ctx.hasPinfu
    };
  }

  function better(a, b) {
    if (!b) return true;
    if (a.points !== b.points) return a.points > b.points;
    if (a.han !== b.han) return a.han > b.han;
    return a.fu > b.fu;
  }

  /**
   * 手牌全体を計算する。
   * hand = {
   *   concealed: [牌...]  // 門前の牌（上がり牌をふくむ）。鳴いた牌・暗槓は入れない
   *   melds: [{type:'chi'|'pon'|'kan'|'ankan', tile: 牌}]
   *   winTile, isTsumo, seatWind, roundWind, isRiichi, isIppatsu, doraIndicators
   * }
   */
  function evaluate(hand) {
    var melds = hand.melds || [];
    var doraIndicators = hand.doraIndicators || [];
    var isDealer = hand.seatWind === ns.EAST;
    var menzen = true;
    var fixedGroups = [];
    var meldTiles = [];
    var i;

    for (i = 0; i < melds.length; i++) {
      var m = melds[i];
      var g;
      if (m.type === 'chi') g = { type: 'run', tile: m.tile, open: true };
      else if (m.type === 'pon') g = { type: 'triplet', tile: m.tile, open: true };
      else if (m.type === 'kan') g = { type: 'kan', tile: m.tile, open: true };
      else g = { type: 'kan', tile: m.tile, open: false }; // 暗槓
      if (m.type !== 'ankan') menzen = false;
      fixedGroups.push(g);
      meldTiles = meldTiles.concat(groupTiles(g));
    }

    var counts = ns.toCounts(hand.concealed);
    var needSets = 4 - fixedGroups.length;
    var best = null;

    var baseCtx = {
      isTsumo: !!hand.isTsumo,
      menzen: menzen,
      isDealer: isDealer,
      seatWind: hand.seatWind,
      roundWind: hand.roundWind,
      isRiichi: !!hand.isRiichi && menzen,
      isIppatsu: !!hand.isIppatsu && !!hand.isRiichi && menzen,
      doraIndicators: doraIndicators
    };

    // --- 七対子として見る ---
    if (fixedGroups.length === 0 && isChiitoitsuShape(counts)) {
      var pairsList = [];
      for (i = 0; i < 34; i++) if (counts[i] === 2) pairsList.push(i);
      var ctx = Object.assign({}, baseCtx, {
        groups: [], pair: hand.winTile, isChiitoi: true, chiitoiPairs: pairsList,
        waitType: 'tanki', allTiles: hand.concealed.slice()
      });
      var r = evaluateOne(ctx);
      if (better(r || { points: -1 }, best) && r) best = r;
    }

    // --- 通常形（4面子1雀頭）として見る ---
    var decs = decompose(counts, needSets);
    for (var d = 0; d < decs.length; d++) {
      var dec = decs[d];
      // 上がり牌がどの面子に使われたか、可能性を全部ためす
      var candidates = [];
      for (i = 0; i < dec.sets.length; i++) {
        if (groupTiles(dec.sets[i]).indexOf(hand.winTile) >= 0) candidates.push(i);
      }
      if (dec.pair === hand.winTile) candidates.push(-1);
      if (candidates.length === 0) continue;

      for (var ci = 0; ci < candidates.length; ci++) {
        var winIndex = candidates[ci];
        var groups = [];
        for (i = 0; i < dec.sets.length; i++) {
          groups.push({ type: dec.sets[i].type, tile: dec.sets[i].tile, open: false });
        }
        // ロンで刻子が完成した場合、その刻子は「明刻」として数える
        if (winIndex >= 0 && !hand.isTsumo && groups[winIndex].type === 'triplet') {
          groups[winIndex].open = true;
        }
        var allGroups = groups.concat(fixedGroups);
        var allTiles = [];
        for (i = 0; i < allGroups.length; i++) allTiles = allTiles.concat(groupTiles(allGroups[i]));
        allTiles.push(dec.pair, dec.pair);

        var wait = winIndex === -1
          ? 'tanki'
          : waitTypeOf(dec.sets[winIndex], hand.winTile);

        var c2 = Object.assign({}, baseCtx, {
          groups: allGroups, pair: dec.pair, isChiitoi: false,
          waitType: wait, allTiles: allTiles
        });
        var res = evaluateOne(c2);
        if (res && better(res, best)) best = res;
      }
    }

    return best;
  }

  ns.groupTiles = groupTiles;
  ns.decompose = decompose;
  ns.isChiitoitsuShape = isChiitoitsuShape;
  ns.calcFu = calcFu;
  ns.baseScore = baseScore;
  ns.payments = payments;
  ns.limitName = limitName;
  ns.evaluate = evaluate;
  ns.WAIT_LABEL = WAIT_LABEL;
})(MJ);

if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
