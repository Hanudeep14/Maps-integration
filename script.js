document.addEventListener('DOMContentLoaded', () => {
    // Default location (London)
    const defaultLat = 51.505;
    const defaultLng = -0.09;

    // Initialize Map
    const map = L.map('map').setView([defaultLat, defaultLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let properties = [];
    let markers = [];
    let userMarker = null;
    let userLocation = null;

    // Use data from data.js
    properties = propertiesData;
    displayProperties(properties);
    addMarkers(properties);

    // Search Logic
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        handleSearch(query);
    });

    // Request location when user focuses on search
    searchInput.addEventListener('focus', () => {
        if (!userLocation) {
            const statusMsg = document.getElementById('status-msg');
            statusMsg.textContent = 'Requesting location access...';
            getUserLocation();
        }
    });

    const locationBtn = document.getElementById('get-location-btn');
    if (locationBtn) {
        locationBtn.addEventListener('click', () => {
            const statusMsg = document.getElementById('status-msg');
            statusMsg.textContent = 'Getting your location...';
            getUserLocation({ shouldCenterMap: true });
        });
    }

    function getUserLocation(options = {}) {
        const {
            shouldCenterMap = false,
            successMessage = 'Location found. Results sorted by distance.'
        } = options;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    updateUserMarker(userLocation.lat, userLocation.lng);
                    if (shouldCenterMap) {
                        map.setView([userLocation.lat, userLocation.lng], 13);
                    }

                    // Update status message
                    const statusMsg = document.getElementById('status-msg');
                    statusMsg.textContent = successMessage;
                    setTimeout(() => { statusMsg.textContent = ''; }, 3000);

                    // Re-run search (even if empty) to apply distance sorting
                    handleSearch(searchInput.value.toLowerCase());
                },
                (error) => {
                    console.log("Location access denied or error:", error);
                    const statusMsg = document.getElementById('status-msg');
                    let errorMsg = 'Location error.';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMsg = 'Location access denied.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMsg = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMsg = 'The request to get user location timed out.';
                            break;
                    }
                    statusMsg.textContent = errorMsg;
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 0
                }
            );
        } else {
            document.getElementById('status-msg').textContent = 'Geolocation is not supported by this browser.';
        }
    }

    function handleSearch(query) {
        let filtered = properties.filter(prop =>
            prop.name.toLowerCase().includes(query) ||
            prop.description.toLowerCase().includes(query)
        );

        if (userLocation) {
            // Sort by distance if location is available
            filtered = filtered.map(prop => {
                return {
                    ...prop,
                    distance: getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, prop.lat, prop.lng)
                };
            }).sort((a, b) => a.distance - b.distance);
        }

        displayProperties(filtered);
        addMarkers(filtered);
    }

    // Display Properties in List
    function displayProperties(props) {
        const listContainer = document.getElementById('property-list');
        listContainer.innerHTML = '';

        if (props.length === 0) {
            listContainer.innerHTML = '<p>No properties found.</p>';
            return;
        }

        props.forEach(prop => {
            const card = document.createElement('div');
            card.className = 'property-card';

            let distanceHtml = '';
            if (prop.distance) {
                distanceHtml = `<p class="property-distance" style="color: #2563eb; font-size: 0.9rem; margin-bottom: 0.5rem;"><strong>${prop.distance.toFixed(2)} km away</strong></p>`;
            }

            card.innerHTML = `
                <img src="${prop.image}" alt="${prop.name}">
                <div class="property-info">
                    <h3>${prop.name}</h3>
                    <div class="property-price">${prop.price}</div>
                    ${distanceHtml}
                    <p class="property-desc">${prop.description}</p>
                    <a href="details.html?id=${prop.id}" class="btn-details">View Details →</a>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    // Add Markers to Map
    function addMarkers(props) {
        // Clear existing markers
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        props.forEach(prop => {
            const marker = L.marker([prop.lat, prop.lng])
                .addTo(map)
                .bindPopup(`
                    <b>${prop.name}</b><br>
                    ${prop.price}<br>
                    <a href="details.html?id=${prop.id}">View Details</a>
                `);
            markers.push(marker);
        });
    }

    function updateUserMarker(lat, lng) {
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            })
        }).addTo(map).bindPopup("You are here");
    }

    // Find Nearest Logic
    document.getElementById('find-nearest-btn').addEventListener('click', () => {
        const statusMsg = document.getElementById('status-msg');
        statusMsg.textContent = 'Locating...';

        if (!navigator.geolocation) {
            statusMsg.textContent = 'Geolocation is not supported by your browser.';
            return;
        }

        getUserLocation({
            shouldCenterMap: true,
            successMessage: 'Found nearest properties!'
        });
    });

    // Haversine Formula
    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);
        var dLon = deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
});
