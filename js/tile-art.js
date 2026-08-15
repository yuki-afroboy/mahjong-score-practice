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

  /** 一索の鳥 */
  function bird() {
    return '<g>' +
      // 尾
      '<path d="M25 52 L8 74 L14 76 L27 60 Z" fill="' + GREEN + '"/>' +
      '<path d="M28 55 L14 78 L21 79 L31 62 Z" fill="' + GREEN + '" opacity=".75"/>' +
      // 体
      '<ellipse cx="31" cy="47" rx="12" ry="15" fill="' + GREEN + '"/>' +
      // 羽
      '<ellipse cx="28" cy="46" rx="6.5" ry="11" fill="#fff" opacity=".35"/>' +
      // 首と頭
      '<path d="M31 34 C31 26 34 21 39 20 L43 26 C39 28 37 32 37 37 Z" fill="' + GREEN + '"/>' +
      '<circle cx="40" cy="20" r="7" fill="' + GREEN + '"/>' +
      '<circle cx="42" cy="18.5" r="1.9" fill="#fff"/>' +
      // くちばし
      '<path d="M46 18 L54 21 L46 24 Z" fill="' + RED + '"/>' +
      // 足と止まり木
      '<rect x="29" y="60" width="2.4" height="9" fill="' + RED + '"/>' +
      '<rect x="34" y="59" width="2.4" height="10" fill="' + RED + '"/>' +
      '<rect x="18" y="68" width="26" height="3.4" rx="1.7" fill="' + RED + '"/>' +
      '</g>';
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
    // 八索だけは特別な形。竹を斜めに並べて、上半分が「W」、下半分が「M」になる
    // （4本目の [ ] は傾ける角度。＋で「／」、−で「＼」の向き）
    8: { h: 27, sticks: [[10, 24, GREEN, -28], [23, 24, GREEN, 28],
                         [36, 24, GREEN, -28], [49, 24, GREEN, 28],
                         [10, 60, GREEN, 28], [23, 60, GREEN, -28],
                         [36, 60, GREEN, 28], [49, 60, GREEN, -28]] },
    9: { h: 20, sticks: [[15, 16, GREEN], [30, 16, GREEN], [45, 16, GREEN],
                         [15, 42, GREEN], [30, 42, GREEN], [45, 42, GREEN],
                         [15, 68, GREEN], [30, 68, GREEN], [45, 68, GREEN]] }
  };

  function souzu(n) {
    if (n === 1) return svg(bird());
    var conf = SOU_LAYOUT[n];
    var out = '';
    for (var i = 0; i < conf.sticks.length; i++) {
      out += bamboo(conf.sticks[i][0], conf.sticks[i][1], conf.h, conf.sticks[i][2],
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
