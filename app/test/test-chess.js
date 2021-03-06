require('jsdom-global')();
const assert = require('assert');
const domify = require('domify');

const {
  parseAlgebraic,
  parseFromTo,
  getLegalMoves,
  makePromotionMove,
} = require('../src/chess');

describe('parseAlgebraic', function() {
  it('parses short algebraic moves', function() {
    assert.deepEqual(parseAlgebraic('Rd2'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses pawn moves', function() {
    assert.deepEqual(parseAlgebraic('d2'), {
      piece: 'p',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses full moves', function() {
    assert.deepEqual(parseAlgebraic('Re2d2'), {
      piece: 'r',
      from: 'e2',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses pawn captures', function() {
    assert.deepEqual(parseAlgebraic('exd3'), {
      piece: 'p',
      from: 'e.',
      to: 'd3',
      moveType: 'capture',
    });

    // en passant
    assert.deepEqual(parseAlgebraic('exd3e.p.'), {
      piece: 'p',
      from: 'e.',
      to: 'd3',
      moveType: 'capture',
    });
  });

  it('parses piece captures', function() {
    assert.deepEqual(parseAlgebraic('Rxd2'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('parses full piece captures', function() {
    assert.deepEqual(parseAlgebraic('Re2xd2'), {
      piece: 'r',
      from: 'e2',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('parses partial disambiguation', function() {
    assert.deepEqual(parseAlgebraic('R2xd2'), {
      piece: 'r',
      from: '.2',
      to: 'd2',
      moveType: 'capture',
    });

    assert.deepEqual(parseAlgebraic('Rexd2'), {
      piece: 'r',
      from: 'e.',
      to: 'd2',
      moveType: 'capture',
    });
  });

  it('allows to mark a check', function() {
    assert.deepEqual(parseAlgebraic('Rd2+'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('allows to mark a mate', function() {
    assert.deepEqual(parseAlgebraic('Rd2#'), {
      piece: 'r',
      from: '..',
      to: 'd2',
      moveType: 'move',
    });
  });

  it('parses castling', function() {
    assert.deepEqual(parseAlgebraic('o-o'), {
      piece: 'k',
      moveType: 'short-castling',
    });

    assert.deepEqual(parseAlgebraic('0-0'), {
      piece: 'k',
      moveType: 'short-castling',
    });

    assert.deepEqual(parseAlgebraic('ooo'), {
      piece: 'k',
      moveType: 'long-castling',
    });

    assert.deepEqual(parseAlgebraic('0-0-0'), {
      piece: 'k',
      moveType: 'long-castling',
    });
  });

  it('ignores not-existing pieces and squares', function() {
    assert.strictEqual(parseAlgebraic('Xd2'), null);
  });

  it('parses pawn promotion', function() {
    assert.deepEqual(parseAlgebraic('d8=Q'), {
      piece: 'p',
      from: '..',
      to: 'd8',
      moveType: 'move',
      promotionPiece: 'q',
    });
  });

  it('ignores promotion for pieces', function() {
    assert.deepEqual(parseAlgebraic('Nd8=Q'), {
      piece: 'n',
      from: '..',
      to: 'd8',
      moveType: 'move',
    });
  });
});

describe('parseFromTo', function() {
  it('parses short algebraic moves', function() {
    assert.deepEqual(parseFromTo('e2e4'), {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
  });

  it('ignores non-existing squares', function() {
    assert.strictEqual(parseFromTo('x2e4'), null);
  });

  it('ignores other formats', function() {
    assert.strictEqual(parseFromTo('♞f3'), null);
  });
});

describe('getLegalMoves', function() {
  const getChessBoardWithPieces = (input) => {
    const pieces = {};

    input.forEach((p, i) => {
      pieces[i] = p;
    });

    return {
      isLegalMove: () => true,
      isPlayersMove: () => true,
      getPiecesSetup: () => pieces,
    };
  };

  it('returns from and to if these are explicitly specified', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result = getLegalMoves(board, {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4']]);
  });

  it('handles partial matches', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result = getLegalMoves(board, {
      piece: '.',
      from: '.2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4']]);
  });

  it('ignores ambiguous results', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'e2'},
      {color: 2, type: 'p', area: 'c2'},
    ]);

    const result = getLegalMoves(board, {
      piece: '.',
      from: '.2',
      to: 'e4',
      moveType: 'move',
    });

    assert.deepEqual(result, [['e2', 'e4'], ['c2', 'e4']]);
  });

  it('returns empty if there are no matching pieces', function() {
    const board1 = getChessBoardWithPieces([
      // no pieces on 'from' spot
      {color: 2, type: 'p', area: 'c2'},
    ]);
    const result1 = getLegalMoves(board1, {
      piece: '.',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
    assert.deepEqual(result1, []);

    const board2 = getChessBoardWithPieces([
      // piece of a different type
      {color: 2, type: 'p', area: 'e2'},
    ]);
    const result2 = getLegalMoves(board2, {
      piece: 'r',
      from: 'e2',
      to: 'e4',
      moveType: 'move',
    });
    assert.deepEqual(result2, []);
  });

  it('doesnt fail if input is falsy', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'c2'},
    ]);
    assert.doesNotThrow(() => getLegalMoves(board, null));
  });

  it('returns correct move for short castling', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'k', area: 'e1'},
      {color: 2, type: 'r', area: 'h1'},
    ]);
    board.gameRules = {
      isLegalMove: (_1, fromSq, toSq) => {
        return fromSq === 'e1' && toSq === 'g1';
      },
    };
    const result = getLegalMoves(board, {
      piece: 'k',
      from: 'e2',
      to: 'g1',
      moveType: 'short-castling',
    });
    assert.deepEqual(result, [['e1', 'g1']]);
  });

  it('returns correct move for long castling', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'k', area: 'e1'},
      {color: 2, type: 'r', area: 'a1'},
    ]);
    board.gameRules = {
      isLegalMove: (_1, fromSq, toSq) => {
        return fromSq === 'e1' && toSq === 'c1';
      },
    };
    const result = getLegalMoves(board, {
      piece: 'k',
      from: 'e2',
      to: 'g1',
      moveType: 'long-castling',
    });
    assert.deepEqual(result, [['e1', 'c1']]);
  });

  it('returns promotion piece as last param', function() {
    const board = getChessBoardWithPieces([
      {color: 2, type: 'p', area: 'd7'},
    ]);
    const result = getLegalMoves(board, {
      piece: 'p',
      from: '..',
      to: 'd8',
      moveType: 'move',
      promotionPiece: 'q',
    });
    assert.deepEqual(result, [['d7', 'd8', 'q']]);
  });
});

describe('makePromotionMove', function() {
  beforeEach(function() {
    this.promotionArea = domify(`
      <div class="promotion-area">
        <img piece="q" id="divBoard_promotionq">
        <img piece="r" id="divBoard_promotionr">
        <img piece="n" id="divBoard_promotionn">
        <img piece="b" id="divBoard_promotionb">
      </div>
    `);

    document.body.appendChild(this.promotionArea);
  });

  afterEach(function() {
    this.promotionArea.parentNode.removeChild(this.promotionArea);
  });

  it('hides promotion window', function() {
    assert.equal(false, !!document.querySelector('#chessHelper__hidePromotionArea'));
    makePromotionMove('q');
    assert.equal(true, !!document.querySelector('#chessHelper__hidePromotionArea'));
  });

  it('shows promotion window in 100ms', function(done) {
    makePromotionMove('q');
    setTimeout(function() {
      assert.equal(false, !!document.querySelector('#chessHelper__hidePromotionArea'));
      done();
    }, 100);
  });

  it('clicks element with required piece type (async)', function(done) {
    const n = this.promotionArea.querySelector('#divBoard_promotionn');
    const r = this.promotionArea.querySelector('#divBoard_promotionr');
    const q = this.promotionArea.querySelector('#divBoard_promotionq');
    const b = this.promotionArea.querySelector('#divBoard_promotionb');

    const clicks = {n: 0, r: 0, b: 0, q: 0};

    n.click = () => clicks.n++;
    r.click = () => clicks.r++;
    q.click = () => clicks.q++;
    b.click = () => clicks.b++;

    makePromotionMove('n');
    setTimeout(function() {
      assert.deepEqual(clicks, {n: 1, r: 0, b: 0, q: 0});
      makePromotionMove('q');
    }, 100);

    setTimeout(function() {
      assert.deepEqual(clicks, {n: 1, r: 0, b: 0, q: 1});
      makePromotionMove('b');
    }, 200);

    setTimeout(function() {
      assert.deepEqual(clicks, {n: 1, r: 0, b: 1, q: 1});
      makePromotionMove('r');
    }, 300);

    setTimeout(function() {
      assert.deepEqual(clicks, {n: 1, r: 1, b: 1, q: 1});
      done();
    }, 400);
  });

  it('doesnt click elements if area is not visible', function(done) {
    let clicked = false;

    this.promotionArea.style.display = 'none';

    const q = this.promotionArea.querySelector('#divBoard_promotionq');
    q.click = () => clicked = true;

    makePromotionMove('q');

    setTimeout(() => {
      assert.equal(clicked, false);
      done();
    }, 150);
  });
});
