var util = require('./util');

function squarePos(key, bounds, asWhite) {
  var pos = util.key2pos(key);
  var squareW = bounds.width * 0.125;
  var x = (asWhite ? pos[0] - 1 : 8 - pos[0]) * squareW;
  var y = (asWhite ? 8 - pos[1] : pos[1] - 1) * squareW;
  return {
    x: x,
    y: y,
    width: squareW,
    height: squareW
  };
}

function clearSquare(pos, ctx) {
  ctx.clearRect(pos.x, pos.y, pos.width, pos.height);
}

function drawSquare(pos, color, ctx) {
  ctx.fillStyle = color;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

function drawPossibleDest(pos, color, ctx) {
  ctx.fillStyle = color;
  var r = pos.width * 0.16;
  ctx.beginPath();
  ctx.arc(pos.x + pos.width / 2, pos.y + pos.width / 2, r, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();
}

function drawPossibleDestOccupied(pos, color, ctx) {
  var r = (pos.width / 2) * 1.15;
  var x = pos.x + pos.width / 2;
  var y = pos.y + pos.width / 2;
  var gradient = ctx.createRadialGradient(x, y, r, x, y, 0);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.01, 'transparent');
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

function drawCheck(pos, color, ctx) {
  var r1 = pos.width * 0.75;
  var r2 = 0;
  var x = pos.x + pos.width / 2;
  var y = pos.y + pos.width / 2;
  var gradient = ctx.createRadialGradient(x, y, r1, x, y, r2);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(pos.x, pos.y, pos.width, pos.height);
}

module.exports = {
  squarePos: squarePos,
  clearSquare,
  drawSquare,
  drawPossibleDest,
  drawPossibleDestOccupied,
  drawCheck
};
