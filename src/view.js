var drag = require('./drag');
var util = require('./util');
var m = require('mithril');

function diffAndRenderBoard(ctrl) {
  var pieces = ctrl.data.pieces;
  var fadings = ctrl.data.animation.current.fadings;
  var key, piece, fading, pieceEl, squareEl, sqClass, anim;
  var anims = ctrl.data.animation.current.anims;
  for (var i = 0, len = util.allKeys.length; i < len; i++) {
    key = util.allKeys[i];
    piece = pieces[key];
    anim = anims && anims[key];
    fading = fadings && fadings[key];
    squareEl = ctrl.data.squareEls[key];
    sqClass = squareClass(ctrl, key, piece);

    // should not happen
    if (squareEl === undefined || squareEl === null) {
      console.log('Chessground: attempt to diff against unexisting square element ' + key);
      return;
    }

    // update highlights
    if (squareEl.className !== sqClass) squareEl.className = sqClass;

    // remove previous fading if any when animation is finished
    var fadingPieceEls = squareEl.getElementsByClassName('cg-piece fading');
    if (!fading) {
      while (fadingPieceEls[0]) squareEl.removeChild(fadingPieceEls[0]);
    }
    // there is a now piece at this square
    if (piece) {
      if (anim) {
        var animP = squareEl.getElementsByClassName('cg-piece').item(0);
        if (animP) animP.style[util.transformProp()] = util.translate(anim[1]);
      } else {
        var prevAnimP = squareEl.getElementsByClassName('cg-piece').item(0);
        if (prevAnimP) prevAnimP.removeAttribute('style');
      }
      // a piece was already there
      if (squareEl.firstChild) {
        // same piece same square: do nothing
        if (squareEl.firstChild.getAttribute('data-rolecolor') === piece.role + piece.color) {
          continue;
        } else {
          // different pieces: remove old piece and put new one
          pieceEl = renderPieceDom(renderPiece(ctrl, key, piece));
          squareEl.replaceChild(pieceEl, squareEl.firstChild);
          // during an animation we render a temporary 'fading' piece (the name
          // is wrong because it's not fading, it's juste here)
          // make sure there is no fading piece already (may happen with promotion)
          if (fading && !fadingPieceEls[0]) {
            squareEl.appendChild(renderCapturedDom(fading));
          }
        }
      } // empty square before: just put the piece
      else {
        pieceEl = renderPieceDom(renderPiece(ctrl, key, piece));
        squareEl.appendChild(pieceEl);
      }
    } // no piece at this square
    else {
      // remove any piece that was here
      while (squareEl.firstChild) squareEl.removeChild(squareEl.firstChild);
    }
  }
}

function pieceClass(p) {
  return ['cg-piece', p.role, p.color].join(' ');
}

function renderPiece(ctrl, key, p) {
  var attrs = {
    style: {},
    className: pieceClass(p),
    'data-rolecolor': p.role + p.color
  };
  var draggable = ctrl.data.draggable.current;
  if (draggable.orig === key && (draggable.pos[0] !== 0 || draggable.pos[1] !== 0)) {
    attrs.style[util.transformProp()] = util.translate([
      draggable.pos[0] + draggable.dec[0],
      draggable.pos[1] + draggable.dec[1]
    ]);
    attrs.className += ' dragging';
  } else if (ctrl.data.animation.current.anims) {
    var animation = ctrl.data.animation.current.anims[key];
    if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
  }
  return {
    tag: 'div',
    attrs: attrs
  };
}

function renderPieceDom(vdom) {
  var p = document.createElement('div');
  p.className = vdom.attrs.className;
  p.dataset.rolecolor = vdom.attrs['data-rolecolor'];
  p.style[util.transformProp()] = vdom.attrs.style[util.transformProp()];
  return p;
}

function renderCapturedDom(p) {
  var cap = document.createElement('div');
  cap.className = pieceClass(p) + ' fading';
  return cap;
}

function squareClass(ctrl, key, piece) {
  return 'cg-square ' + key + ' ' + util.classSet({
    'selected': ctrl.data.selected === key,
    'check': ctrl.data.highlight.check && ctrl.data.check === key,
    'last-move': ctrl.data.highlight.lastMove && util.contains2(ctrl.data.lastMove, key),
    'move-dest': ctrl.data.movable.showDests && util.containsX(ctrl.data.movable.dests[ctrl.data.selected], key),
    'premove-dest': ctrl.data.premovable.showDests && util.containsX(ctrl.data.premovable.dests, key),
    'current-premove': util.contains2(ctrl.data.premovable.current, key),
    'occupied': !!piece,
    'exploding': ctrl.vm.exploding && ctrl.vm.exploding.indexOf(key) !== -1
  });
}

function renderSquare(ctrl, pos, asWhite) {
  var file = util.files[pos[0] - 1];
  var rank = pos[1];
  var key = file + rank;
  var piece = ctrl.data.pieces[key];
  var bpos = util.boardpos(pos, asWhite);
  var attrs = {
    className: squareClass(ctrl, key, piece),
    style: {
      left: bpos.left + '%',
      bottom: bpos.bottom + '%'
    },
    config: function(el, isUpdate) {
      if (!isUpdate) {
        ctrl.data.squareEls[key] = el;
      }
    }
  };
  if (ctrl.data.coordinates) {
    if (pos[1] === (asWhite ? 1 : 8)) attrs['data-coord-x'] = file;
    if (pos[0] === (asWhite ? 8 : 1)) attrs['data-coord-y'] = rank;
  }
  var children = [];
  if (piece) {
    children.push(renderPiece(ctrl, key, piece));
  }
  return {
    tag: 'div',
    attrs: attrs,
    children: children
  };
}

function renderMinimalDom(ctrl, asWhite) {
  var children = [];
  if (ctrl.data.lastMove) ctrl.data.lastMove.forEach(function(key) {
    var pos = util.key2pos(key);
    var bpos = util.boardpos(pos, asWhite);
    children.push({
      tag: 'div',
      attrs: {
        className: 'cg-square last-move',
        style: {
          left: bpos.left + '%',
          bottom: bpos.bottom + '%'
        }
      }
    });
  });
  var piecesKeys = Object.keys(ctrl.data.pieces);
  for (var i = 0, len = piecesKeys.length; i < len; i++) {
    var key = piecesKeys[i];
    var pos = util.key2pos(key);
    var bpos = util.boardpos(pos, asWhite);
    var attrs = {
      style: {
        left: bpos.left + '%',
        bottom: bpos.bottom + '%'
      },
      className: pieceClass(ctrl.data.pieces[key])
    };
    children.push({
      tag: 'div',
      attrs: attrs
    });
  }

  return children;
}

function renderContent(ctrl) {
  var asWhite = ctrl.data.orientation === 'white';
  if (ctrl.data.minimalDom) return renderMinimalDom(ctrl, asWhite);
  var positions = asWhite ? util.allPos : util.invPos;
  var children = [];
  for (var i = 0, len = positions.length; i < len; i++) {
    children.push(renderSquare(ctrl, positions[i], asWhite));
  }
  return children;
}

function bindEvents(ctrl, el) {
  var onstart = drag.start.bind(undefined, ctrl.data);
  var onmove = drag.move.bind(undefined, ctrl.data);
  var onend = drag.end.bind(undefined, ctrl.data);
  var oncancel = drag.cancel.bind(undefined, ctrl.data);
  if (!ctrl.data.viewOnly) {
    el.addEventListener('touchstart', onstart);
    el.addEventListener('touchmove', onmove);
    el.addEventListener('touchend', onend);
    el.addEventListener('touchcancel', oncancel);
  }
}

function renderBoard(ctrl) {
  return {
    tag: 'div',
    attrs: {
      id: 'cg-board',
      className: [
        'cg-board orientation-' + ctrl.data.orientation,
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' '),
      config: function(el, isUpdate) {
        if (isUpdate) return;

        ctrl.data.scheduledAnimationFrame = false;

        ctrl.data.bounds = el.getBoundingClientRect();
        ctrl.data.element = el;
        ctrl.data.render = function() {
          ctrl.data.scheduledAnimationFrame = false;
          if (ctrl.data.minimalDom) {
            m.render(el, renderContent(ctrl));
          } else {
            if (ctrl.data.prevOrientation !== ctrl.data.orientation) {
              m.render(el, renderContent(ctrl), true);
              ctrl.data.prevOrientation = ctrl.data.orientation;
            } else {
              diffAndRenderBoard(ctrl);
            }
          }
        };
        ctrl.data.renderRAF = function() {
          if (!ctrl.data.scheduledAnimationFrame) {
            ctrl.data.scheduledAnimationFrame = requestAnimationFrame(ctrl.data.render);
          }
        };

        bindEvents(ctrl, el);

        ctrl.data.renderRAF();
      }
    },
    children: renderContent(ctrl)
  };
}

module.exports = renderBoard;
