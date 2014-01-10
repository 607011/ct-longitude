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
Rect.prototype.left = function () { return this.x0; };
Rect.prototype.top = function () { return this.y0; };
Rect.prototype.right = function () { return this.x1; };
Rect.prototype.bottom = function () { return this.y1; };
Rect.prototype.width = function () { return this.x1 - this.x0; };
Rect.prototype.height = function () { return this.y1 - this.y0; };
Rect.prototype.slices = function () {
  var w = this.width(), h = this.height(), w2, h2;
  if (w >= h) {
    w2 = w / 2;
    return [new Rect(this.x0 + w2, this.y0, this.x1, this.y1), new Rect(this.x0, this.y0, this.x1 - w2, this.y1)];
  }
  else {
    h2 = h / 2;
    return [new Rect(this.x0, this.y0 + h2, this.x1, this.y1), new Rect(this.x0, this.y0, this.x1, this.y1 - h2)];
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
      makeTree(lo, mid - 1, slices[1]);
      makeTree(mid + 1, hi, slices[0]);
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



/** Image Downscaler (c) GameAlchemist, http://stackoverflow.com/users/856501/gamealchemist */

// scales the image by (float) scale < 1
// returns a canvas containing the scaled image.
function downScaleImage(img, scale) {
  var imgCV = document.createElement('canvas'), imgCtx = imgCV.getContext('2d');
  imgCV.width = img.width;
  imgCV.height = img.height;
  imgCtx.drawImage(img, 0, 0);
  return downScaleCanvas(imgCV, scale);
}


// scales the canvas by (float) scale < 1
// returns a new canvas containing the scaled image.
function downScaleCanvas(cv, scale) {
  if (!(scale < 1) || !(scale > 0)) throw ('scale must be a positive number <1 ');
  var sqScale = scale * scale; // square scale = area of source pixel within target
  var sw = cv.width; // source image width
  var sh = cv.height; // source image height
  var tw = Math.ceil(sw * scale); // target image width
  var th = Math.ceil(sh * scale); // target image height
  var sx = 0, sy = 0, sIndex = 0; // source x,y, index within source array
  var tx = 0, ty = 0, yIndex = 0, tIndex = 0; // target x,y, x,y index within target array
  var tX = 0, tY = 0; // rounded tx, ty
  var w = 0, nw = 0, wx = 0, nwx = 0, wy = 0, nwy = 0; // weight / next weight x / y
  // weight is weight of current source point within target.
  // next weight is weight of current source point within next target's point.
  var crossX = false; // does scaled px cross its current px right border ?
  var crossY = false; // does scaled px cross its current px bottom border ?
  var sBuffer = cv.getContext('2d').
  getImageData(0, 0, sw, sh).data; // source buffer 8 bit rgba
  var tBuffer = new Float32Array(3 * sw * sh); // target buffer Float32 rgb
  var sR = 0, sG = 0, sB = 0; // source's current point r,g,b
  /* untested !
  var sA = 0;  //source alpha  */

  for (sy = 0; sy < sh; sy++) {
    ty = sy * scale; // y src position within target
    tY = 0 | ty;     // rounded : target pixel's y
    yIndex = 3 * tY * tw;  // line index within target array
    crossY = (tY != (0 | ty + scale));
    if (crossY) { // if pixel is crossing botton target pixel
      wy = (tY + 1 - ty); // weight of point within target pixel
      nwy = (ty + scale - tY - 1); // ... within y+1 target pixel
    }
    for (sx = 0; sx < sw; sx++, sIndex += 4) {
      tx = sx * scale; // x src position within target
      tX = 0 | tx;    // rounded : target pixel's x
      tIndex = yIndex + tX * 3; // target pixel index within target array
      crossX = (tX != (0 | tx + scale));
      if (crossX) { // if pixel is crossing target pixel's right
        wx = (tX + 1 - tx); // weight of point within target pixel
        nwx = (tx + scale - tX - 1); // ... within x+1 target pixel
      }
      sR = sBuffer[sIndex];   // retrieving r,g,b for curr src px.
      sG = sBuffer[sIndex + 1];
      sB = sBuffer[sIndex + 2];

      /* !! untested : handling alpha !!
         sA = sBuffer[sIndex + 3];
         if (!sA) continue;
         if (sA != 0xFF) {
             sR = (sR * sA) >> 8;  // or use /256 instead ??
             sG = (sG * sA) >> 8;
             sB = (sB * sA) >> 8;
         }
      */
      if (!crossX && !crossY) { // pixel does not cross
        // just add components weighted by squared scale.
        tBuffer[tIndex] += sR * sqScale;
        tBuffer[tIndex + 1] += sG * sqScale;
        tBuffer[tIndex + 2] += sB * sqScale;
      } else if (crossX && !crossY) { // cross on X only
        w = wx * scale;
        // add weighted component for current px
        tBuffer[tIndex] += sR * w;
        tBuffer[tIndex + 1] += sG * w;
        tBuffer[tIndex + 2] += sB * w;
        // add weighted component for next (tX+1) px                
        nw = nwx * scale
        tBuffer[tIndex + 3] += sR * nw;
        tBuffer[tIndex + 4] += sG * nw;
        tBuffer[tIndex + 5] += sB * nw;
      } else if (crossY && !crossX) { // cross on Y only
        w = wy * scale;
        // add weighted component for current px
        tBuffer[tIndex] += sR * w;
        tBuffer[tIndex + 1] += sG * w;
        tBuffer[tIndex + 2] += sB * w;
        // add weighted component for next (tY+1) px                
        nw = nwy * scale
        tBuffer[tIndex + 3 * tw] += sR * nw;
        tBuffer[tIndex + 3 * tw + 1] += sG * nw;
        tBuffer[tIndex + 3 * tw + 2] += sB * nw;
      } else { // crosses both x and y : four target points involved
        // add weighted component for current px
        w = wx * wy;
        tBuffer[tIndex] += sR * w;
        tBuffer[tIndex + 1] += sG * w;
        tBuffer[tIndex + 2] += sB * w;
        // for tX + 1; tY px
        nw = nwx * wy;
        tBuffer[tIndex + 3] += sR * nw;
        tBuffer[tIndex + 4] += sG * nw;
        tBuffer[tIndex + 5] += sB * nw;
        // for tX ; tY + 1 px
        nw = wx * nwy;
        tBuffer[tIndex + 3 * tw] += sR * nw;
        tBuffer[tIndex + 3 * tw + 1] += sG * nw;
        tBuffer[tIndex + 3 * tw + 2] += sB * nw;
        // for tX + 1 ; tY +1 px
        nw = nwx * nwy;
        tBuffer[tIndex + 3 * tw + 3] += sR * nw;
        tBuffer[tIndex + 3 * tw + 4] += sG * nw;
        tBuffer[tIndex + 3 * tw + 5] += sB * nw;
      }
    } // end for sx 
  } // end for sy

  // create result canvas
  var resCV = document.createElement('canvas');
  resCV.width = tw;
  resCV.height = th;
  var resCtx = resCV.getContext('2d');
  var imgRes = resCtx.getImageData(0, 0, tw, th);
  var tByteBuffer = imgRes.data;
  // convert float32 array into a UInt8Clamped Array
  var pxIndex = 0; //  
  for (sIndex = 0, tIndex = 0; pxIndex < tw * th; sIndex += 3, tIndex += 4, pxIndex++) {
    tByteBuffer[tIndex] = Math.ceil(tBuffer[sIndex]);
    tByteBuffer[tIndex + 1] = Math.ceil(tBuffer[sIndex + 1]);
    tByteBuffer[tIndex + 2] = Math.ceil(tBuffer[sIndex + 2]);
    tByteBuffer[tIndex + 3] = 255;
  }
  // writing result to canvas.
  resCtx.putImageData(imgRes, 0, 0);
  return resCV;
}
