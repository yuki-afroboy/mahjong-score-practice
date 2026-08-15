/*
 * tile-art.js - 麻雀牌の絵柄をSVG（図形）で描くファイル
 *
 * 画像ファイルを使わず、線や円をその場で描いています。
 * そのため通信が不要で、どんな画面サイズでもきれいに表示されます。
 *
 * 牌の面は 60 × 84 のマス目として描いています（左上が 0,0）。
 */
var MJ = (typeof MJ !== 'undefined') ? MJ : {};

(function (ns) {
  'use strict';

  var BLUE  = '#1b3f7a';
  var GREEN = '#0e7a3c';
  var RED   = '#bb2a20';
  var INK   = '#22303a';

  var KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  var MINCHO = "'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP','Songti SC',serif";

  function svg(inner) {
    // 牌の縁に余白をとるため、絵柄(60x84)より少し広い範囲を表示する
    return '<svg viewBox="-5 -6 70 96" xmlns="http://www.w3.org/2000/svg" ' +
           'focusable="false" aria-hidden="true">' + inner + '</svg>';
  }

  function text(str, y, size, color, weight) {
    return '<text x="30" y="' + y + '" text-anchor="middle" font-size="' + size +
      '" fill="' + color + '" font-family="' + MINCHO + '" font-weight="' +
      (weight || 700) + '">' + str + '</text>';
  }

  // ---------------------------------------------------------------
  // 筒子（ピンズ）＝ 円
  // ---------------------------------------------------------------
  function dot(cx, cy, r, color) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#fff" stroke="' +
             color + '" stroke-width="' + (r * 0.44).toFixed(2) + '"/>' +
           '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.28).toFixed(2) +
             '" fill="' + color + '"/>';
  }

  /** 一筒だけは大きな飾り円 */
  function bigDot() {
    return '<circle cx="30" cy="42" r="19" fill="#fff" stroke="' + BLUE + '" stroke-width="4"/>' +
           '<circle cx="30" cy="42" r="12.5" fill="#fff" stroke="' + RED + '" stroke-width="4"/>' +
           '<circle cx="30" cy="42" r="5" fill="' + BLUE + '"/>';
  }

  // [x, y, 色] の並びで筒子の配置を決める
  var PIN_LAYOUT = {
    2: { r: 11, dots: [[30, 24, GREEN], [30, 60, BLUE]] },
    3: { r: 10, dots: [[15, 20, BLUE], [30, 42, GREEN], [45, 64, RED]] },
    4: { r: 11, dots: [[19, 25, BLUE], [41, 25, GREEN], [19, 59, GREEN], [41, 59, BLUE]] },
    5: { r: 9,  dots: [[17, 22, BLUE], [43, 22, GREEN], [30, 42, RED],
                       [17, 62, GREEN], [43, 62, BLUE]] },
    6: { r: 9,  dots: [[19, 20, GREEN], [41, 20, GREEN], [19, 42, RED], [41, 42, RED],
                       [19, 64, RED], [41, 64, RED]] },
    7: { r: 8,  dots: [[14, 15, GREEN], [30, 23, GREEN], [46, 31, GREEN],
                       [20, 53, RED], [40, 53, RED], [20, 71, RED], [40, 71, RED]] },
    8: { r: 8,  dots: [[20, 15, BLUE], [40, 15, BLUE], [20, 33, BLUE], [40, 33, BLUE],
                       [20, 51, BLUE], [40, 51, BLUE], [20, 69, BLUE], [40, 69, BLUE]] },
    9: { r: 8.5, dots: [[15, 21, GREEN], [30, 21, GREEN], [45, 21, GREEN],
                        [15, 42, RED], [30, 42, RED], [45, 42, RED],
                        [15, 63, BLUE], [30, 63, BLUE], [45, 63, BLUE]] }
  };

  function pinzu(n) {
    if (n === 1) return svg(bigDot());
    var conf = PIN_LAYOUT[n];
    var out = '';
    for (var i = 0; i < conf.dots.length; i++) {
      out += dot(conf.dots[i][0], conf.dots[i][1], conf.r, conf.dots[i][2]);
    }
    return svg(out);
  }

  // ---------------------------------------------------------------
  // 索子（ソウズ）＝ 竹。1索だけは鳥
  // ---------------------------------------------------------------
  function bamboo(cx, cy, h, color, angle) {
    var w = h * 0.22;
    var top = cy - h / 2, bottom = cy + h / 2;
    var rot = angle ? ' transform="rotate(' + angle + ' ' + cx + ' ' + cy + ')"' : '';
    return '<g fill="' + color + '"' + rot + '>' +
      '<rect x="' + (cx - w / 2) + '" y="' + top + '" width="' + w + '" height="' + h +
        '" rx="' + (w / 2) + '"/>' +
      '<rect x="' + (cx - w * 0.9) + '" y="' + (top + h * 0.24) + '" width="' + (w * 1.8) +
        '" height="' + (h * 0.09) + '" rx="' + (h * 0.045) + '"/>' +
      '<rect x="' + (cx - w * 0.9) + '" y="' + (bottom - h * 0.33) + '" width="' + (w * 1.8) +
        '" height="' + (h * 0.09) + '" rx="' + (h * 0.045) + '"/>' +
      '<circle cx="' + cx + '" cy="' + (top + w * 0.4) + '" r="' + (w * 0.62) + '"/>' +
      '<circle cx="' + cx + '" cy="' + (bottom - w * 0.4) + '" r="' + (w * 0.62) + '"/>' +
      '</g>';
  }

  /**
   * 一索の孔雀（クジャク）
   * 上＝横に広がった緑の羽（細い羽先＋目玉模様の丸）、
   * 下＝正面を向いた鳥（左右に広げた扇形の翼）と赤い足。
   */
  function bird() {
    var out = '';
    var fx = 30, fy = 24;   // 羽の中心
    var i;

    // 羽の先端（放射状の細い羽）
    for (i = 0; i < 31; i++) {
      var deg = -190 + i * (200 / 30);
      var rad = deg * Math.PI / 180;
      var x1 = fx + Math.cos(rad) * 22, y1 = fy + Math.sin(rad) * 18.5;
      var x2 = fx + Math.cos(rad) * 30, y2 = fy + Math.sin(rad) * 26;
      out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' +
        x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + GREEN +
        '" stroke-width="1.5" stroke-linecap="round"/>';
    }

    // 羽の下に垂れる部分
    out += '<g stroke="' + GREEN + '" stroke-width="1.6" stroke-linecap="round">' +
           '<path d="M23 42 L22 52"/><path d="M27.5 43 L27 53"/>' +
           '<path d="M32.5 43 L33 53"/><path d="M37 42 L38 52"/>' +
           '</g>';

    // 羽の本体（横に広い山型）
    out += '<path d="M30 3 C44 3 54 11 55 22 C55.5 31 51 39 45 43 C40 46 35 47 30 47 ' +
           'C25 47 20 46 15 43 C9 39 4.5 31 5 22 C6 11 16 3 30 3 Z" fill="' + GREEN + '"/>';

    // 目玉模様（白い丸＋中央の緑の点）
    var rows = [[12, [24, 36]], [21.5, [17, 30, 43]], [31, [12, 24, 36, 48]],
                [40, [18.5, 30, 41.5]]];
    for (var r = 0; r < rows.length; r++) {
      var y = rows[r][0], xs = rows[r][1];
      for (var c = 0; c < xs.length; c++) {
        out += '<circle cx="' + xs[c] + '" cy="' + y + '" r="4.1" fill="#fff"/>' +
               '<circle cx="' + xs[c] + '" cy="' + y + '" r="1.7" fill="' + GREEN + '"/>';
      }
    }

    // 左右に広げた扇形の翼（先が上外に尖る）
    out += '<g fill="#fff" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round">' +
           '<path d="M3 53 C0 61 1 71 6 76 C12 80 21 77 26 72 C21 67 13 58 3 53 Z"/>' +
           '<path d="M57 53 C60 61 59 71 54 76 C48 80 39 77 34 72 C39 67 47 58 57 53 Z"/>' +
           '</g>';
    out += '<g fill="none" stroke="' + INK + '" stroke-width="1" stroke-linecap="round">' +
           '<path d="M24 70 C17 67 9 62 4 56"/><path d="M22.5 74 C16 73 10 70 5.5 65"/>' +
           '<path d="M36 70 C43 67 51 62 56 56"/><path d="M37.5 74 C44 73 50 70 54.5 65"/>' +
           '</g>';

    // 体と頭
    out += '<ellipse cx="30" cy="71" rx="9.5" ry="6.6" fill="#fff" stroke="' + INK +
             '" stroke-width="1.6"/>' +
           '<circle cx="30" cy="60" r="4.8" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/>' +
           '<circle cx="31.2" cy="58.7" r="1.2" fill="' + INK + '"/>' +
           '<path d="M26 60.5 L21 62 L26 63.5 Z" fill="' + INK + '"/>';

    // 頭のそばの赤い飾り
    out += '<g stroke="' + RED + '" stroke-width="1.7" stroke-linecap="round" fill="none">' +
           '<path d="M22 53 L15 56"/><path d="M23 56.5 L17 59.5"/>' +
           '</g>';

    // 赤い足
    out += '<g stroke="' + RED + '" stroke-width="1.6" stroke-linecap="round" fill="none">' +
           '<path d="M26 77 L26 81 M22.5 84 L26 81 L29.5 84 M26 81 L26 84.5"/>' +
           '<path d="M34 77 L34 81 M30.5 84 L34 81 L37.5 84 M34 81 L34 84.5"/>' +
           '</g>';

    return '<g>' + out + '</g>';
  }

  var SOU_LAYOUT = {
    2: { h: 30, sticks: [[30, 24, GREEN], [30, 60, GREEN]] },
    3: { h: 28, sticks: [[30, 22, GREEN], [19, 58, GREEN], [41, 58, GREEN]] },
    4: { h: 28, sticks: [[19, 24, GREEN], [41, 24, GREEN], [19, 60, GREEN], [41, 60, GREEN]] },
    5: { h: 26, sticks: [[17, 22, GREEN], [43, 22, GREEN], [30, 42, RED],
                         [17, 62, GREEN], [43, 62, GREEN]] },
    6: { h: 28, sticks: [[15, 24, GREEN], [30, 24, GREEN], [45, 24, GREEN],
                         [15, 60, GREEN], [30, 60, GREEN], [45, 60, GREEN]] },
    7: { h: 20, sticks: [[30, 15, RED],
                         [15, 42, GREEN], [30, 42, GREEN], [45, 42, GREEN],
                         [15, 68, GREEN], [30, 68, GREEN], [45, 68, GREEN]] },
    // 八索だけは特別な形。両端の2本は縦のまま、内側の2本だけを斜めにして、
    // 上半分が「W」（中央が山）、下半分が「M」（中央が谷）になる。
    // 4つ目の数字は傾ける角度（＋で「／」、−で「＼」の向き）
    8: { h: 28, hSlant: 31, sticks: [
           [13, 24, GREEN, 0], [22.5, 24, GREEN, 32],
           [37.5, 24, GREEN, -32], [47, 24, GREEN, 0],
           [13, 60, GREEN, 0], [22.5, 60, GREEN, -32],
           [37.5, 60, GREEN, 32], [47, 60, GREEN, 0]] },
    9: { h: 20, sticks: [[15, 16, GREEN], [30, 16, GREEN], [45, 16, GREEN],
                         [15, 42, GREEN], [30, 42, GREEN], [45, 42, GREEN],
                         [15, 68, GREEN], [30, 68, GREEN], [45, 68, GREEN]] }
  };

  function souzu(n) {
    if (n === 1) return svg(bird());
    var conf = SOU_LAYOUT[n];
    var out = '';
    for (var i = 0; i < conf.sticks.length; i++) {
      // 斜めの竹は少し長くして、端が縦の竹とつながるようにする
      var len = (conf.sticks[i][3] && conf.hSlant) ? conf.hSlant : conf.h;
      out += bamboo(conf.sticks[i][0], conf.sticks[i][1], len, conf.sticks[i][2],
                    conf.sticks[i][3]);
    }
    return svg(out);
  }

  // ---------------------------------------------------------------
  // 萬子（マンズ）＝ 漢数字 ＋ 萬
  // ---------------------------------------------------------------
  function manzu(n) {
    return svg(text(KANJI[n - 1], 36, 31, INK) + text('萬', 75, 31, RED));
  }

  // ---------------------------------------------------------------
  // 字牌（ジハイ）
  // ---------------------------------------------------------------
  function honor(t) {
    if (t === ns.HAKU) {
      // 白は「枠だけ」の牌
      return svg('<rect x="9" y="11" width="42" height="62" rx="4" fill="none" stroke="' +
        BLUE + '" stroke-width="3.2"/>' +
        '<rect x="14" y="16" width="32" height="52" rx="2" fill="none" stroke="' +
        BLUE + '" stroke-width="1.4"/>');
    }
    var char = ns.HONOR_LABELS[t - 27];
    var color = t === ns.HATSU ? GREEN : (t === ns.CHUN ? RED : INK);
    return svg(text(char, 60, 42, color));
  }

  // ---------------------------------------------------------------
  // 牌インデックス → SVG
  // ---------------------------------------------------------------
  var cache = {};

  ns.tileSVG = function (t) {
    if (cache[t]) return cache[t];
    var out;
    if (ns.isHonor(t)) out = honor(t);
    else {
      var n = ns.numberOf(t);
      var suit = ns.suitOf(t);
      out = suit === 0 ? manzu(n) : suit === 1 ? pinzu(n) : souzu(n);
    }
    cache[t] = out;
    return out;
  };
})(MJ);

if (typeof module !== 'undefined' && module.exports) module.exports = MJ;
