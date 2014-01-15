/*
    c't Longitude - A reimplementation of Googles discontinued Latitude app.
    Copyright (c) 2013-2014 Oliver Lau <ola@ct.de>, Heise Zeitschriften Verlag

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

var CTLON = (function () {
  "use strict";

  var OK = 'ok',
    ERROR = 'error',
    MOBILE = navigator.userAgent.indexOf('Mobile') >= 0,
    DEFAULT_AVATAR = 'img/default-avatar.jpg',
    MaxDistance = 200 * 1000 /* meters */,
    GoogleOAuthClientId = '', /* will be read from attribute "data-clientid" of <span class="g-signin"> in index.html */
    DevicePixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 1,
    Avatar = { Width: 44, Height: 44, OptimalWidth: 88, OptimalHeight: 88, MaxWidth: 512, MaxHeight: 512, backgroundColor: '#000' },
    Symbol = { Width: 46, Height: 53 },
    TrackColor = 'rgba(0, 40, 100, 0.8)',
    appInitialized = false,
    firstLoad = true,
    geocoder = new google.maps.Geocoder(),
    map = null, overlay = null, circle = null, polyline = null,
    infoWindow = null, infoWindowClosed = false,
    markers = {},
    avatars = {},
    friends = [],
    clusters = [],
    me = { id: undefined, latLng: null, avatar: null, name: null, oauth: { clientId: null, token: null, expiresAt: null, expiresIn: null }, profile: null },
    getFriendsPending = false,
    watchId,
    selectedUser,
    pollingId,
    computeDistanceBetween = haversineDistance;

  function softError(msg) {
    alert(msg);
  }


  function criticalError(msg) {
    softError(msg);
    // window.location.reload();
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


  function showPopup(title, msg) {
    var popup = $('<div id="popup"><h1>' + title + ' </h1><p>' + msg + '</p><button id="ok-button">OK</div>');
    $('#app').append(popup);
    popup.animate({ opacity: 1 }, {
      complete: function () {
        $('#ok-button').click(function () {
          popup.animate({ opacity: 0 }, {
            complete: function () { popup.remove(); }
          });
        });
      }
    });
  }


  function getTrack(userid) {
    var maxAge = parseInt($('#max-waypoint-age').val(), 10),
      t1 = Math.floor(Date.now() / 1000), t0 = (maxAge < 0) ? 0 : t1 - maxAge;
    if (!$('#show-tracks').is(':checked'))
      return;
    showProgressInfo();
    $.ajax({
      url: 'ajax/track.php',
      type: 'POST',
      accepts: 'json',
      data: {
        userid: userid,
        t0: t0,
        t1: t1,
        oauth: me.oauth
    }
    }).done(function (data) {
      try {
        data = JSON.parse(data);
      }
      catch (e) {
        console.error(e);
        return;
      }
      if (data.status === OK) {
        if (polyline === null)
          polyline = new google.maps.Polyline({
            map: map,
            strokeColor: TrackColor,
            strokeOpacity: 0.8,
            strokeWeight: 2,
            geodesic: true
          });
        polyline.setPath($.map(data.path, function (i, key) {
          var loc = data.path[key];
          return new google.maps.LatLng(loc.lat, loc.lng);
        }));
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


  function setCircle(accuracy, latLng) {
    circle.setRadius(accuracy);
    circle.setCenter(latLng);
    circle.setVisible($('#show-accuracy').is(':checked'));
  }


  function setInfoWindow(updated, name, latLng) {
    if (!infoWindowClosed)
      infoWindow.open(map);
    infoWindow.setContent('<p><b>' + name + '</b><br/>' + updated + '</p>' + '<p id="address"></p>');
    if (!latLng.equals(infoWindow.getPosition())) {
      infoWindow.setPosition(latLng);
      geocoder.geocode({ 'latLng': latLng }, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
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


  function getBuddyElement(userid) {
    return $('#buddy-' + userid.replace(/([!"#$%&'\(\)\*\+,\.\/:;<=>\?@\[\]\^`\{\|\}~])/g, '\\$1'))
  }


  function highlightFriend(userid, centerMap) {
    var m, userIDs, buddy, found = false;
    if (typeof userid !== 'string')
      return;
    m = markers[userid];
    buddy = getBuddyElement(userid);
    if (polyline)
      polyline.setMap(null);
    if ($('#show-tracks').is(':checked'))
      getTrack(userid);
    selectedUser = userid;
    if (centerMap)
      map.setCenter(m.getPosition());
    setCircle(parseInt(buddy.attr('data-accuracy'), 10), m.getPosition());
    infoWindowClosed = false;
    setInfoWindow(buddy.attr('data-last-update'), buddy.attr('data-name'), m.getPosition());
  }


  function clusteredFriends(userData) {
    var clustered = [], cluster, userIDs = Object.keys(userData), currentUser, currentUserId, P0,
      projection = overlay.getProjection(),
      distance = (Avatar.Width + Avatar.Height) / 3;
    while (userIDs.length > 0) {
      currentUserId = userIDs.pop();
      if (currentUserId === null)
        continue;
      currentUser = userData[currentUserId];
      cluster = [currentUser];
      currentUser.id = currentUserId;
      currentUser.latLng = new google.maps.LatLng(currentUser.lat, currentUser.lng);
      P0 = projection.fromLatLngToDivPixel(currentUser.latLng);
      $.each(userIDs, function (i, userid) {
        var P1, P0P1;
        if (userIDs[i] === null)
          return;
        userData[userid].latLng = new google.maps.LatLng(userData[userid].lat, userData[userid].lng);
        userData[userid].id = userid;
        P1 = projection.fromLatLngToDivPixel(userData[userid].latLng);
        P0P1 = Math.sqrt(Math.sqr(P1.x - P0.x) + Math.sqr(P1.y - P0.y));
        if (P0P1 < distance) {
          cluster.push(userData[userid]);
          userIDs[i] = null;
        }
      });
      clustered.push(cluster);
    }
    return clustered;
  }


  function processFriends(users) {
    friends = users;
    clusters = clusteredFriends(friends);
    
    $.each(clusters, function (i, cluster) {

      function process(friend, opts) {
        var buddy, latLng;
        opts = opts || {};
        friend.readableTimestamp = new Date(friend.timestamp * 1000).toLocaleString();
        if (me.latLng === null) // location queries disabled, use first friend's position for range calculation
          me.latLng = new google.maps.LatLng(friend.lat, friend.lng);
        if (!avatars.hasOwnProperty(friend.id) && !opts.avatarRequestPending) {
          opts.avatarRequestPending = true;
          $.ajax({
            url: 'ajax/avatar.php',
            type: 'POST',
            accepts: 'json',
            data: {
              userid: friend.id,
              oauth: me.oauth
            }
          }).done(function (data) {
            if (!data) {
              criticalError('Fehler beim Abfragen des Avatars!');
            }
            else {
              try {
                data = JSON.parse(data);
              }
              catch (e) {
                console.error(e);
                return;
              }
              if (data.status !== OK) {
                console.error(data.error);
                return;
              }
              if (data.avatar.indexOf('data:image') === 0) {
                avatars[data.userid] = data.avatar;
              }
              else {
                avatars[data.userid] = DEFAULT_AVATAR;
                opts.error.call('Keinen Avatar für `' + data.userid + '` gefunden.');
              }
              process(friend, opts);
            }
          }).error(function (jqXHR, textStatus, errorThrown) {
            criticalError('Fehler beim Abfragen des Avatars [' + textStatus + ': ' + errorThrown + ']');
          });
          return;
        }
        buddy = $('<span></span>')
          .addClass('buddy').attr('id', 'buddy-' + friend.id)
          .attr('data-name', friend.name)
          .attr('data-lat', friend.lat)
          .attr('data-lng', friend.lng)
          .attr('data-accuracy', friend.accuracy)
          .attr('data-timestamp', friend.timestamp)
          .attr('data-last-update', friend.readableTimestamp)
          .attr('title', friend.name + ' - letzte Aktualisierung: ' + friend.readableTimestamp)
          .css('background-image', 'url(' + avatars[friend.id] + ')')
          .click(function () {
            highlightFriend(friend.id, true);
          }.bind(friend));
        if (friend.id === me.id)
          buddy.css('display', 'none');
        if (friend.id === selectedUser) {
          latLng = new google.maps.LatLng(friend.lat, friend.lng);
          setCircle(friend.accuracy, latLng)
          setInfoWindow(friend.readableTimestamp, friend.name, latLng);
          // getTrack(friend.id);
        }
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
        opts.success.call();
      }

      function placeMarker(friend, isClustered, visible) {
        var icon;
        visible = (typeof visible === 'undefined') ? true : visible;
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
            title: isClustered ? friend.name : friend.name + (friend.readableTimestamp ? (' (' + friend.readableTimestamp + ')') : ''),
            visible: visible,
            icon: icon,
            map: map
          });
          google.maps.event.addListener(markers[friend.id], 'click', function () {
            // TODO: do something useful when symbol is clicked
            console.log('clicked on ' + (isClustered ? 'einige deiner Freunde' : friend.name));
          });
        }
        markers[friend.id].setPosition(friend.latLng);
      }

      if (cluster.length === 1) { // single
        (function () {
          var img = new Image(), friend = cluster[0];
          img.onload = function () {
            process(friend,
              {
                success: function () {
                  var canvas = document.createElement('canvas'),
                    ctx = canvas.getContext('2d'),
                    avatarImg = new Image(Avatar.OptimalWidth, Avatar.OptimalHeight);
                  avatarImg.src = avatars[friend.id] || DEFAULT_AVATAR;
                  canvas.width = Symbol.Width;
                  canvas.height = Symbol.Height;
                  ctx.drawImage(img, 0, 0);
                  ctx.drawImage(avatarImg, 1, 8, Avatar.Width, Avatar.Height);
                  friend.avatar = canvas.toDataURL('image/png');
                  placeMarker(friend, false);
                },
                error: function (e) {
                  console.warn(e);
                }
              });
          };
          img.src = 'img/single-symbol.png';
        })();
      }
      else if (cluster.length > 1) { // cluster
        (function () {
          var canvas = document.createElement('canvas'),
            ctx = canvas.getContext('2d'),
            rect = new Rect(0, 0, Avatar.Width, Avatar.Height),
            slices = rect.partitioned(cluster.length),
            imagesLoaded = 0,
            clusteredFriends = {
              ids: [],
              names: [],
              latLng: null,
              avatar: null,
              bounds: new google.maps.LatLngBounds()
            };
          canvas.width = Avatar.Width + 2;
          canvas.height = Avatar.Height + 2;
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          $.each(cluster, function (i, friend) {
            process(friend,
              {
                success: function () {
                  var img = new Image();
                  img.onload = function () {
                    var slice = slices[i], sliceW = slice.width(), sliceH = slice.height();
                    if (sliceH > sliceW)
                      ctx.drawImage(img, img.width / 4, 0, img.width / 2, img.height, slice.left() + 1, slice.top() + 1, sliceW, sliceH);
                    else
                      ctx.drawImage(img, 0, 0, img.width, img.height, slice.left() + 1, slice.top() + 1, sliceW, sliceH);
                    clusteredFriends.ids.push(friend.id);
                    clusteredFriends.names.push(friend.name);
                    clusteredFriends.bounds.extend(friend.latLng);
                    if (++imagesLoaded === slices.length) {
                      clusteredFriends.avatar = canvas.toDataURL('image/png');
                      clusteredFriends.id = clusteredFriends.ids.join('/');
                      clusteredFriends.name = clusteredFriends.names.join(', ');
                      clusteredFriends.latLng = clusteredFriends.bounds.getCenter();
                      placeMarker(clusteredFriends, true);
                    }
                    placeMarker(friend, false, false);
                  };
                  img.src = avatars[friend.id] || DEFAULT_AVATAR;
                },
                error: function (e) {
                  console.warn(e);
                }
              });
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
      lng: map.getCenter().lng(),
      oauth: me.oauth
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
      url: 'ajax/friends.php',
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
          console.error(e);
          return;
        }
        if (data.status !== OK) {
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
    console.log('Online.');
    $('#settings-icon').removeClass('offline');
    transferPendingLocations();
  }


  function goOffline() {
    $('#settings-icon').addClass('offline');
  }


  function transferLocations(locations, fileName, callback) {
    $.ajax({
      url: 'ajax/settrack.php',
      type: 'POST',
      accepts: 'json',
      data: {
        userid: me.id,
        locations: JSON.stringify(locations),
        filename: fileName,
        oauth: me.oauth
      }
    }).done(function transferLocationsCallback(data) {
      try {
        data = JSON.parse(data);
      }
      catch (e) {
        console.error(e);
        callback({ status: 'error', error: 'Fehlerhafte Antwort vom Server: JSON-Daten können nicht dekodiert werden.' });
        return;
      }
      if (!data) {
        if (typeof callback === 'function')
          callback(data);
        criticalError('Fehler beim Übertragen der zwischengespeicherten Standorte!');
      }
      else if (data.status === OK) {
        if (typeof callback === 'function')
          callback(data);
      }
      else if (data.status === 'error') {
        if (typeof callback === 'function')
          callback(data);
        criticalError('Fehler beim Übertragen der zwischengespeicherten Standorte: ' + data.error);
      }
    }).error(function (jqXHR, textStatus, errorThrown) {
      if (typeof callback === 'function')
        callback(data);
      criticalError('Fehler beim Übertragen der zwischengespeicherten Standorte [' + textStatus + ': ' + errorThrown + ']');
    });
  }


  function transferPendingLocations() {
    var pendingLocations;
    console.log('transferPendingLocations()');
    try {
      pendingLocations = JSON.parse(localStorage.getItem('pending-locations') || '[]');
    }
    catch (e) {
      console.error('Ungültige Daten in localStorage["pending-locations"]');
      return;
    }
    if (pendingLocations && pendingLocations.length > 0) {
      showProgressInfo();
      transferLocations(pendingLocations, null, function transferLocationsCallback(data) {
        hideProgressInfo();
        if (data.status === OK) {
          localStorage.removeItem('pending-locations');
          $('#settings-icon').removeClass('pending-locations');
          console.log('Pending locations successfully transferred.');
        }
      });
    }
  }


  function isClustered(userid) {
    var inCluster = false;
    $.each(clusters, function (i, cluster) {
      if (cluster.filter(function (buddy) { return buddy.id === userid; }).length > 0) {
        inCluster = true;
        return false;
      }
    });
    return inCluster;
  }


  function setPosition(pos) {
    var data, pendingLocations, path;
    console.log('setPosition() ->', pos.coords);
    me.timestamp = Math.floor(pos.timestamp / 1000);
    me.latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    if (me.id === selectedUser) {
      infoWindow.setPosition(me.latLng);
      circle.setCenter(me.latLng);
      if (polyline) {
        path = polyline.getPath();
        path.push(me.latLng);
        polyline.setPath(path);
      }
    }
    if (markers.hasOwnProperty(me.id))
      markers[me.id].setPosition(me.latLng);
    if (firstLoad) {
      map.setCenter(me.latLng);
      firstLoad = false;
    }
    localStorage.setItem('my-last-position', pos.coords.latitude + ',' + pos.coords.longitude);
    $('#userid').attr('data-lat', pos.coords.latitude).attr('data-lng', pos.coords.longitude);
    data = {
      userid: me.id,
      oauth: me.oauth,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      timestamp: me.timestamp
    };
    data.accuracy = pos.coords.accuracy ? pos.coords.accuracy : void 0;
    data.heading = pos.coords.heading ? pos.coords.heading : void 0;
    data.speed = pos.coords.speed ? pos.coords.speed : void 0;
    data.altitude = pos.coords.altitude ? pos.coords.altitude : void 0;
    data.altitudeaccuracy = pos.coords.altitudeAccuracy ? pos.coords.altitudeAccuracy : void 0;
    if (!navigator.onLine || $('#offline-mode').is(':checked')) {
      try {
        pendingLocations = JSON.parse(localStorage.getItem('pending-locations') || '[]');
      }
      catch (e) {
        console.error(e);
        return;
      }
      pendingLocations.push({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        timestamp: me.timestamp
      });
      localStorage.setItem('pending-locations', JSON.stringify(pendingLocations));
      $('#settings-icon').addClass('pending-locations');
    }
    else if (!$('#incognito').is(':checked') && !$('#offline.mode').is(':checked')) {
      // send own data to server
      $.ajax({
        url: 'ajax/setloc.php',
        type: 'POST',
        accepts: 'json',
        data: data
      }).done(function (data) {
        if (!data) {
          criticalError('Fehler beim Übertragen deines Standorts');
        }
        else {
          try {
            data = JSON.parse(data);
          }
          catch (e) {
            console.error(e);
            return;
          }
          if (data.status === OK) {
            if (isClustered(me.id)) {
              // TODO: wenn sich der User in einer Gruppe befindet und aus ihr herausbewegt, muss sein Symbol aus der Gruppe herausgelöst werden
            }
          }
          else if (data.status === 'error') {
            criticalError('Fehler beim Übertragen deines Standorts: ' + data.error);
          }
          
        }
      }).error(function (jqXHR, textStatus, errorThrown) {
        criticalError('Fehler beim Übertragen deines Standorts [' + textStatus + ': ' + errorThrown + ']');
      });
    }
  }


  function uploadTracks(files) {
    var i, file, uploadedFiles = 0;
    for (i = 0; i < files.length; ++i) {
      file = files[i];
      if (file instanceof File) {
        $('#track-file-loader-icon').css('visibility', 'visible');
        GPX()
          .done(function (gpxParser) {
            transferLocations(gpxParser.getTrack(), this.fileName, function gpxCallback(data) {
              $('#track-file-loader-icon').css('visibility', 'hidden');
              ++uploadedFiles;
              if (uploadedFiles === files.length)
                showPopup('Upload erfolgreich', 'Alle GPX-Dateien wurden erfolgreich hochgeladen.');
            });
          }.bind({ fileName: file.name }))
          .error(function (e) {
            alert('Fehler beim Verarbeiten der GPX-Datei: ' + e.error);
          }).parse(file);
      }
    };
  }


  function uploadAvatar(blob) {
    var reader = new FileReader(), img, avatar = $('#avatar'), dataUrl,
      send = function () {
        $.ajax({
          url: 'ajax/setoption.php',
          type: 'POST',
          data: {
            oauth: me.oauth,
            option: 'avatar',
            value: dataUrl
          }
        }).done(function (data) {
          if (!data) {
            criticalError('Fehler beim Übertragen deines Avatars!');
            return;
          }
          try {
            data = JSON.parse(data);
          }
          catch (e) {
            criticalError('Fehler beim Übertragen deines Avatars: ' + e);
            return;
          }
          if (data.status === OK) {
            avatar.empty().css('background-image', 'url(' + dataUrl + ')');
            $('#userid').css('background-image', 'url(' + dataUrl + ')');
          }
          else {
            criticalError('Fehler beim Speichern deines Avatars: ' + data.error);
          }
        }).error(function (jqXHR, textStatus, errorThrown) {
          criticalError('Fehler beim Übertragen deines Avatars [' + textStatus + ': ' + errorThrown + ']');
        });
      },
      fitImage = function () {
        var aspectRatio, canvas, ctx, w, h, xoff, yoff;
        if (img.width !== Avatar.OptimalWidth || img.height !== Avatar.OptimalHeight) {
          // scale image
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          canvas.width = Avatar.OptimalWidth;
          canvas.height = Avatar.OptimalHeight;
          aspectRatio = img.width / img.height;
          if (aspectRatio > 1) {
            w = Avatar.OptimalWidth;
            h = Math.round(Avatar.OptimalHeight / aspectRatio);
            xoff = 0;
            yoff = Math.round((Avatar.OptimalHeight - h) / 2);
          }
          else {
            w = Math.round(Avatar.OptimalWidth * aspectRatio);
            h = Avatar.OptimalHeight;
            xoff = Math.round((Avatar.OptimalWidth - w) / 2);
            yoff = 0;
          }
          ctx.fillStyle = Avatar.backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, img.width, img.height, xoff, yoff, w, h);
          dataUrl = canvas.toDataURL('image/jpg');
        }
        send();
      };

    avatar.css('background-image', 'none').css('background-color', 'white').append($('<span></span>').addClass('loader-5-0'));

    if (blob instanceof Image) { // blob contains image
      img = blob;
      fitImage();
    }
    else {
      img = new Image();
      reader.onload = function (e) {
        if (e.target.readyState === FileReader.DONE) {
          dataUrl = 'data:image/png;base64,' + btoa(
          (function (bytes) {
            var binary = '', len = bytes.byteLength, i;
            for (i = 0; i < len; ++i)
              binary += String.fromCharCode(bytes[i]);
            return binary;
          })(new Uint8Array(e.target.result)));
          img.onload = fitImage;
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
      avatar = $('#avatar'), avatarFile = $('#avatar-file'), trackFile = $('#track-file');
    if (settings.css('display') === 'none') {
      settingsIcon.addClass('active');
      settings
        .css('top', $('#info-bar-container').offset().top + 'px')
        .css('display', 'block').css('overflow', 'hidden')
        .animate({
          opacity: 1,
          top: '0px'
        }, {
          easing: 'easeInOutCubic',
          duration: 350,
          complete: function () {
            settings.css('overflow', 'auto');
            $(document).bind({ paste: pasteHandler });
            trackFile.bind({
              change: function (e) {
                uploadTracks(e.target.files);
              }
            });
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
          settingsIcon.removeClass('active');
          $(document).unbind('paste');
          avatarFile.unbind('change');
          trackFile.unbind('change');
          avatar.unbind('dragover').unbind('dragleave').unbind('drop');
        },
        easing: 'easeInOutCubic',
        duration: 350
      });
    }
  }


  function preloadImages() {
    var imgFiles = ['img/loader-5-0.gif', 'img/single-symbol.png'];
    $.each(imgFiles, function (i, f) {
      var img = new Image();
      img.src = f;
    });
  }


  function startPolling() {
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(setPosition, function () {
        // alert('Standortabfrage fehlgeschlagen.');
        console.warn('Standortabfrage fehlgeschlagen.');
      });
      if (pollingId)
        clearInterval(pollingId);
      pollingId = setInterval(getFriends, 1000 * parseInt($('#polling-interval').val(), 10));
    }
    else {
      alert('Dein Browser stellt keine Standortabfragen zur Verfügung.');
    }
  }


  function initApp() {
    if (appInitialized)
      return;
    appInitialized = true;

    showProgressInfo();

    // get http basic auth user
    $.ajax({
      url: 'ajax/me.php',
      accepts: 'json',
      data: {
        oauth: me.oauth
      },
      type: 'POST'
    }).error(function (jqXHR, textStatus, errorThrown) {
      criticalError('Fehler beim Abfragen deiner Daten [' + textStatus + ': ' + errorThrown + ']');
    }).done(function (data) {
      var myPos, pendingLocations;
      hideProgressInfo();
      if (!data) {
        criticalError('Fehler beim Abfragen deiner Daten!');
        return;
      }
      try {
        data = JSON.parse(data);
      }
      catch (e) {
        console.error(e);
        return;
      }

      if (typeof data.userid === 'string') {
        me.id = data.userid;
      }
      else {
        console.error('`me.php` returned an invalid or no userid');
      }

      if (typeof data.name === 'string') {
        me.name = data.name;
        $('#userid').attr('title', 'angemeldet als ' + me.name);
      }

      if (typeof data.avatar === 'string' && data.avatar.indexOf('data:image') === 0) {
        me.avatar = data.avatar;
        $('#avatar').css('background-image', 'url(' + me.avatar + ')');
        $('#userid').css('background-image', 'url(' + me.avatar + ')');
      }
 
      if (typeof data.lat === 'number' && typeof data.lng === 'number') {
        me.latLng = new google.maps.LatLng(data.lat, data.lng);
      }
      else if (myPos = localStorage.getItem('my-last-position')) {
        myPos = myPos.split(',');
        me.latLng = (myPos.length === 2) ? new google.maps.LatLng(myPos[0], myPos[1]) : new google.maps.LatLng(51, 10.3);
      }
      else {
        me.latLng = new google.maps.LatLng(51, 10.3); // last resort (center of Germany)
      }

      $('#userid').click(function () {
        highlightFriend(me.id, true);
      });

      $('#avatar').css('width', Avatar.Width + 'px').css('height', Avatar.Height + 'px');

      $('#avatar-optimal-width').text(Avatar.OptimalWidth);
      $('#avatar-optimal-height').text(Avatar.OptimalHeight);

      $('#settings-icon').click(showHideSettings);
      if (!navigator.onLine)
        $('#settings-icon').addClass('offline');
      try {
        pendingLocations = JSON.parse(localStorage.getItem('pending-locations') || '[]');
      }
      catch (e) {
        console.error('Ungültige Daten in localStorage["pending-locations"]');
      }
      if (pendingLocations && pendingLocations.length > 0) {
        $('#settings-icon').addClass('pending-locations');
        if (navigator.onLine)
          transferPendingLocations();
      }

      $('#buddies').enableHorizontalSlider();

      $('#settings').css('z-index', google.maps.Marker.MAX_ZINDEX + 1000);
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
        var checked = $('#share-my-tracks').is(':checked');
        localStorage.setItem('share-my-tracks', checked);
        $.ajax({
          url: 'ajax/setoption.php',
          type: 'POST',
          data: {
            oauth: me.oauth,
            option: 'sharetracks',
            value: encodeURIComponent(checked)
          },
          accepts: 'json'
        });
      }).prop('checked', data.sharetracks === 'true');

      if (/(iOS|iPad|iPod|iPhone)/.test(navigator.userAgent))
        $('.no-mobile').css('display', 'none');

      $('#incognito').change(function (e) {
        var checked = $('#incognito').is(':checked');
        localStorage.setItem('incognito', checked);
      }).prop('checked', localStorage.getItem('incognito') === 'true');

      $('#offline-mode').change(function (e) {
        var checked = $('#offline-mode').is(':checked');
        localStorage.setItem('offline-mode', checked);
        if (checked) {
          $('#settings-icon').addClass('offline');
        }
        else {
          $('#settings-icon').removeClass('offline');
          transferPendingLocations();
        }
      }).prop('checked', localStorage.getItem('offline-mode') === 'true');

      $('#show-accuracy').change(function (e) {
        var checked = $('#show-accuracy').is(':checked');
        localStorage.setItem('show-accuracy', checked);
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
      map = new google.maps.Map(document.getElementById('map-canvas'), {
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        bounds_changed: function () {
          google.maps.event.addListenerOnce(map, 'idle', getFriends);
        },
        zoom: 13
      });
      if (google.maps.geometry.spherical.computeDistanceBetween)
        computeDistanceBetween = google.maps.geometry.spherical.computeDistanceBetween;
      map.setCenter(me.latLng);

      circle = new google.maps.Circle({
        map: map,
        visible: false,
        strokeColor: '#f00',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#f00',
        fillOpacity: 0.1
      });

      infoWindow = new google.maps.InfoWindow({
        map: null,
        disableAutoPan: true,
      });
      google.maps.event.addListener(infoWindow, 'closeclick', function () { infoWindowClosed = true; });

      overlay = new google.maps.OverlayView();
      overlay.draw = function () { };
      overlay.setMap(map);

      $(window).bind({
        online: goOnline,
        offline: goOffline,
        blur: function (e) { },
        focus: function (e) { }
      });

      google.maps.event.addListenerOnce(map, 'idle', getFriends);

      startPolling();
    });
  }


  function googleSigninCallback(authResult) {
    $('#loader-icon').css('display', 'none');
    hideProgressInfo();
    if (authResult.status.signed_in) {
      $('#logon').removeClass('show').addClass('hide');
      $('#app').removeClass('hide').addClass('show').css('visibility', 'visible');
      $('#googleSigninButton').removeClass('show').addClass('hide');
      me.oauth.token = authResult.id_token;
      me.oauth.clientId = authResult.client_id;
      me.oauth.expiresAt = parseInt(authResult.expires_at, 10);
      me.oauth.expiresIn = parseInt(authResult.expires_in, 10);
      setTimeout(googleAuthorize, 1000 * me.oauth.expiresIn);
      if (me.profile === null) {
        gapi.client.load('plus', 'v1', function loadProfile() {
          gapi.client.plus.people.get({
            'userId': 'me'
          }).execute(function loadProfileCallback(response) {
            var img;
            me.profile = response;
            if (me.avatar === null) {
              img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = function () {
                uploadAvatar(img);
              };
              img.src = me.profile.image.url;
            }
            if (me.name === null) {
              me.name = me.profile.displayName;
              $.ajax({
                url: 'ajax/setoption.php',
                type: 'POST',
                data: {
                  oauth: me.oauth,
                  option: 'name',
                  value: me.name
                }
              }).done(function (data) {
                if (!data) {
                  criticalError('Fehler beim Übertragen deines Namens!');
                  return;
                }
                try {
                  data = JSON.parse(data);
                }
                catch (e) {
                  criticalError('Fehler beim Übertragen deines Namens: ' + e);
                  return;
                }
                if (data.status === OK) {
                  // TODO?
                }
                else {
                  criticalError('Fehler beim Speichern deines Namens: ' + data.error);
                }
              }).error(function (jqXHR, textStatus, errorThrown) {
                criticalError('Fehler beim Übertragen deines Namens [' + textStatus + ': ' + errorThrown + ']');
              });
            }
          });
        });
      }
      initApp();
    }
    else {
      // Possible authResult['error'] values: "user_signed_out" (User is signed-out), "access_denied" (User denied access to your app), "immediate_failed" (Could not automatically log in the user)
      $('#logon').removeClass('hide').addClass('show');
      $('#app').removeClass('show').addClass('hide');
      $('#googleSigninButton').removeClass('hide');
    }
  }


  function googleAuthorize() {
    showProgressInfo();
    gapi.auth.authorize({
      immediate: true,
      client_id: GoogleOAuthClientId,
      scope: 'https://www.googleapis.com/auth/plus.login'
    }, googleSigninCallback);
  }


  return {
    init: function () {
      $.ajax('ajax/config.php')
        .done(function (data) {
          try {
            data = JSON.parse(data);
          }
          catch (e) {
            alert('Konfiguration kann nicht geladen werden. Abbruch.');
            return;
          }
          if (!data) {
            alert('Konfigurationsdaten fehlen. Abbruch.');
            return;
          }
          else if (data.status === OK && data.GoogleOAuthClientId && typeof data.GoogleOAuthClientId === 'string') {
            GoogleOAuthClientId = data.GoogleOAuthClientId;
            $('.g-signin').attr('data-clientid', GoogleOAuthClientId);
            $('<script>').attr('type', 'text/javascript').attr('async', true).attr('src', 'https://apis.google.com/js/client:plusone.js').insertBefore($('script'));
          }
          else {
            alert('Fehlerhafte Konfigurationsdaten. Abbruch.');
            return;
          }
        })
        .error(function (e) {
          alert('Konfiguration kann nicht geladen werden. Abbruch. [' + e + ']');
        });
      preloadImages();
    },
    googleSigninCallback: googleSigninCallback
  };
})();


function googleSigninCallback(authResult) {
  CTLON.googleSigninCallback(authResult);
}
