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


var CTLON = (function () {
  "use strict";

  var OK = 'ok',
    MOBILE = navigator.userAgent.indexOf('Mobile') >= 0,
    DEFAULT_AVATAR = 'img/default-avatar.jpg',
    MaxDistance = 200 * 1000 /* meters */,
    DevicePixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1,
    Avatar = { Width: DevicePixelRatio * 44, Height: DevicePixelRatio * 44, backgroundColor: '#000' },
    Symbol = { Width: 46, Height: 53 },
    TrackColor = '#039',
    firstLoad = true,
    geocoder = new google.maps.Geocoder(),
    map = null, overlay = null, circle = null, polyline = null, infoWindow = null,
    markers = {},
    me = { id: undefined, latLng: null, avatar: null },
    getFriendsPending = false,
    watchId = undefined,
    selectedUser = undefined,
    pollingId = undefined,
    computeDistanceBetween = haversineDistance;

  function softError(msg) {
    alert(msg);
  }

  function criticalError(msg) {
    softError(msg);
    window.location.reload();
  }

  function hideInfoWindow() {
    if (infoWindow)
      infoWindow.setMap(null);
  }

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
    $.each(markers, function (i, marker) { marker.setMap(null); });
    markers = {};
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
    showProgressInfo();
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
        console.error(e, data);
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
        polyline.setMap(map);
      }
      else {
        if (polyline) {
          polyline.setMap(null);
          polyline = null;
        }
        console.warn(data.error);
      }
      hideProgressInfo();
    });
  }


  function highlightFriend(userid, centerMap) {
    var m, accuracy, userIDs, found = false, isCluster = false;
    if (typeof userid !== 'string')
      return;
    m = markers[userid];
    if (polyline)
      polyline.setMap(null);
    if ($('#show-tracks').is(':checked'))
      getTrack(userid);
    if (typeof m !== 'object') { // user is possibly clustered, find user
      $.each(Object.keys(markers), function (i, uid) {
        if (uid.split('/').indexOf(userid) >= 0) {
          userid = uid;
          m = markers[userid];
          found = true;
          isCluster = true;
          return false;
        }
      });
      if (!found)
        return;
    }
    selectedUser = userid;
    if (centerMap)
      map.setCenter(m.getPosition());
    m.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
    if (!isCluster) {
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
      infoWindow.setMap(map);
      infoWindow.setPosition(m.getPosition());
      infoWindow.setContent('<p><strong>' + userid + '</strong><br/>' +
        $('#buddy-' + userid).attr('data-last-update') + '</p>' +
        '<p id="address"></p>');
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
    }
  }


  function clusteredFriends(userData) {
    var clustered = [], cluster, userIDs = Object.keys(userData), currentUser, currentUserId, p0,
      projection = overlay.getProjection(), sqr = function (a) { return a * a; },
      distance = (Avatar.Width + Avatar.Height) / 3;
    while (userIDs.length > 0) {
      currentUserId = userIDs.pop();
      if (currentUserId === null)
        continue;
      currentUser = userData[currentUserId];
      cluster = [currentUser];
      currentUser.id = currentUserId;
      currentUser.latLng = new google.maps.LatLng(currentUser.lat, currentUser.lng);
      p0 = projection.fromLatLngToDivPixel(currentUser.latLng);
      $.each(userIDs, function (i, userid) {
        var p1, p0p1;
        if (userIDs[i] === null)
          return;
        userData[userid].latLng = new google.maps.LatLng(userData[userid].lat, userData[userid].lng);
        userData[userid].id = userid;
        p1 = projection.fromLatLngToDivPixel(userData[userid].latLng);
        p0p1 = Math.sqrt(sqr(p1.x - p0.x) + sqr(p1.y - p0.y));
        if (p0p1 < distance) {
          cluster.push(userData[userid]);
          userIDs[i] = null;
        }
      });
      clustered.push(cluster);
    }
    return clustered;
  }


  function processFriends(users) {
    $.each(clusteredFriends(users), function (i, cluster) {

      function process(friend) {
        var buddy;
        friend.readableTimestamp = new Date(friend.timestamp * 1000).toLocaleString();
        if (me.latLng === null) // location queries disabled, use first friend's position for range calculation
          me.latLng = new google.maps.LatLng(friend.lat, friend.lng);
        buddy = $('<span></span>')
              .addClass('buddy').attr('id', 'buddy-' + friend.id)
              .attr('data-lat', friend.lat)
              .attr('data-lng', friend.lng)
              .attr('data-accuracy', friend.accuracy)
              .attr('data-timestamp', friend.timestamp)
              .attr('data-last-update', friend.readableTimestamp)
              .attr('title', friend.id + ' - letzte Aktualisierung: ' + friend.readableTimestamp)
            .click(function () {
              hideInfoWindow();
              highlightFriend(friend.id, true);
              hideCircle();
            }.bind(friend));
        if (friend.id === me.id)
          buddy.css('display', 'none');
        else
          buddy.css('background-image', 'url(' + (friend.avatar ? friend.avatar : DEFAULT_AVATAR) + ')');
        if ($('#buddies').children().length === 0) {
          $('#buddies').append(buddy);
        }
        else {
          $('#buddies').children().each(function (i, b) {
            if (friend.timestamp > parseInt($(b).attr('data-timestamp'), 10)) {
              buddy.insertBefore(b);
              return false;
            }
            if (($('#buddies').children().length - 1) === i)
              $('#buddies').append(buddy);
          });
        }
      }

      function placeMarker(friend, isClustered) {
        var icon;
        if (typeof markers[friend.id] === 'undefined') {
          if (isClustered) {
            icon = {
              url: friend.avatar ? friend.avatar : DEFAULT_AVATAR,
              size: new google.maps.Size(Avatar.Width + 2, Avatar.Height + 2),
              anchor: new google.maps.Point(1 + Avatar.Width / 2, 1 + Avatar.Height / 2),
            };
          }
          else {
            icon = {
              url: friend.avatar,
              size: new google.maps.Size(Symbol.Width, Symbol.Height),
              anchor: new google.maps.Point(Symbol.Width / 2, 0),
            };
          }
          markers[friend.id] = new google.maps.Marker({
            title: friend.id + (friend.readableTimestamp ? (' (' + friend.readableTimestamp + ')') : ''),
            icon: icon,
            map: map
          });
          google.maps.event.addListener(markers[friend.id], 'click', function () {
            console.log('clicked on ' + friend.id);
          });
        }
        // if (($('#incognito').is(':checked') || $('#offline-mode').is(':checked')) && friend.id === me.id && !firstLoad)
        markers[friend.id].setPosition(friend.latLng);
      }

      if (cluster.length === 1) { // single
        (function () {
          var img = new Image, friend = cluster[0];
          img.onload = function () {
            var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'),
              avatarImg = new Image(Avatar.Width, Avatar.Height);
            process(friend);
            avatarImg.src = friend.avatar || DEFAULT_AVATAR;
            canvas.width = Symbol.Width;
            canvas.height = Symbol.Height;
            ctx.drawImage(img, 0, 0);
            ctx.drawImage(avatarImg, 1, 8, Avatar.Width, Avatar.Height);
            friend.avatar = canvas.toDataURL();
            placeMarker(friend, false);
          };
          img.src = 'img/single-symbol.png';
        })();
      }
      else if (cluster.length > 1) { // cluster
        (function () {
          var canvas = document.createElement('canvas'), ctx = canvas.getContext('2d'),
            rect = new Rect(0, 0, Avatar.Width, Avatar.Height),
            slices = rect.partitioned(cluster.length),
            imagesLoaded = 0,
            clusteredFriends = {
              id: [],
              latLng: null,
              avatar: null,
              bounds: new google.maps.LatLngBounds()
            };
          canvas.width = Avatar.Width + 2;
          canvas.height = Avatar.Height + 2;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          $.each(cluster, function (i, friend) {
            var img = new Image;
            img.onload = function () {
              var slice = slices[i], sliceW = slice.width(), sliceH = slice.height();
              if (sliceH > sliceW)
                ctx.drawImage(img, img.width / 4, 0, img.width / 2, img.height, slice.left() + 1, slice.top() + 1, sliceW, sliceH);
              else
                ctx.drawImage(img, 0, 0, img.width, img.height, slice.left() + 1, slice.top() + 1, sliceW, sliceH);
              clusteredFriends.id.push(friend.id);
              clusteredFriends.bounds.extend(friend.latLng);
              if (++imagesLoaded === slices.length) {
                clusteredFriends.avatar = canvas.toDataURL();
                clusteredFriends.id = clusteredFriends.id.join('/');
                clusteredFriends.latLng = clusteredFriends.bounds.getCenter();
                placeMarker(clusteredFriends, true);
              }
            };
            img.src = friend.avatar || DEFAULT_AVATAR;
            process(friend);
          });
        })();
      }
    });

  }


  function getFriends() {
    var maxAge,
    rangeConstraint = parseInt($('#range-constraint').val(), 10),
    data = {
      lat: map.getCenter().lat(),
      lng: map.getCenter().lng()
    };
    if (getFriendsPending)
      return;
    showProgressInfo();
    getFriendsPending = true;
    maxAge = parseInt($('#max-location-age').val(), 10);
    if (maxAge >= 0)
      data.maxage = maxAge;
    if (rangeConstraint === 0) {
      data.maxdist = Math.ceil(google.maps.geometry.spherical.computeDistanceBetween(map.getBounds().getNorthEast(), map.getBounds().getSouthWest()) / 2);
    }
    else if (rangeConstraint > 0) {
      data.maxdist = rangeConstraint;
    }
    $.ajax({
      url: 'friends.php',
      type: 'POST',
      data: data,
      accepts: 'json'
    }).done(function (data) {
      if (!data) {
        criticalError('Fehler beim Abfragen der User-Liste!');
      }
      else {
        try {
          data = JSON.parse(data);
        }
        catch (e) {
          console.error(e, data);
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

        processFriends(data.users);
      }
    }).error(function (jqXHR, textStatus, errorThrown) {
      criticalError('Fehler beim Abfragen der User-Liste [' + textStatus + ': ' + errorThrown + ']');
    });
  }


  function goOnline() {
    console.log('went online.');
    transferPendingLocations();
  }


  function goOffline() {
    console.warn('went offline.');
  }


  function transferPendingLocations() {
    var pendingLocations;
    console.log('transferPendingLocations()');
    showProgressInfo();
    try {
      pendingLocations = JSON.parse(localStorage.getItem('pending-locations') || '[]');
    }
    catch (e) {
      console.error('invalid data in localStorage["pending-locations"]');
    }
    if (!pendingLocations || pendingLocations.length === 0)
      return;
    $.ajax({
      url: 'pending.php',
      type: 'POST',
      accepts: 'json',
      data: {
        userid: pendingLocations[0].userid,
        locations: pendingLocations
      }
    }).done(function (data) {
      hideProgressInfo();
      if (!data) {
        criticalError('Fehler beim Abfragen deiner Daten!');
      }
      else if (data.status === 'ok') {
        localStorage.setItem('pending-locations', '[]');
      }
    }).error(function (jqXHR, textStatus, errorThrown) {
      criticalError('Fehler beim Übertragen der zwischengespeicherten Standorte [' + textStatus + ': ' + errorThrown + ']');
    });
  }


  function setPosition(pos) {
    var location, pendingLocations;
    me.timestamp = Math.floor(pos.timestamp / 1000);
    me.latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    console.log(infoWindow, me.id, selectedUser, me.latLng);
    if (infoWindow !== null && me.id === selectedUser)
      infoWindow.setPosition(me.latLng);
    if (markers.hasOwnProperty(me.id))
      markers[me.id].setPosition(me.latLng);
    localStorage.setItem('my-last-position', pos.coords.latitude + ',' + pos.coords.longitude)
    $('#userid').attr('data-lat', pos.coords.latitude).attr('data-lng', pos.coords.longitude);
    location = {
      userid: me.id,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: me.timestamp
    };
    location.accuracy = pos.coords.accuracy ? pos.coords.accuracy : undefined;
    location.heading = pos.coords.heading ? pos.coords.heading : undefined;
    location.speed = pos.coords.speed ? pos.coords.speed : undefined;
    location.altitude = pos.coords.altitude ? pos.coords.altitude : undefined;
    location.altitudeaccuracy = pos.coords.altitudeAccuracy ? pos.coords.altitudeAccuracy : undefined;
    if (!navigator.onLine || $('#offline-mode').is(':checked')) {
      try {
        pendingLocations = JSON.parse(localStorage.getItem('pending-locations') || '[]');
      }
      catch (e) {
        console.error(e, data);
        return;
      }
      delete location.userid;
      pendingLocations.push(location);
      localStorage.setItem('pending-locations', JSON.stringify(pendingLocations));
    }
    else if (!$('#incognito').is(':checked')) {
      // send own location to server
      $.ajax({
        url: 'setloc.php',
        type: 'POST',
        accepts: 'json',
        data: location
      }).done(function (data) {
        if (!data) {
          criticalError('Fehler beim Übertragen deines Standorts');
        }
        else {
          try {
            data = JSON.parse(data);
          }
          catch (e) {
            console.error(e, data);
            return;
          }
          if (data.status === 'ok' && data.userid === me.id) {
            // XXX?
          }
        }
      }).error(function (jqXHR, textStatus, errorThrown) {
        criticalError('Fehler beim Übertragen deines Standorts [' + textStatus + ': ' + errorThrown + ']');
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
            if (!data) {
              criticalError('Fehler beim Übertragen deines Avatars!');
            }
            else {
              avatar.empty().css('background-image', 'url(' + dataUrl + ')');
              $('#userid').css('background-image', 'url(' + dataUrl + ')');
            }
          }).error(function (jqXHR, textStatus, errorThrown) {
            criticalError('Fehler beim Übertragen deines Avatars [' + textStatus + ': ' + errorThrown + ']');
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
            canvas = document.createElement('canvas');
            ctx = canvas.getContext('2d');
            canvas.width = Avatar.Width;
            canvas.height = Avatar.Height;
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
          criticalError('Avatar-Datei nicht gefunden.');
          break;
        case e.target.error.NOT_READABLE_ERR:
          criticalError('Avatar-Datei ist nicht lesbar.');
          break;
        case e.target.error.ABORT_ERR:
          console.warn('Lesen der Avatar-Datei abgebrochen.');
          break;
        default:
          criticalError('Beim Zugriff auf die Avatar-Datei ist ein Fehler aufgetreten.');
          break;
      }
    };
    reader.onabort = function () {
      criticalError('Lesen der Datei abgebrochen.');
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
    var imgFiles = ['loader-5-0.gif', 'single-symbol.png'];
    $.each(imgFiles, function (i, f) {
      var img = new Image;
      img.src = 'img/' + f;
    });
  }


  function startPolling() {
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(setPosition, function () {
        alert('Standortabfrage fehlgeschlagen.');
      });
      if (pollingId)
        clearInterval(pollingId);
      pollingId = setInterval(getFriends, 1000 * parseInt($('#polling-interval').val(), 10));
    }
    else {
      alert('Dein Browser stellt keine Standortabfragen zur Verfügung.');
    }

  }

  return {
    init: function () {
      var mapOptions = {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
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
        criticalError('Fehler beim Abfragen deiner Daten [' + textStatus + ': ' + errorThrown + ']');
      }).done(function (data) {
        var myPos;
        hideProgressInfo();
        if (!data) {
          criticalError('Fehler beim Abfragen deiner Daten!');
          return;
        }
        try {
          data = JSON.parse(data);
        }
        catch (e) {
          console.error(e, data);
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

        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          me.latLng = new google.maps.LatLng(data.lat, data.lng);
        }
        else if (myPos = localStorage.getItem('my-last-position')) {
          myPos = myPos.split(',')
          me.latLng = (myPos.length === 2) ? new google.maps.LatLng(myPos[0], myPos[1]) : new google.maps.LatLng(51, 10.3);
        }
        else {
          me.latLng = new google.maps.LatLng(51, 10.3); // last resort (center of Germany)
        }

        $('#userid').click(function () {
          hideInfoWindow();
          console.log(me);
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

        $('#offline-mode').change(function (e) {
          var checked = $('#offline-mode').is(':checked')
          localStorage.setItem('offline-mode', checked);
          if (!checked)
            transferPendingLocations();
        }).prop('checked', localStorage.getItem('offline-mode') === 'true');

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

        $('#polling-interval').change(function (e) {
          localStorage.setItem('polling-interval', $('#polling-interval').val());
          startPolling();
        }).children('option').filter('[value=' + (localStorage.getItem('polling-interval') || '60') + ']').prop('selected', true);

        $('#range-constraint').change(function (e) {
          localStorage.setItem('range-constraint', $('#range-constraint').val());
          getFriends();
        }).children('option').filter('[value=' + (localStorage.getItem('range-constraint') || '-1') + ']').prop('selected', true);

        // init Google Maps
        google.maps.visualRefresh = true;
        map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
        if (google.maps.geometry.spherical.computeDistanceBetween)
          computeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
        map.setCenter(me.latLng);

        overlay = new google.maps.OverlayView();
        overlay.draw = function () { };
        overlay.setMap(map);

        $(window).bind({
          online: goOnline,
          offline: goOffline
        });

        google.maps.event.addListenerOnce(map, 'idle', getFriends);

        startPolling();
      });
    },
    setLocation: function (lat, lng) {
      var pos = {
        timestamp: Date.now(),
        coords: {
          latitude: lat,
          longitude: lng
        }
      }
      setPosition(pos);
    }
  };
})();
