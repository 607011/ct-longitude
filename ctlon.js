var CTLON = (function () {
    "use strict";

    var MaxDistance = 20 * 1000 /* meters */,
    PollingInterval = 30 * 1000 /* milliseconds */, 
    getFriendsPending = false,
    map = null,
    circle = null,
    markers = {},
    me = { id: undefined, latLng: null },
    watchId = undefined,
    pollingId = undefined;
    

    function placeMarker(userid, lat, lng, timestamp) {
	var url = (userid === me.id)
	    ? 'http://mt.google.com/vt/icon?psize=10&font=fonts/Roboto-Bold.ttf&color=ff115511&name=icons/spotlight/spotlight-waypoint-a.png&ax=43&ay=50&text=' + userid + '&scale=1'
	    :  'http://mt.google.com/vt/icon?psize=10&font=fonts/Roboto-Bold.ttf&color=ff551111&name=icons/spotlight/spotlight-waypoint-b.png&ax=43&ay=50&text=' + userid + '&scale=1';
	if (typeof markers[userid] === 'undefined') {
	    markers[userid] = new google.maps.Marker({
		title: userid + ' (' + timestamp.toLocaleString() + ')',
		icon: { url: url },
		animation: google.maps.Animation.DROP,
		map: map
	    });
	}
	markers[userid].setPosition(new google.maps.LatLng(lat, lng));
    }


    function highlightFriend(userid) {
	var m = markers[userid], accuracy;
	if (typeof m !== 'object')
	    return;
	$.each(markers, function(i, marker) {
	    marker.setAnimation(google.maps.Animation.NONE);
	});
	centerMapOn(m.getPosition().lat(), m.getPosition().lng());
	m.setAnimation(google.maps.Animation.BOUNCE);
	accuracy = parseInt($('#buddy-' + userid).attr('data-accuracy'));
	if (!circle) {
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
    }


    function centerMapOn(lat, lng) {
	map.setCenter(new google.maps.LatLng(lat, lng));
    }


    function getFriends() {
	if (getFriendsPending)
	    return;
	getFriendsPending = true;
	var xhr = new XMLHttpRequest;	
	xhr.open('GET', 'friends.php', true);
	xhr.onreadystatechange = function () {
	    var data,
	    range = google.maps.geometry.spherical.computeDistanceBetween(map.getBounds().getNorthEast(),
									  map.getBounds().getSouthWest()) / 2;
	    $('#range').html((1e-3 * range).toFixed(3) + '&nbsp;km');
	    if (xhr.readyState === 4) {
		setTimeout(function() { getFriendsPending = false; }, 1000);
		$('#buddies').empty();
		data = JSON.parse(xhr.responseText);
		$.each(data, function(userid, friend) {
		    var timestamp = new Date(friend.timestamp * 1000).toLocaleString(), range = MaxDistance, ne, sw;
		    friend.id = userid;
		    friend.latLng = new google.maps.LatLng(friend.lat, friend.lng);
		    if (friend.id !== me.id) {
			if (google.maps.geometry.spherical.computeDistanceBetween(me.latLng, friend.latLng) < range) {
			    $('#buddies')
				.append($('<span>' + userid + '</span>')
					.addClass('buddy').attr('id', 'buddy-' + friend.id)
					.attr('data-lat', friend.lat)
					.attr('data-lng', friend.lng)
					.attr('data-accuracy', friend.accuracy)
					.attr('data-timestamp', friend.timestamp)
					.attr('title', 'last update: ' + timestamp)
					.click(function() {
					    highlightFriend(friend.id);
					}.bind(friend)));
			    placeMarker(userid, friend.lat, friend.lng, timestamp);
			}
		    }
		});
	    }
	};
	xhr.send(null);
    }
    
    
    function setPosition(pos) {
	var xhr;
	me.timestamp = Math.floor(pos.timestamp / 1000);
	me.latLng = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
	map.setCenter(me.latLng);
	// send own location to server
	xhr = new XMLHttpRequest;
	xhr.open('GET', 'setloc.php' +
		 '?userid=' + me.id + 
		 '&lat=' + me.latLng.lat() + 
		 '&lng=' + me.latLng.lng() + 
		 '&accuracy=' + pos.coords.accuracy + 
		 '&heading=' + pos.coords.heading + 
		 '&speed=' + pos.coords.speed + 
		 '&altitude=' + pos.coords.altitude + 
		 '&altitudeaccuracy=' + pos.coords.altitudeAccuracy + 
		 '&timestamp=' + me.timestamp, true);
	xhr.onreadystatechange = function () {
	    var data;
	    if (xhr.readyState === 4) {
		data = JSON.parse(xhr.responseText);
		if (data.status === 'ok' && data.userid === me.id) {
		    placeMarker(data.userid, data.lat, data.lng, new Date(data.timestamp * 1000).toLocaleString());
		    getFriends();
		}
	    }
	};
	xhr.send(null);
    }


    function noGeolocation(msg) {
	var options = {
	    map: map,
	    position: new google.maps.LatLng(60, 105),
	    content: msg
	},
	infowindow = new google.maps.InfoWindow(options);
	map.setCenter(options.position);
    }

    
    return {
	init: function () {
	    var xhr, mapOptions;

	    // get http basic auth user
	    xhr = new XMLHttpRequest;
	    xhr.open('GET', 'me.php', false);
	    xhr.send(null);
	    me.id = xhr.responseText;
	    $('#userid').text(me.id).click(function() {
		centerMapOn(me.latLng.lat(), me.latLng.lng());
	    });

	    // init Google Maps
	    google.maps.visualRefresh = true;
	    mapOptions = {
		bounds_changed: function() { getFriends(); },
		zoom: 13
	    };
	    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

	    // start polling
	    if (navigator.geolocation) {
		watchId = navigator.geolocation.watchPosition(setPosition, function() {
		    noGeolocation('Dein Browser stellt keine Standortabfragen zur Verf&uuml;gung.');
		});
		pollingId = setInterval(getFriends, PollingInterval);
	    }
	    else {
		noGeolocation('Standortabfrage fehlgeschlagen.');
	    }
	}
    };
})();

google.maps.event.addDomListener(window, 'load', CTLON.init);
