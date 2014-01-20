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


Math.sqr = function (x) { return x*x; };


/* Taken from jQuery Easing v1.3 - Copyright 2008 George McGinley Smith - http://gsgd.co.uk/sandbox/jquery/easing/ */
jQuery.extend(jQuery.easing, {
  easeInOutCubic: function (x, t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t + 2) + b;
  }
});


jQuery.fn.enableHorizontalSlider = function () {
  "use strict";
  var el = this, t0, x0, mouseX0, dx, mouseDown = false, animId = null,
    mousedown = function (e) {
      mouseX0 = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.changedTouches[0];
      mouseDown = true;
      t0 = Date.now();
      x0 = el.position().left;
      $(document).bind('selectstart', function () { return false; });
      if (animId) {
        cancelAnimationFrame(animId);
        // TODO
      }
    },
    mousemove = function (e) {
      var oversize, xoff,
        clientX = e.clientX || e.originalEvent.touches[0].clientX || e.originalEvent.changedTouches[0];
      if (mouseDown) {
        oversize = el.width() - el.parent().width();
        dx = clientX - mouseX0;
        xoff = Math.min(dx + x0, 0);
        if (oversize > 0) {
          xoff = Math.max(el.parent().width() - el.width(), xoff);
          el.css('left', xoff + 'px');
        }
      }
    },
    mouseup = function (e) {
      var dt = Date.now() - t0, pixelsPerSec = dx / dt * 1000,
        duration, elapsed, animStart = null,
        /* t is the current time (or position) of the tween. This can be seconds or frames, steps, seconds, ms, whatever – as long as the unit is the same as is used for the total time [3].
           b is the beginning value of the property.
           c is the change between the beginning and destination value of the property.
           d is the total time of the tween. */
        easeInOutBack = function (t, b, c, d, s) {
          if (typeof s === 'undefined') s = 1.70158;
          if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
          return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
        },
        easing = easeInOutBack,
        val0, dVal, tweenTime,
        update = function (timestamp) {
          var ms;
          if (animStart === null)
            animStart = timestamp;
          ms = timestamp - animStart;
          elapsed += ms;
          // console.log(ms, easeInOutBack(elapsed, 0, 100, duration));
          if (elapsed < duration)
            requestAnimationFrame(update);
          else
            animStart = null;
        };
      mouseDown = false;
      if (Math.abs(pixelsPerSec) > 0) {
        elapsed = 0;
        duration = Math.abs((dt / dx * 1000) >> 0);
        requestAnimationFrame(update);
      }
      $(document).unbind('selectstart');
    },
    mouseout = function () {
      mouseDown = false;
    };
  el.css('position', 'relative').parent().css('overflow', 'hidden');
  $(window).resize(function () {
    var oversize = el.parent().width() - el.width();
    if (oversize > el.position().left && el.position().left < 0)
      el.css('left', Math.min(0, oversize) + 'px');
  });
  if (navigator.userAgent.indexOf('Mobile') >= 0) {
    this.bind({
      touchstart: mousedown,
      touchmove: mousemove,
      touchend: mouseout,
      touchcancel: mouseup
    });
  }
  else {
    this.bind({
      mousedown: mousedown,
      mousemove: mousemove,
      mouseup: mouseup,
      mouseout: mouseout
    });
  }
  return this;
};



var Location = function (timestamp, lat, lng, altitude) {
  this.timestamp = timestamp;
  this.lat = lat;
  this.lng = lng;
  this.altitude = altitude;
}
Location.prototype.toLatLng = function () {
  return new google.maps.LatLng(this.lat, this.lng);
};

var Track = function () {
  this.path = [];
  this.name = null;
};
Track.Colors = ['#c700b6', '#c77400', '#00c711', '#0053c7'];
Track.DrawMode = { Polyline: 1, Dots: 2 };
Track.prototype.addLocation = function (location) {
  this.path.push(location);
};
Track.prototype.setName = function (name) {
  this.name = name;
};
Track.prototype.draw = function (map, options) {
  options = options || {};
  switch (options.drawMode) {
    default:
      // fall-through
    case Track.DrawMode.Polyline:
      break;
    case Track.DrawMode.Dots:
      break;
  }
}



var GPXParser = function (opts) {
  "use strict";
  this.opts = opts || {};
  this.xml = null;
  this.tracks = [];
  this.currentTrack = null;
  this.successCallback = this.opts.success ? this.opts.success : function () { console.warning('GPXParser: You should define a callback with GPX.done().'); };
  this.errorCallback = this.opts.error ? this.opts.error : function () { console.warning('GPXParser: You should define a callback with GPX.error().'); };
};
GPXParser.prototype.parse = function (xmlDoc) {
  var parser, tracks, name, reader, i;
  if (typeof xmlDoc === 'string') {
    if (window.DOMParser) {
      parser = new DOMParser();
      this.xml = parser.parseFromString(xmlDoc, 'text/xml');
    }
    else { // Internet Explorer
      this.xml = new ActiveXObject('Microsoft.XMLDOM');
      this.xml.async = false;
      this.xml.loadXML(xmlDoc);
    }
    if (this.xml !== null) {
      tracks = this.xml.documentElement.getElementsByTagName('trk'), i;
      for (i = 0; i < tracks.length; ++i)
        this.addTrack(tracks[i]);
    }
    this.successCallback(this);
  }
  else if (xmlDoc instanceof File) {
    reader = new FileReader();
    reader.onload = function (e) {
      if (e.target.readyState === FileReader.DONE) {
        this.parse(e.target.result);
      }
    }.bind(this);
    reader.onerror = function (e) {
      switch (e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
          this.errorCallback({ error: 'XML-Datei nicht gefunden.' });
          break;
        case e.target.error.NOT_READABLE_ERR:
          this.errorCallback({ error: 'XML-Datei ist nicht lesbar.' });
          break;
        case e.target.error.ABORT_ERR:
          console.warn('Lesen der XML-Datei abgebrochen.');
          break;
        default:
          this.errorCallback({ error: 'Beim Zugriff auf die XML-Datei ist ein Fehler aufgetreten.' });
          break;
      }
    }.bind(this);
    reader.onabort = function () {
      console.error('Lesen der Datei abgebrochen.');
    }.bind(this);
    reader.readAsText(xmlDoc);
  }
  else {
    this.errorCallback({ error: 'Ungültiger Parameter für GPXParser.parse()' });
    return null;
  }
  return this;
};
GPXParser.prototype.addTrack = function (trackEl) {
  var i, segments = trackEl.getElementsByTagName('trkseg'),
    name = trackEl.getElementsByTagName('name');
  if (segments.length > 0) {
    this.currentTrack = new Track();
    if (name.length > 0)
      this.currentTrack.setName(name[0].textContent);
    for (i = 0; i < segments.length; ++i)
      this.addTrackSegment(segments[i]);
  }
};
GPXParser.prototype.addTrackSegment = function (track) {
  var trackpoints = track.getElementsByTagName('trkpt'), i, trkpt, altitude, timestamp, ele;
  for (i = 0; i < trackpoints.length; ++i) {
    trkpt = trackpoints[i];
    ele = trkpt.getElementsByTagName('ele');
    t = trkpt.getElementsByTagName('time');
    altitude = (ele.length > 0) ? Math.round(parseFloat(ele[0].textContent)) : undefined;
    timestamp = (t.length > 0) ? Math.floor(Date.parse(t[0].textContent) / 1000) : undefined;
    if (!!timestamp) {
      this.currentTrack.addLocation(
        new Location(timestamp,
        parseFloat(trkpt.getAttribute('lat')),
        parseFloat(trkpt.getAttribute('lon')),
        altitude)
      );
    }
    else {
      this.errorCallback({ error: 'Fehlende(r) Zeitstempel.' });
      return;
    }
  }
  if (trackpoints.length > 0)
    this.tracks.push(this.currentTrack);
};
GPXParser.prototype.getTrack = function () {
  return this.tracks;
};
GPXParser.prototype.done = function (successCallback) {
  this.successCallback = successCallback;
  return this;
};
GPXParser.prototype.error = function (errorCallback) {
  this.errorCallback = errorCallback;
  return this;
};

function GPX(xmlDoc) {
  return new GPXParser(xmlDoc);
}


var Rect = function (x0, y0, x1, y1) {
  "use strict";
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
    };
  makeTree(0, numTiles - 2, this);
  return partitions;
};


function haversineDistance(latLng1, latLng2) {
  var latd = 0.5 * deg2rad(latLng2.lat() - latLng1.lat()),
    lond = 0.5 * deg2rad(latLng2.lng() - latLng1.lng()),
    a = Math.sin(latd) * Math.sin(latd) + Math.cos(deg2rad(latLng1.lat())) * Math.cos(deg2rad(latLng2.lat())) * Math.sin(lond) * Math.sin(lond),
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 1000 * 6371.0 * c;
}
