var CTLAT = (function () {
    var MaxAge = Infinity,
    PollingInterval = 30 * 1000,
    map,
    markers = {},
    me = { id: undefined, lat: undefined, lng: undefined },
    watchId,
    pollingId;
    

    function placeMarker(userid, lat, lng, timestamp) {
	if (typeof markers[userid] === 'undefined') {
	    markers[userid] = new google.maps.Marker({
		title: userid + ' (' + timestamp.toLocaleString() + ')',
		icon: {
		    url: 'http://mt.google.com/vt/icon?psize=10&font=fonts/Roboto-Bold.ttf&color=ff551111&name=icons/spotlight/spotlight-waypoint-b.png&ax=43&ay=50&text=' + userid + '&scale=1'
		},
		animation: google.maps.Animation.DROP,
		map: map
	    });
	}
	markers[userid].setPosition(new google.maps.LatLng(lat, lng));
    }


    function highlightFriend(userid) {
	var m = markers[userid];
	if (typeof m !== 'object')
	    return;
	$.each(markers, function(i, marker) {
	    marker.setAnimation(google.maps.Animation.NONE);
	});
	centerMapOn(m.getPosition().lat(), m.getPosition().lng());
	m.setAnimation(google.maps.Animation.BOUNCE);
    }


    function centerMapOn(lat, lng) {
	map.setCenter(new google.maps.LatLng(lat, lng));
    }


    function getFriends() {
	var xhr = new XMLHttpRequest;	
	xhr.open('GET', 'friends.php', true);
	xhr.onreadystatechange = function () {
	    var data;
	    if (xhr.readyState === 4) {
		$('#buddies').empty();
		data = JSON.parse(xhr.responseText);
		$.each(data, function(userid, friend) {
		    var timestamp = new Date(friend.timestamp * 1000).toLocaleString();
		    friend.id = userid;
		    if (friend.id !== me.id) {
			$('#buddies').append($('<span>' + userid + '</span>')
			    .addClass('buddy')
			    .attr('data-lat', friend.lat)
			    .attr('data-lng', friend.lng)
			    .attr('data-timestamp', friend.timestamp)
			    .attr('title', 'last update: ' + timestamp)
			    .click(function() {
				highlightFriend(friend.id);
			    }.bind(friend)));
			placeMarker(userid, friend.lat, friend.lng, timestamp);
		    }
		});
	    }
	};
	xhr.send(null);
    }
    
    
    function setPosition(pos) {
	var xhr;
	me.lat = pos.coords.latitude;
	me.lng  = pos.coords.longitude;
	me.timestamp = Math.floor(pos.timestamp / 1000);
	map.setCenter(new google.maps.LatLng(me.lat, me.lng));
	// send own location to server
	xhr = new XMLHttpRequest;
	xhr.open('GET', 'setloc.php' +
		 '?userid=' + me.id + 
		 '&lat=' + me.lat + 
		 '&lng=' + me.lng + 
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
	};
	var infowindow = new google.maps.InfoWindow(options);
	map.setCenter(options.position);
    }

    
    return {
	init: function () {
	    var xhr;

	    // get http basic auth user
	    xhr = new XMLHttpRequest;
	    xhr.open('GET', 'me.php', false);
	    xhr.send(null);
	    me.id = xhr.responseText;
	    $('#userid').text(me.id).click(function() {
		centerMapOn(me.lat, me.lng);
	    });

	    // init Google Maps
	    google.maps.visualRefresh = true;
	    map = new google.maps.Map(document.getElementById('map-canvas'), { zoom: 13 });

	    // start polling
	    if (navigator.geolocation) {
		watchId = navigator.geolocation.watchPosition(setPosition, function() {
		    noGeolocation('Dein Browser stellt keine Standortabfragen zur Verf&uuml;gung.');
		});
		pollingId = setInterval(getFriends, PollingInterval);
		getFriends();
	    }
	    else {
		noGeolocation('Standortabfrage fehlgeschlagen.');
	    }
	}
    };
})();

google.maps.event.addDomListener(window, 'load', CTLAT.init);
