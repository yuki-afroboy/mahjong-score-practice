/*
 * app.js - 画面の動きを担当するファイル
 *
 * ・問題を作って表示する
 * ・入力された点数を答え合わせする
 * ・解説（役・符・計算式）を表示する
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var state = {
    problem: null,
    input: '',
    answered: false,
    settings: { difficulty: 'normal', role: 'random' },
    stats: { total: 0, correct: 0, streak: 0, best: 0 }
  };

  var WIND_NAME = { 27: '東', 28: '南', 29: '西', 30: '北' };

  // ---------------------------------------------------------------
  // 保存（localStorage = ブラウザにデータを残しておく仕組み）
  // ---------------------------------------------------------------
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem('mj-settings'));
      if (s) state.settings = Object.assign(state.settings, s);
      var st = JSON.parse(localStorage.getItem('mj-stats'));
      if (st) state.stats = Object.assign(state.stats, st);
    } catch (e) { /* 保存データが壊れていても気にせず初期値で続ける */ }
  }
  function save() {
    try {
      localStorage.setItem('mj-settings', JSON.stringify(state.settings));
      localStorage.setItem('mj-stats', JSON.stringify(state.stats));
    } catch (e) { /* プライベートモードなどで保存できない場合は無視 */ }
  }

  // ---------------------------------------------------------------
  // 牌の表示
  // ---------------------------------------------------------------
  function tileEl(t, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'tile' + (opts.small ? ' small' : '') +
      (opts.tiny ? ' tiny' : '') + (opts.win ? ' win' : '');
    el.innerHTML = MJ.tileSVG(t);
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', MJ.readableName(t));
    return el;
  }

  function chip(text, hot) {
    var el = document.createElement('span');
    el.className = 'chip' + (hot ? ' hot' : '');
    el.textContent = text;
    return el;
  }

  // ---------------------------------------------------------------
  // 問題の表示
  // ---------------------------------------------------------------
  function renderProblem() {
    var hand = state.problem.hand;
    var isDealer = hand.seatWind === MJ.EAST;

    // 状況チップ
    var sit = $('situation');
    sit.innerHTML = '';
    sit.appendChild(chip(WIND_NAME[hand.roundWind] + '場'));
    sit.appendChild(chip('自風 ' + WIND_NAME[hand.seatWind] + '（' + (isDealer ? '親' : '子') + '）'));
    sit.appendChild(chip(hand.isTsumo ? 'ツモ' : 'ロン', true));
    if (hand.isRiichi) sit.appendChild(chip('リーチ'));
    if (hand.isIppatsu) sit.appendChild(chip('一発'));
    if (hand.doraIndicators.length > 0) {
      var doraChip = document.createElement('span');
      doraChip.className = 'chip dora';
      doraChip.appendChild(document.createTextNode('ドラ表示'));
      for (var d = 0; d < hand.doraIndicators.length; d++) {
        doraChip.appendChild(tileEl(hand.doraIndicators[d], { tiny: true }));
      }
      sit.appendChild(doraChip);
    }

    // 手牌（上がり牌は少し離して右端に表示する）
    var rest = hand.concealed.slice();
    rest.splice(rest.indexOf(hand.winTile), 1);
    rest.sort(function (a, b) { return a - b; });

    var handEl = $('handArea');
    handEl.innerHTML = '';
    rest.forEach(function (t) { handEl.appendChild(tileEl(t)); });

    var winArea = document.createElement('div');
    winArea.className = 'win-area';
    var badge = document.createElement('span');
    badge.className = 'win-badge';
    badge.textContent = hand.isTsumo ? 'ツモ' : 'ロン';
    winArea.appendChild(badge);
    winArea.appendChild(tileEl(hand.winTile, { win: true }));
    handEl.appendChild(winArea);

    // 鳴き（副露）
    var meldsEl = $('melds');
    meldsEl.innerHTML = '';
    var MELD_LABEL = { chi: 'チー', pon: 'ポン', kan: '明カン', ankan: '暗カン' };
    hand.melds.forEach(function (m) {
      var wrap = document.createElement('div');
      wrap.className = 'meld';
      var tilesEl = document.createElement('div');
      tilesEl.className = 'meld-tiles';
      var tiles = m.type === 'chi' ? [m.tile, m.tile + 1, m.tile + 2]
        : m.type === 'pon' ? [m.tile, m.tile, m.tile]
        : [m.tile, m.tile, m.tile, m.tile];
      tiles.forEach(function (t) { tilesEl.appendChild(tileEl(t, { small: true })); });
      var lab = document.createElement('div');
      lab.className = 'meld-label';
      lab.textContent = MELD_LABEL[m.type];
      wrap.appendChild(tilesEl);
      wrap.appendChild(lab);
      meldsEl.appendChild(wrap);
    });

    // 質問文
    $('askNote').textContent = (isDealer ? '親' : '子') + 'の' + (hand.isTsumo ? 'ツモ' : 'ロン') +
      'です。' + (hand.isTsumo ? '受け取る点数の合計を入力してください。' : '相手から受け取る点数を入力してください。');
  }

  // ---------------------------------------------------------------
  // 答え合わせと解説
  // ---------------------------------------------------------------
  function renderResult(verdict) {
    var r = state.problem.result;
    var hand = state.problem.hand;
    var isDealer = hand.seatWind === MJ.EAST;

    var v = $('verdict');
    v.className = 'verdict ' + (verdict === 'ok' ? 'ok' : verdict === 'ng' ? 'ng' : 'neutral');
    v.textContent = verdict === 'ok' ? '◯ 正解！' : verdict === 'ng' ? '✕ 不正解' : '答え';

    // 点数
    var limitTag = r.limit ? '<span class="limit">' + r.limit + '</span>' : '';
    $('answerMain').innerHTML = r.points.toLocaleString() + '点' + limitTag;

    var sub;
    if (r.payment.isTsumo) {
      sub = isDealer
        ? '（' + r.payment.each.toLocaleString() + '点オール＝3人から合計 ' + r.points.toLocaleString() + '点）'
        : '（子2人から ' + r.payment.fromOthers.toLocaleString() + '点ずつ、親から ' +
          r.payment.fromDealer.toLocaleString() + '点）';
    } else {
      sub = '（放銃した1人から ' + r.points.toLocaleString() + '点）';
    }
    $('answerSub').textContent = r.fu + '符 ' + r.han + '翻　' + sub;

    renderParsed(r);

    // 役の一覧
    var yakuList = $('yakuList');
    yakuList.innerHTML = '';
    r.yaku.forEach(function (y) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + y.name + '</span><span class="han">' + y.han + '翻</span>';
      yakuList.appendChild(li);
    });
    var totalLi = document.createElement('li');
    totalLi.className = 'total';
    totalLi.innerHTML = '<span>合計</span><span class="han">' +
      (r.yakumanMultiplier > 0 ? r.limit : r.han + '翻') + '</span>';
    yakuList.appendChild(totalLi);

    // 符の内訳
    var fuList = $('fuList');
    fuList.innerHTML = '';
    r.fuDetails.forEach(function (f) {
      var li = document.createElement('li');
      li.innerHTML = '<span>' + f.label + '</span><span class="fu">' + (f.fu > 0 ? '+' + f.fu + '符' : '') + '</span>';
      fuList.appendChild(li);
    });
    var fuTotal = document.createElement('li');
    fuTotal.className = 'total';
    fuTotal.innerHTML = '<span>合計（' + r.waitLabel + '）</span><span class="fu">' + r.fu + '符</span>';
    fuList.appendChild(fuTotal);

    $('formula').innerHTML = buildFormula(r, isDealer);

    $('result').classList.remove('hidden');
    $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 手牌がどう分けられたか（面子＋雀頭）を並べて見せる */
  function renderParsed(r) {
    var el = $('parsed');
    el.innerHTML = '';

    function addGroup(tiles, label) {
      var wrap = document.createElement('div');
      wrap.className = 'parsed-group';
      var row = document.createElement('div');
      row.className = 'parsed-tiles';
      tiles.forEach(function (t) { row.appendChild(tileEl(t, { small: true })); });
      var lab = document.createElement('div');
      lab.className = 'parsed-label';
      lab.textContent = label;
      wrap.appendChild(row);
      wrap.appendChild(lab);
      el.appendChild(wrap);
    }

    if (r.isChiitoi) {
      r.chiitoiPairs.forEach(function (t) { addGroup([t, t], '対子'); });
      return;
    }

    var LABEL = {
      run: { open: '順子（鳴き）', closed: '順子' },
      triplet: { open: '明刻', closed: '暗刻' },
      kan: { open: '明槓', closed: '暗槓' }
    };
    r.groups.forEach(function (g) {
      addGroup(MJ.groupTiles(g), LABEL[g.type][g.open ? 'open' : 'closed']);
    });
    addGroup([r.pair, r.pair], '雀頭');
  }

  /** 「なぜこの点数になるのか」を式で説明する */
  function buildFormula(r, isDealer) {
    var lines = [];
    var base = r.base;

    if (r.yakumanMultiplier > 0) {
      lines.push('<p>役満なので基本点は <span class="em">' + base.toLocaleString() + '点</span> です。</p>');
    } else if (r.han >= 5) {
      lines.push('<p>' + r.han + '翻 は <span class="em">' + r.limit +
        '</span> なので、符は使わず基本点は <span class="em">' + base.toLocaleString() + '点</span> です。</p>');
    } else {
      var raw = r.fu * Math.pow(2, 2 + r.han);
      lines.push('<p>基本点 ＝ ' + r.fu + '符 × 2<sup>(2＋' + r.han + ')</sup> ＝ ' + r.fu + ' × ' +
        Math.pow(2, 2 + r.han) + ' ＝ <span class="em">' + raw.toLocaleString() + '点</span>' +
        (raw > 2000 ? '（2000点を超えるので満貫扱いで 2000点）' : '') + '</p>');
    }

    if (r.payment.isTsumo) {
      if (isDealer) {
        lines.push('<p>親のツモ → 3人が「基本点 × 2」を払う<br>' +
          base.toLocaleString() + ' × 2 ＝ ' + (base * 2).toLocaleString() + ' → 切り上げて <span class="em">' +
          r.payment.each.toLocaleString() + '点オール</span></p>');
        lines.push('<p>合計 ＝ ' + r.payment.each.toLocaleString() + ' × 3 ＝ <span class="em">' +
          r.points.toLocaleString() + '点</span></p>');
      } else {
        lines.push('<p>子のツモ → 子は「基本点 × 1」、親は「基本点 × 2」を払う<br>' +
          '子：' + base.toLocaleString() + ' → <span class="em">' + r.payment.fromOthers.toLocaleString() + '点</span>　/　' +
          '親：' + (base * 2).toLocaleString() + ' → <span class="em">' + r.payment.fromDealer.toLocaleString() + '点</span></p>');
        lines.push('<p>合計 ＝ ' + r.payment.fromOthers.toLocaleString() + ' × 2 ＋ ' +
          r.payment.fromDealer.toLocaleString() + ' ＝ <span class="em">' + r.points.toLocaleString() + '点</span></p>');
      }
    } else {
      var mult = isDealer ? 6 : 4;
      lines.push('<p>' + (isDealer ? '親' : '子') + 'のロン → 基本点 × ' + mult + '<br>' +
        base.toLocaleString() + ' × ' + mult + ' ＝ ' + (base * mult).toLocaleString() +
        ' → 100点未満を切り上げて <span class="em">' + r.points.toLocaleString() + '点</span></p>');
    }
    return lines.join('');
  }

  // ---------------------------------------------------------------
  // 操作
  // ---------------------------------------------------------------
  function updateInput() {
    var t = $('answerText');
    if (state.input === '') {
      t.textContent = '点数を入力';
      t.className = 'placeholder';
      $('answerUnit').hidden = true;
    } else {
      t.textContent = parseInt(state.input, 10).toLocaleString();
      t.className = '';
      $('answerUnit').hidden = false;
    }
  }

  function pressKey(key) {
    if (state.answered) return;
    if (key === 'del') state.input = state.input.slice(0, -1);
    else if (state.input.length + key.length <= 6) state.input += key;
    updateInput();
  }

  function submit() {
    if (state.answered) return;
    if (state.input === '') return;
    var answer = parseInt(state.input, 10);
    var correct = answer === state.problem.result.points;

    state.answered = true;
    state.stats.total++;
    if (correct) {
      state.stats.correct++;
      state.stats.streak++;
      if (state.stats.streak > state.stats.best) state.stats.best = state.stats.streak;
    } else {
      state.stats.streak = 0;
    }
    save();
    renderStats();
    $('askArea').classList.add('answered');
    renderResult(correct ? 'ok' : 'ng');
  }

  function giveUp() {
    if (state.answered) return;
    state.answered = true;
    state.stats.total++;
    state.stats.streak = 0;
    save();
    renderStats();
    $('askArea').classList.add('answered');
    renderResult('neutral');
  }

  function nextProblem() {
    state.problem = MJ.generateProblem(state.settings);
    state.input = '';
    state.answered = false;
    updateInput();
    $('askArea').classList.remove('answered');
    $('result').classList.add('hidden');
    renderProblem();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderStats() {
    $('statCorrect').textContent = state.stats.correct;
    $('statTotal').textContent = state.stats.total;
    $('statStreak').textContent = state.stats.streak;
  }

  function renderSettings() {
    ['difficulty', 'role'].forEach(function (name) {
      var buttons = $(name).querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute('aria-pressed', String(buttons[i].dataset.value === state.settings[name]));
      }
    });
  }

  // ---------------------------------------------------------------
  // 起動
  // ---------------------------------------------------------------
  function init() {
    load();
    renderSettings();
    renderStats();

    $('keypad').addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (btn) pressKey(btn.dataset.key);
    });
    $('submitBtn').addEventListener('click', submit);
    $('giveupBtn').addEventListener('click', giveUp);
    $('nextBtn').addEventListener('click', nextProblem);

    ['difficulty', 'role'].forEach(function (name) {
      $(name).addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        state.settings[name] = btn.dataset.value;
        save();
        renderSettings();
        nextProblem();
      });
    });

    $('resetStats').addEventListener('click', function () {
      state.stats = { total: 0, correct: 0, streak: 0, best: 0 };
      save();
      renderStats();
    });

    // パソコンのキーボードでも操作できるようにする
    document.addEventListener('keydown', function (e) {
      if (e.key >= '0' && e.key <= '9') pressKey(e.key);
      else if (e.key === 'Backspace') pressKey('del');
      else if (e.key === 'Enter') { state.answered ? nextProblem() : submit(); }
    });

    nextProblem();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
