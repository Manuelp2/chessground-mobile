var drag = require('./drag');
var util = require('./util');
var svg = require('./svg');
var m = require('mithril');

function pieceClass(p) {
  return ['cg-piece', p.role, p.color].join(' ');
}

function renderPiece(ctrl, key, p) {
  var attrs = {
    style: {},
    class: pieceClass(p)
  };
  var draggable = ctrl.data.draggable.current;
  if (draggable.orig === key && (draggable.pos[0] !== 0 || draggable.pos[1] !== 0)) {
    attrs.style[util.transformProp()] = util.translate([
      draggable.pos[0] + draggable.dec[0],
      draggable.pos[1] + draggable.dec[1]
    ]);
    attrs.class += ' dragging';
  } else if (ctrl.data.animation.current.anims) {
    var animation = ctrl.data.animation.current.anims[key];
    if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
  }
  return {
    tag: 'div',
    attrs: attrs
  };
}

function renderGhost(p) {
  return {
    tag: 'div',
    attrs: {
      class: pieceClass(p) + ' ghost'
    }
  };
}

function renderSquare(ctrl, pos, asWhite) {
  var file = util.files[pos[0] - 1];
  var rank = pos[1];
  var key = file + rank;
  var piece = ctrl.data.pieces[key];
  var isDragOver = ctrl.data.highlight.dragOver && ctrl.data.draggable.current.over === key;
  var bpos = util.boardpos(pos, asWhite);
  var attrs = {
    class: 'cg-square ' + key + ' ' + util.classSet({
      'selected': ctrl.data.selected === key,
      'check': ctrl.data.highlight.check && ctrl.data.check === key,
      'last-move': ctrl.data.highlight.lastMove && util.contains2(ctrl.data.lastMove, key),
      'move-dest': (isDragOver || ctrl.data.movable.showDests) && util.containsX(ctrl.data.movable.dests[ctrl.data.selected], key),
      'premove-dest': (isDragOver || ctrl.data.premovable.showDests) && util.containsX(ctrl.data.premovable.dests, key),
      'current-premove': util.contains2(ctrl.data.premovable.current, key),
      'drag-over': isDragOver,
      'occupied': !!piece,
      'exploding': ctrl.vm.exploding && ctrl.vm.exploding.indexOf(key) !== -1
    }),
    style: {
      left: bpos.left + '%',
      bottom: bpos.bottom + '%'
    }
  };
  if (ctrl.data.coordinates) {
    if (pos[1] === (asWhite ? 1 : 8)) attrs['data-coord-x'] = file;
    if (pos[0] === (asWhite ? 8 : 1)) attrs['data-coord-y'] = rank;
  }
  var children = [];
  if (piece) {
    children.push(renderPiece(ctrl, key, piece));
    if (ctrl.data.draggable.current.orig === key && ctrl.data.draggable.showGhost) {
      children.push(renderGhost(piece));
    }
  }
  return {
    tag: 'div',
    attrs: attrs,
    children: children
  };
}

function renderSquareTarget(ctrl, cur) {
  var pos = util.key2pos(cur.over),
    width = cur.bounds.width,
    targetWidth = width / 4,
    squareWidth = width / 8,
    asWhite = ctrl.data.orientation === 'white';
  var style = {
    width: targetWidth + 'px',
    height: targetWidth + 'px',
    left: (-0.5 * squareWidth) + 'px',
    top: (-0.5 * squareWidth) + 'px'
  };
  var vector = [
    (asWhite ? pos[0] - 1 : 8 - pos[0]) * squareWidth,
    (asWhite ? 8 - pos[1] : pos[1] - 1) * squareWidth
  ];
  style[util.transformProp()] = util.translate(vector);
  return {
    tag: 'div',
    attrs: {
      id: 'cg-square-target',
      style: style
    }
  };
}

function renderFading(cfg) {
  return {
    tag: 'div',
    attrs: {
      class: 'cg-square fading',
      style: {
        left: cfg.left,
        bottom: cfg.bottom,
        opacity: cfg.opacity
      }
    },
    children: [{
      tag: 'div',
      attrs: {
        class: pieceClass(cfg.piece)
      }
    }]
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
        class: 'cg-square last-move',
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
      class: pieceClass(ctrl.data.pieces[key]) + ' ' + key
    };
    if (ctrl.data.animation.current.anims) {
      var animation = ctrl.data.animation.current.anims[key];
      if (animation) attrs.style[util.transformProp()] = util.translate(animation[1]);
    }
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
  if (ctrl.data.draggable.current.over && ctrl.data.draggable.squareTarget)
    children.push(renderSquareTarget(ctrl, ctrl.data.draggable.current));
  if (ctrl.data.animation.current.fadings)
    ctrl.data.animation.current.fadings.forEach(function(p) {
      children.push(renderFading(p));
    });
  if (ctrl.data.drawable.enabled) children.push(svg(ctrl));
  return children;
}

function bindEvents(ctrl, el, context) {
  var onstart = drag.start.bind(undefined, ctrl.data);
  var onmove = drag.move.bind(undefined, ctrl.data);
  var onend = drag.end.bind(undefined, ctrl.data);
  var oncancel = drag.cancel.bind(undefined, ctrl.data);
  var startEvents = ['touchstart', 'mousedown'];
  var moveEvents = ['touchmove', 'mousemove'];
  var endEvents = ['touchend', 'mouseup'];
  startEvents.forEach(function(ev) {
    el.addEventListener(ev, onstart);
  });
  moveEvents.forEach(function(ev) {
    document.addEventListener(ev, onmove);
  });
  endEvents.forEach(function(ev) {
    document.addEventListener(ev, onend);
  });
  document.addEventListener('touchcancel', oncancel);
  context.onunload = function() {
    startEvents.forEach(function(ev) {
      el.removeEventListener(ev, onstart);
    });
    moveEvents.forEach(function(ev) {
      document.removeEventListener(ev, onmove);
    });
    endEvents.forEach(function(ev) {
      document.removeEventListener(ev, onend);
    });
    document.removeEventListener('touchcancel', oncancel);
  };
}

function renderBoard(ctrl) {
  return {
    tag: 'div',
    attrs: {
      class: 'cg-board orientation-' + ctrl.data.orientation,
      config: function(el, isUpdate, context) {
        if (isUpdate) return;
        if (!ctrl.data.viewOnly || ctrl.data.drawable.enabled)
          bindEvents(ctrl, el, context);
        // this function only repaints the board itself.
        // it's called when dragging or animating pieces,
        // to prevent the full application embedding chessground
        // rendering on every animation frame
        ctrl.data.render = function() {
          m.render(el, renderContent(ctrl));
        };
        ctrl.data.renderRAF = function() {
          util.requestAnimationFrame(ctrl.data.render);
        };
        ctrl.data.bounds = el.getBoundingClientRect();
        ctrl.data.element = el;
        ctrl.data.render();
        var onresize = function() {
          ctrl.data.bounds = el.getBoundingClientRect();
        };
        // intended for mobile only since resize calls are not debounced
        window.addEventListener('resize', onresize);
        context.onunload = function() {
          window.removeEventListener('resize', onresize);
        };
      }
    },
    children: []
  };
}

module.exports = function(ctrl) {
  return {
    tag: 'div',
    attrs: {
      config: function(el, isUpdate) {
        if (!isUpdate) el.addEventListener('contextmenu', function(e) {
          if (ctrl.data.disableContextMenu || ctrl.data.drawable.enabled) {
            e.preventDefault();
            return false;
          }
        });
      },
      class: [
        'cg-board-wrap',
        ctrl.data.viewOnly ? 'view-only' : 'manipulable',
        ctrl.data.minimalDom ? 'minimal-dom' : 'full-dom'
      ].join(' ')
    },
    children: [renderBoard(ctrl)]
  };
};
