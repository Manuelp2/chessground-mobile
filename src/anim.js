var util = require('./util');

// https://gist.github.com/gre/1650294
var easing = {
  easeInOutCubic: function(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }
};

function fixPieceElementsAfterAnimating(data) {
  if (data.animation.current) {
    var keys = Object.keys(data.animation.current.animating);
    for (var i = 0, len = keys.length; i < len; i++) {
      var p = data.animation.current.animating[keys[i]];
      if (p && data.minimalDom) p.style[util.transformProp()] = '';
      else if (p) p.removeAttribute('style');
    }
  }
  data.animation.current = {};
}

function makePiece(k, piece, invert) {
  var key = invert ? util.invertKey(k) : k;
  return {
    key: key,
    pos: util.key2pos(key),
    role: piece.role,
    color: piece.color
  };
}

function samePiece(p1, p2) {
  return p1.role === p2.role && p1.color === p2.color;
}

function closer(piece, pieces) {
  return pieces.sort(function(p1, p2) {
    return util.distance(piece.pos, p1.pos) - util.distance(piece.pos, p2.pos);
  })[0];
}

function computePlan(prev, current) {
  var bounds = current.bounds,
    width = bounds.width / 8,
    height = bounds.height / 8,
    anims = {},
    animedOrigs = [],
    fadings = {},
    missings = [],
    news = [],
    invert = prev.orientation !== current.orientation,
    prePieces = {},
    white = current.orientation === 'white';
  for (var pk in prev.pieces) {
    var piece = makePiece(pk, prev.pieces[pk], invert);
    prePieces[piece.key] = piece;
  }
  for (var i = 0; i < util.allKeys.length; i++) {
    var key = util.allKeys[i];
    if (key !== current.movable.dropped[1]) {
      var curP = current.pieces[key];
      var preP = prePieces[key];
      if (curP) {
        if (preP) {
          if (!samePiece(curP, preP)) {
            missings.push(preP);
            news.push(makePiece(key, curP, false));
          }
        } else
          news.push(makePiece(key, curP, false));
      } else if (preP)
        missings.push(preP);
    }
  }
  news.forEach(function(newP) {
    var nPreP = closer(newP, missings.filter(util.partial(samePiece, newP)));
    if (nPreP) {
      var orig = white ? nPreP.pos : newP.pos;
      var dest = white ? newP.pos : nPreP.pos;
      var vector = [(orig[0] - dest[0]) * width, (dest[1] - orig[1]) * height];
      anims[newP.key] = [vector, vector];
      animedOrigs.push(nPreP.key);
    }
  });
  missings.forEach(function(p) {
    if (p.key !== current.movable.dropped[0] && !util.containsX(animedOrigs, p.key)) {
      fadings[p.key] = {
        role: p.role,
        color: p.color
      };
    }
  });

  return {
    anims: anims,
    fadings: fadings
  };
}

function roundBy(n, by) {
  return Math.round(n * by) / by;
}

function go(data, running) {
  // animation was canceled
  if (!data.animation.current.start) {
    fixPieceElementsAfterAnimating(data);
    data.render();
    return;
  }
  var rest = 1 - (Date.now() - data.animation.current.start) / data.animation.current.duration;
  if (rest <= 0) {
    fixPieceElementsAfterAnimating(data);
    data.render();
  } else {
    // render once to have all pieces there
    if (!running) {
      data.render();
    }
    var ease = easing.easeInOutCubic(rest);
    var anims = data.animation.current.anims;
    var animsK = Object.keys(anims);
    for (var i = 0, len = animsK.length; i < len; i++) {
      var key = animsK[i];
      var cfg = anims[key];
      cfg[1] = [roundBy(cfg[0][0] * ease, 10), roundBy(cfg[0][1] * ease, 10)];
      var newPieceEl;
      if (data.animation.current.animating[key]) newPieceEl = data.animation.current.animating[key];
      else {
        var sel = data.minimalDom ? '.cg-piece.' + key : '.' + key + ' > .cg-piece';
        newPieceEl = data.element.querySelector(sel);
        data.animation.current.animating[key] = newPieceEl;
      }
      if (newPieceEl) {
        newPieceEl.style[util.transformProp()] = util.translate(cfg[1]);
      }
    }
    requestAnimationFrame(go.bind(undefined, data, true));
  }
}

function animate(transformation, data) {
  // clone data
  var prev = {
    orientation: data.orientation,
    pieces: {}
  };
  // clone pieces
  for (var key in data.pieces) {
    prev.pieces[key] = data.pieces[key];
  }
  var result = transformation();
  var plan = computePlan(prev, data);
  if (Object.keys(plan.anims).length > 0 || plan.fadings.length > 0) {
    var alreadyRunning = data.animation.current.start;
    if (alreadyRunning) fixPieceElementsAfterAnimating(data);
    data.animation.current = {
      start: Date.now(),
      duration: data.animation.duration,
      anims: plan.anims,
      fadings: plan.fadings,
      animating: {}
    };
    if (!alreadyRunning) requestAnimationFrame(go.bind(undefined, data, false));
  } else {
    // don't animate, just render right away
    data.renderRAF();
  }
  return result;
}

// transformation is a function
// accepts board data and any number of arguments,
// and mutates the board.
module.exports = function(transformation, data, skip) {
  return function() {
    var transformationArgs = [data].concat(Array.prototype.slice.call(arguments, 0));
    if (!data.render) return transformation.apply(null, transformationArgs);
    else if (data.animation.enabled && !skip)
      return animate(util.partialApply(transformation, transformationArgs), data);
    else {
      var result = transformation.apply(null, transformationArgs);
      data.renderRAF();
      return result;
    }
  };
};
