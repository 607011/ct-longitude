// Copyright (c) 2013 Oliver Lau <ola@ct.de>, Heise Zeitschriften Verlag
// All rights reserved.

(function () {
  "use strict";
  var timerId;
  if (typeof window.requestAnimationFrame !== 'function')
    window.requestAnimationFrame = (function () {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) { timerId = window.setTimeout(callback, 1000 / 60); };
    })();

  if (typeof window.cancelAnimationFrame !== 'function')
    window.cancelAnimationFrame = (function () {
      return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function () { window.clearTimeout(timerId); };
    })();
})();


var Rect = function (x0, y0, x1, y1) {
  this.x0 = x0;
  this.y0 = y0;
  this.x1 = x1;
  this.y1 = y1;
};
Rect.prototype.left = function () {
  return this.x0;
};
Rect.prototype.top = function () {
  return this.y0;
};
Rect.prototype.right = function () {
  return this.x1;
};
Rect.prototype.bottom = function () {
  return this.y1;
};
Rect.prototype.width = function () {
  return this.x1 - this.x0;
};
Rect.prototype.height = function () {
  return this.y1 - this.y0;
};
Rect.prototype.slices = function () {
  var w = this.width(), h = this.height(), w2, h2;
  if (w >= h) {
    w2 = w / 2;
    return [new Rect(this.x0, this.y0, this.x1 - w2, this.y1), new Rect(this.x0 + w2, this.y0, this.x1, this.y1)];
  }
  else {
    h2 = h / 2;
    return [new Rect(this.x0, this.y0, this.x1, this.y1 - h2), new Rect(this.x0, this.y0 + h2, this.x1, this.y1)];
  }
};
Rect.prototype.partitioned = function (numTiles) {
  var partitions = [],
    makeTree = function (lo, hi, rect) {
      var mid, slices;
      if (lo > hi) {
        partitions.push(rect);
        return;
      }
      mid = ((lo + hi) / 2) >> 0;
      slices = rect.slices();
      makeTree(lo, mid - 1, slices[0]);
      makeTree(mid + 1, hi, slices[1]);
    }
  makeTree(0, numTiles - 2, this);
  return partitions;
}


function haversineDistance(latLng1, latLng2) {
  var latd = 0.5 * deg2rad(latLng2.lat() - latLng1.lat()),
    lond = 0.5 * deg2rad(latLng2.lng() - latLng1.lng()),
    a = Math.sin(latd) * Math.sin(latd) + Math.cos(deg2rad(latLng1.lat())) * Math.cos(deg2rad(latLng2.lat())) * Math.sin(lond) * Math.sin(lond),
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 1000 * 6371.0 * c;
}
