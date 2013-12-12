var CTLAT = (function () {
    var MaxAge = Infinity,
    map = null,
    markers = {},
    userId, lat, lng,
    watchId,
    pollingId;
    

    function placeMarker(userid, lat, lng, timestamp) {
	if (typeof markers[userid] === 'undefined') {
	    markers[userid] = new google.maps.Marker({
		title: userid + ' (' + timestamp.toLocaleString() + ')',
		map: map
	    });
	}
	markers[userid].setPosition(new google.maps.LatLng(lat, lng));
    }


    function centerMapOn(lat, lng) {
	var latLng = new google.maps.LatLng(lat, lng);
	map.setCenter(latLng);
    }


    function timeDiffString(t0, t1) {
    }

    
    function getFriends() {
	var xhr = new XMLHttpRequest;	
	xhr.open('GET', 'friends.php', true);
	xhr.onreadystatechange = function () {
	    var i, data, friend, keys, timestamp;
	    if (xhr.readyState === 4) {
		$('#buddies').empty();
		data = JSON.parse(xhr.responseText);
		keys = Object.keys(data);
		for (i = 0; i < keys.length; ++i) {
		    userid = keys[i];
		    friend = data[userid];
		    timestamp = new Date(friend.timestamp * 1000).toLocaleString();
		    if (userid !== userId) {
			$('#buddies').append($('<span>' + userid + '</span>')
			    .addClass('buddy')
			    .attr('data-lat', friend.lat)
			    .attr('data-lng', friend.lng)
			    .attr('data-timestamp', friend.timestamp)
			    .attr('title', 'last update: ' + timestamp)
			    .click(function() {
				centerMapOn(this.lat, this.lng);
			    }.bind(friend)));
		    }
		    placeMarker(userid, friend.lat, friend.lng, timestamp);
		}
	    }
	};
	xhr.send(null);
    }
    
    
    function setPosition(pos) {
	var xhr, timestamp;
	lat = pos.coords.latitude;
	lng  = pos.coords.longitude;
	timestamp = Math.floor(pos.timestamp / 1000);
	map.setCenter(new google.maps.LatLng(lat, lng));
	// send own location to server
	xhr = new XMLHttpRequest;
	xhr.open('GET', 'setloc.php' +
		 '?userid=' + userId + 
		 '&lat=' + lat + 
		 '&lng=' + lng + 
		 '&accuracy=' + pos.coords.accuracy + 
		 '&heading=' + pos.coords.heading + 
		 '&speed=' + pos.coords.speed + 
		 '&altitude=' + pos.coords.altitude + 
		 '&altitudeaccuracy=' + pos.coords.altitudeAccuracy + 
		 '&timestamp=' + timestamp, true);
	xhr.onreadystatechange = function () {
	    var data;
	    if (xhr.readyState === 4) {
		data = JSON.parse(xhr.responseText);
		if (data.status === 'ok' && data.userid === userId) {
		    // ...
		}
	    }
	};
	xhr.send(null);
    }

    
    return {
	init: function () {
	    var xhr;

	    // get http basic auth user
	    xhr = new XMLHttpRequest;
	    xhr.open('GET', 'me.php', false);
	    xhr.send(null);
	    userId = xhr.responseText;
	    $('#userid').text(userId).click(function() {
		centerMapOn(lat, lng);
	    });

	    // init Google Maps
	    google.maps.visualRefresh = true;
	    map = new google.maps.Map(document.getElementById('map-canvas'), { zoom: 13 });

	    // start polling
	    watchId = navigator.geolocation.watchPosition(setPosition);
	    pollingId = setInterval(getFriends, 10 * 1000);
	    getFriends();
	}
    };
})();

google.maps.event.addDomListener(window, 'load', CTLAT.init);
