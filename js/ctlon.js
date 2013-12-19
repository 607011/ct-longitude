/*
    c't Longitude - A reimplementation of Googles discontinued Latitude app.
    Copyright (c) 2013 Oliver Lau <ola@ct.de>, Heise Zeitschriften Verlag

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

var DEBUG = false;

window.D = DEBUG ? function (msg) { $('#log').html(msg); } : function () { };

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


/* Taken from jQuery Easing v1.3 - Copyright © 2008 George McGinley Smith - http://gsgd.co.uk/sandbox/jquery/easing/ */
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
        duration = Math.abs(Math.floor(dt / dx * 1000));
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


var CTLON = (function () {
  "use strict";

  var OK = 'ok',
    MOBILE = navigator.userAgent.indexOf('Mobile') >= 0,
    MaxDistance = 200 * 1000 /* meters */,
    PollingInterval = 60 * 1000 /* milliseconds */,
    MinWatchInterval = 30 * 1000 /* milliseconds */,
    Avatar = { Width: 44, Height: 44, backgroundColor: '#000' },
    TrackColor = '#039',
    lastWatch = null,
    getFriendsPending = false,
    geocoder = new google.maps.Geocoder(),
    map = null,
    circle = null, polyline = null, infoWindow = null,
    markers = {},
    me = { id: undefined, latLng: null, avatar: null },
    watchId = undefined,
    selectedUser = undefined,
    pollingId = undefined,
    computeDistanceBetween = function () { return 0; };


  function showProgressInfo() {
    $('#info-bar-container').addClass('barberpole');
    $('#buddy-container').addClass('opaque');
    $('#userid').addClass('opaque');
  }


  function hideProgressInfo() {
    $('#info-bar-container').removeClass('barberpole');
    $('#buddy-container').removeClass('opaque');
    $('#userid').removeClass('opaque');
  }


  function removeAllMarkers() {
    $.each(markers, function (i, marker) {
      marker.setMap(null);
    });
    markers = {};
  }


  function placeMarker(userid, lat, lng, timestamp, avatar) {
    if (typeof markers[userid] === 'undefined') {
      markers[userid] = new google.maps.Marker({
        title: userid + ' (' + timestamp + ')',
        icon: {
          url: avatar ? avatar : 'img/default-avatar.jpg',
          size: new google.maps.Size(Avatar.Width, Avatar.Height),
          anchor: new google.maps.Point(Avatar.Width / 2, 0),
        },
        map: map
      });
      google.maps.event
		.addListener(markers[userid], 'click', function () {
		  console.log('clicked on ' + userid);
		});
    }
    markers[userid].setPosition(new google.maps.LatLng(lat, lng));
  }


  function hideCircle() {
    if (circle)
      circle.setVisible(false);
  }


  function getTrack(userid) {
    var maxAge = parseInt($('#max-waypoint-age').val(), 10),
      t1 = Math.floor(Date.now() / 1000), t0 = (maxAge < 0) ? 0 : t1 - maxAge;
    if (!$('#show-tracks').is(':checked'))
      return;
    $.ajax({
      url: 'gettrack.php',
      type: 'POST',
      accepts: 'json',
      data: {
        userid: userid,
        t0: t0,
        t1: t1
      }
    }).done(function (data) {
      var path;
      try {
        data = JSON.parse(data);
      }
      catch (e) {
        console.error(e);
        return;
      }
      if (data.status === OK) {
        path = $.map(data.path, function (i, key) {
          var loc = data.path[key];
          return new google.maps.LatLng(loc.lat, loc.lng);
        });
        if (polyline === null)
          polyline = new google.maps.Polyline({
            map: map,
            strokeColor: TrackColor,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            geodesic: true
          });
        polyline.setPath(path);
      }
      else {
        if (polyline) {
          polyline.setMap(null);
          polyline = null;
        }
        console.warn(data.error);
      }
    });
  }


  function highlightFriend(userid, centerMap) {
    var m = markers[userid], accuracy;
    if (typeof m !== 'object')
      return;
    if (typeof userid !== 'string')
      return;
    selectedUser = userid;
    if (centerMap)
      map.setCenter(m.getPosition());
    m.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
    accuracy = parseInt($('#buddy-' + userid).attr('data-accuracy'), 10);
    if (circle === null) {
      circle = new google.maps.Circle({
        map: map,
        strokeColor: '#f00',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#f00',
        fillOpacity: 0.1
      });
    }
    circle.setRadius(accuracy);
    circle.setCenter(m.getPosition());
    circle.setVisible($('#show-accuracy').is(':checked'));
    if (infoWindow === null)
      infoWindow = new google.maps.InfoWindow();
    infoWindow.setOptions({
      map: map,
      position: m.getPosition(),
      content: '<p><strong>' + userid + '</strong><br/>' +
        $('#buddy-' + userid).attr('data-last-update') + '</p>' +
        '<p id="address"></p>'
    });
    geocoder.geocode({ 'latLng': m.getPosition() }, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#address').text(results[1].formatted_address);
        }
      }
      else {
        console.warn('Umgekehrtes Geocoding fehlgeschlagen: ' + status);
      }
    });
    if ($('#show-tracks').is(':checked')) {
      getTrack(userid);
    }
    else {
      if (polyline)
        polyline.setMap(null);
    }
  }


  function getFriends() {
    var data = {}, maxAge;
    if (getFriendsPending)
      return;
    showProgressInfo();
    getFriendsPending = true;
    maxAge = parseInt($('#max-location-age').val(), 10);
    if (maxAge >= 0)
      data.maxage = maxAge;
    $.ajax({
      url: 'friends.php',
      type: 'POST',
      data: data,
      accepts: 'json'
    }).done(function (data) {
      var ne, sw, range = MaxDistance, bounds = map.getBounds();
      if (bounds) {
        ne = bounds.getNorthEast();
        sw = bounds.getSouthWest();
        range = Math.max(computeDistanceBetween(ne, sw) / 2, MaxDistance);
      }
      try {
        data = JSON.parse(data);
      }
      catch (e) {
        console.error(e);
        return;
      }
      if (data.status !== 'ok') {
        console.error(data.error);
        return;
      }
      hideProgressInfo();
      removeAllMarkers();
      setTimeout(function () { getFriendsPending = false; }, 1000);
      $('#buddies').empty().css('left', '0px');
      if (typeof data.users !== 'object')
        return;
      $.each(data.users, function (userid, friend) {
        var timestamp = new Date(friend.timestamp * 1000).toLocaleString(), buddy;
        friend.id = userid;
        friend.latLng = new google.maps.LatLng(friend.lat, friend.lng);
        if (me.latLng === null) // location queries disabled, use first friend's position for range calculation
          me.latLng = new google.maps.LatLng(friend.lat, friend.lng);
        if (computeDistanceBetween(me.latLng, friend.latLng) < range) {
          buddy = $('<span></span>')
                .addClass('buddy').attr('id', 'buddy-' + friend.id)
                .attr('data-lat', friend.lat)
                .attr('data-lng', friend.lng)
                .attr('data-accuracy', friend.accuracy)
                .attr('data-timestamp', friend.timestamp)
                .attr('data-last-update', timestamp)
                .attr('title', friend.id + ' - letzte Aktualisierung: ' + timestamp)
              .click(function () {
                highlightFriend(friend.id, true);
              }.bind(friend));
          if (friend.id === me.id)
            buddy.css('display', 'none');
          else
            buddy.css('background-image', 'url(' + (friend.avatar ? friend.avatar : 'img/default-avatar.jpg') + ')');
          $('#buddies').append(buddy);
        }
        placeMarker(friend.id, friend.lat, friend.lng, timestamp, friend.avatar);
      });
    }).error(function (jqXHR, textStatus, errorThrown) {
      alert('Fehler beim Abfragen der User-Liste [' + textStatus + ': ' + errorThrown + ']');
    });
    ;
  }


  function setPosition(pos) {
    me.timestamp = Math.floor(pos.timestamp / 1000);
    me.latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    localStorage.setItem('my-last-position', pos.coords.latitude + ',' + pos.coords.longitude)
    $('#userid').attr('data-lat', pos.coords.latitude).attr('data-lng', pos.coords.longitude);
    if (!$('#incognito').is(':checked')) {
      // send own location to server
      $.ajax({
        url: 'setloc.php?userid=' + me.id +
         '&lat=' + me.latLng.lat() +
         '&lng=' + me.latLng.lng() +
         '&accuracy=' + pos.coords.accuracy +
         '&heading=' + pos.coords.heading +
         '&speed=' + pos.coords.speed +
         '&altitude=' + pos.coords.altitude +
         '&altitudeaccuracy=' + pos.coords.altitudeAccuracy +
         '&timestamp=' + me.timestamp,
        accepts: 'json'
      }).done(function (data) {
        try {
          data = JSON.parse(data);
        }
        catch (e) {
          console.error(e);
          return;
        }
        if (data.status === 'ok' && data.userid === me.id) {
          if (lastWatch === null)
            lastWatch = Date.now();
          else if (Date.now() - lastWatch < MinWatchInterval)
            return;
          lastWatch = null;
          google.maps.event.addListenerOnce(map, 'idle', getFriends);
        }
      }).error(function (jqXHR, textStatus, errorThrown) {
        alert('Fehler beim Senden deines Standorts [' + textStatus + ': ' + errorThrown + ']');
      });
    }
  }


  function uploadAvatar(blob) {
    var reader = new FileReader,
      avatar = $('#avatar').css('background', 'none').css('background-color', 'white').append($('<span style="display: inline-block; width: ' + Avatar.Width + 'px; height: ' + Avatar.Height + 'px; background-image: url(img/loader-5-0.gif); background-repeat: no-repeat; background-position: 6px 6px"></span>'));
    reader.onload = function (e) {
      var img = new Image, dataUrl,
        send = function () {
          $.ajax({
            url: 'setoption.php',
            type: 'POST',
            data: {
              option: 'avatar',
              value: dataUrl
            }
          }).done(function (data) {
            avatar.empty().css('background-image', 'url(' + dataUrl + ')');
            $('#userid').css('background-image', 'url(' + dataUrl + ')');
          }).error(function (jqXHR, textStatus, errorThrown) {
            alert('Fehler beim Übertragen deines Avatars [' + textStatus + ': ' + errorThrown + ']');
          });
        };
      if (e.target.readyState == FileReader.DONE) {
        dataUrl = 'data:image/png;base64,' + btoa(
        (function (bytes) {
          var binary = '', len = bytes.byteLength, i;
          for (i = 0; i < len; ++i)
            binary += String.fromCharCode(bytes[i]);
          return binary;
        })(new Uint8Array(e.target.result)));
        img.onload = function () {
          var aspectRatio, canvas, ctx, w, h, xoff, yoff;
          if (img.width !== Avatar.Width || img.height !== Avatar.Height) {
            // scale image
            aspectRatio = img.width / img.height;
            if (aspectRatio > 1) {
              w = Avatar.Width;
              h = Math.round(Avatar.Height / aspectRatio);
              xoff = 0;
              yoff = Math.round((Avatar.Height - h) / 2);
            }
            else {
              w = Math.round(Avatar.Width * aspectRatio);
              h = Avatar.Height;
              xoff = Math.round((Avatar.Width - w) / 2);
              yoff = 0;
            }
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
            canvas.width = Avatar.Width;
            canvas.height = Avatar.Height;
            ctx.fillStyle = Avatar.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, img.width, img.height, xoff, yoff, w, h);
            dataUrl = canvas.toDataURL();
          }
          send();
        };
        img.src = dataUrl;
      }
    };
    reader.onerror = function (e) {
      switch (e.target.error.code) {
        case e.target.error.NOT_FOUND_ERR:
          alert('Datei nicht gefunden.');
          break;
        case e.target.error.NOT_READABLE_ERR:
          alert('Datei ist nicht lesbar.');
          break;
        case e.target.error.ABORT_ERR:
          console.warn('Lesen der Datei abgebrochen.');
          break;
        default:
          alert('Beim Zugriff auf die Datei ist ein Fehler aufgetreten.');
          break;
      }
    };
    reader.onabort = function () {
      alert('Lesen der Datei abgebrochen.');
    };
    reader.readAsArrayBuffer(blob);
  }


  function pasteHandler(e) {
    var items = e.originalEvent.clipboardData.items, i,
      isPNG = function (item) { return item.kind === 'file' && item.type === 'image/png'; };
    i = items.length;
    while (i--) {
      if (isPNG(items[i]))
        uploadAvatar(items[i].getAsFile());
    }
  }


  function showHideSettings() {
    var settings = $('#settings'), settingsIcon = $('#settings-icon'),
      avatar = $('#avatar'), avatarFile = $('#avatar-file');
    if (settings.css('display') === 'none') {
      settings.animate({
        opacity: 1,
        top: '0px'
      },
      {
        start: function () {
          settings.css('top', $('#info-bar-container').offset().top + 'px').css('display', 'block');
          settingsIcon.css('background-color', '#ccc');
        },
        easing: 'easeInOutCubic',
        duration: 350,
        complete: function () {
          $(document).bind({ paste: pasteHandler });
          avatarFile.bind({
            change: function (e) {
              var files = e.target.files;
              if (files.length === 1)
                uploadAvatar(files[0]);
            }
          });
          avatar.bind({
            dragover: function (event) {
              var e = event.originalEvent;
              e.stopPropagation();
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
              avatar.addClass('over');
            },
            dragleave: function (event) {
              var e = event.originalEvent;
              e.stopPropagation();
              e.preventDefault();
              avatar.removeClass('over');
            },
            drop: function (event) {
              var e = event.originalEvent,
                files = e.dataTransfer.files;
              e.stopPropagation();
              e.preventDefault();
              avatar.removeClass('over');
              if (files.length === 1)
                uploadAvatar(files[0]);
            }
          });
        }
      });
    }
    else {
      settings.animate({
        opacity: 0,
        top: $('#info-bar-container').offset().top + 'px'
      }, {
        complete: function () {
          settings.css('display', 'none');
          settingsIcon.css('background-color', '');
          $(document).unbind('paste');
          avatarFile.unbind('change');
          avatar.unbind('dragover').unbind('dragleave').unbind('drop');
        },
        easing: 'easeInOutCubic',
        duration: 350
      });
    }
  }


  function preloadImages() {
    var imgFiles = ['loader-5-0.gif'];
    $.each(imgFiles, function (i, f) {
      var img = new Image;
      img.src = 'img/' + f;
    });
  }

  return {
    init: function () {
      var mapOptions = {
        bounds_changed: function () {
          google.maps.event.addListenerOnce(map, 'idle', getFriends);
        },
        zoom: 13
      };

      showProgressInfo();

      preloadImages();

      if (DEBUG)
        $('#info-bar-container').before($('<div id="log" style="position: fixed; top: 0; left: 0; right: 0; height: 100px; background-color: rgba(0,0,0,0.45); line-height: 11px; font-size: 9px; color: white; text-shadow: 1px 1px 0 black; padding: 2px 4px;"></div>'));

      D('Platform: ' + navigator.platform + '<br/ >' + 'User Agent: ' + navigator.userAgent);

      // get http basic auth user
      $.ajax({
        url: 'me.php',
        accepts: 'json',
        type: 'POST'
      }).error(function (jqXHR, textStatus, errorThrown) {
        alert('Fehler beim Abfragen der deiner Daten [' + textStatus + ': ' + errorThrown + ']');
      }).done(function (data) {
        var myPos;
        hideProgressInfo();
        try {
          data = JSON.parse(data);
        }
        catch (e) {
          console.error(e);
          return;
        }

        me.id = data.userid;
        if (typeof data.avatar === 'string' && data.avatar.indexOf('data:image/png;base64,') === 0) {
          me.avatar = data.avatar;
          $('#avatar').css('background-image', 'url(' + me.avatar + ')');
          $('#userid').css('background-image', 'url(' + me.avatar + ')');
        }
        else {
          $('#userid').text(me.id);
        }

        myPos = localStorage.getItem('my-last-position');
        if (myPos) {
          myPos = myPos.split(',')
          me.latLng = (myPos.length === 2) ? new google.maps.LatLng(myPos[0], myPos[1]) : new google.maps.LatLng(51, 10.3);
        }
        else {
          me.latLng = (typeof data.lat === 'number' && typeof data.lng === 'number')
          ? new google.maps.LatLng(data.lat, data.lng)
          : new google.maps.LatLng(51, 10.3);
        }

        $('#userid').click(function () {
          highlightFriend(me.id, true);
          hideCircle();
        });

        $('#avatar').css('width', Avatar.Width + 'px').css('height', Avatar.Height + 'px');

        $('#avatar-max-width').text(Avatar.Width);

        $('#avatar-max-height').text(Avatar.Height);

        $('#settings-icon').click(showHideSettings);

        $('#buddies').enableHorizontalSlider();

        $("#settings .colorpicker").spectrum({
          color: Avatar.backgroundColor,
          showInitial: true,
          showInput: true,
          localStorageKey: 'avatarColor',
          change: function (color) {
            Avatar.backgroundColor = color.toHexString();
          }
        });

        $('#show-tracks').change(function (e) {
          var checked = $('#show-tracks').is(':checked');
          localStorage.setItem('show-tracks', checked);
          if (checked)
            getTrack(selectedUser);
          if (polyline !== null)
            polyline.setVisible(checked);
        }).prop('checked', localStorage.getItem('show-tracks') === 'true');

        $('#share-my-tracks').change(function (e) {
          var checked = $('#share-my-tracks').is(':checked')
          localStorage.setItem('share-my-tracks', checked);
          $.ajax({
            url: 'setoption.php?option=sharetracks&value=' + encodeURIComponent(checked),
            accepts: 'json'
          })
        }).prop('checked', data.sharetracks === 'true');

        $('#incognito').change(function (e) {
          var checked = $('#incognito').is(':checked')
          localStorage.setItem('incognito', checked);
        }).prop('checked', localStorage.getItem('incognito') === 'true');

        $('#show-accuracy').change(function (e) {
          var checked = $('#show-accuracy').is(':checked')
          localStorage.setItem('show-accuracy', checked);
          // TODO: show circle for selectedUser
          if (circle !== null)
            circle.setVisible(checked);
        }).prop('checked', localStorage.getItem('show-accuracy') === 'true');

        $('#max-location-age').change(function (e) {
          localStorage.setItem('max-location-age', $('#max-location-age').val());
          getFriends();
        }).children('option').filter('[value=' + (localStorage.getItem('max-location-age') || '1800') + ']').prop('selected', true);

        $('#max-waypoint-age').change(function (e) {
          localStorage.setItem('max-waypoint-age', $('#max-waypoint-age').val());
          getTrack(selectedUser);
        }).children('option').filter('[value=' + (localStorage.getItem('max-waypoint-age') || '86400') + ']').prop('selected', true);

        // init Google Maps
        google.maps.visualRefresh = true;
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        computeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
        map.setCenter(me.latLng);

        // start polling
        if (navigator.geolocation) {
          watchId = navigator.geolocation.watchPosition(setPosition, function () {
            alert('Standortabfrage fehlgeschlagen.');
          });
          pollingId = setInterval(getFriends, PollingInterval);
        }
        else {
          alert('Dein Browser stellt keine Standortabfragen zur Verfügung.');
        }

        google.maps.event.addListenerOnce(map, 'idle', getFriends);
      });
    }
  };
})();
