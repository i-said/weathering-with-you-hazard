const axios = require("axios");
const axiosJsonpAdapter = require("axios-jsonp");
const direction = require("./direction");
let hinanjyoMarkers = [];
let escapeMarker = null;
let previousEscapeDirection = null;


navigator.serviceWorker.register('./sw-gsidem2mapbox.js', {
    scope: './'
}).then(registration => {
    if (!navigator.serviceWorker.controller) location.reload();
});

const access_token = 'pk.eyJ1Ijoic2hteXQiLCJhIjoiY2ozbWE0djUwMDAwMjJxbmR6c2cxejAyciJ9.pqa04_rvKov3Linf7IAWPw';
mapboxgl.accessToken = access_token
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g', // the outdoors-v10 style but without Hillshade layers
    center: [139.767, 35.681],
    zoom: 11
});

map.on('load', function () {
    const mapopacity = 0.7
    // map.addSource('dem', {
    //     "type": "raster-dem",
    //     "url": "mapbox://mapbox.terrain-rgb"
    // });
    // map.addSource('gsi-pale', {
    //     "type": "raster",
    //     "tiles": [
    //         "https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png"
    //     ],
    //     "tileSize": 256,
    //     "attribution": "<a href='https://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>"
    // });
    map.addSource('gsi-dem', {
        "type": "raster-dem",
        "tiles": [
            "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png"
        ],
        "tileSize": 256,
        "maxzoom": 15,
        "attribution": "<a href='https://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>"
    });
    map.addSource('MIERUNEMAP', {
        "type": "raster",
        "tiles": ["https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png@2x"],
        "tileSize": 256,
        "attribution": "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."
    });
    map.addSource('KOUZUI', {
        "type": "raster",
        "tiles": ["https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png"],
        "tileSize": 256
    });
    map.addSource('KYUKEISHAKEIKAIKUIKI', {
        "type": "raster",
        "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png"],
        "tileSize": 256
    });
    map.addSource('DOSEKIRYUKIKENKEIRYU', {
        "type": "raster",
        "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu/{z}/{x}/{y}.png"],
        "tileSize": 256
    });


    // map.addLayer({
    //     "id": "MIERUNEMAP",
    //     "type": "raster",
    //     "source": "MIERUNEMAP",
    //     "minzoom": 0,
    //     "maxzoom": 18
    // });

    map.addLayer({
        "id": "KOUZUI",
        "type": "raster",
        "source": "KOUZUI",
        "minzoom": 0,
        "maxzoom": 18,
        'layout': {
            'visibility': 'visible',
        },
        "paint": {
            'raster-opacity': mapopacity,
        }
    });

    // map.addLayer({
    //     "id": "GSI pale dem",
    //     "source": "gsi-pale",
    //     "type": "raster"
    // });
    // map.addLayer({
    //     "id": "dem",
    //     "type": "hillshade",
    //     "source": "dem",
    //     "minzoom": 0,
    //     "maxzoom": 18,
    // });

    map.addLayer({
        "id": "GSI dem",
        "source": "gsi-dem",
        "type": "hillshade",
    }, 'waterway-river-canal-shadow');

    map.addLayer({
        "id": "KYUKEISHAKEIKAIKUIKI",
        "type": "raster",
        "source": "KYUKEISHAKEIKAIKUIKI",
        "minzoom": 0,
        "maxzoom": 18,
        'layout': {
            'visibility': 'visible',
        },
        "paint": {
            'raster-opacity': mapopacity,
        }
    });

    map.addLayer({
        "id": "DOSEKIRYUKIKENKEIRYU",
        "type": "raster",
        "source": "DOSEKIRYUKIKENKEIRYU",
        "minzoom": 0,
        "maxzoom": 18,
        'layout': {
            'visibility': 'visible',
        },
        "paint": {
            'raster-opacity': mapopacity,
        }
    });

    // 現在位置連動処理
    if ("geolocation" in navigator) {
        navigator.geolocation.watchPosition(async position => {
            console.log("位置 更新!!!");
            // 避難所を更新ごとに一旦消す
            clearEscapeMarker();
            clearHinanjyoMarkers();

            const currentLat = position.coords.latitude;
            const currentLng = position.coords.longitude;

            // 経路再検索判断
            if (!previousEscapeDirection) {
                fetchUserEscapeData(currentLat, currentLng);
            } else if (getDistance(currentLat, currentLng, escapeDirection.lat, escapeDirection.lon) < 5 && previousEscapeDirection && previousEscapeDirection.lat !== escapeMarker.lat && previousEscapeDirection.lng !== escapeMarker.lng) {
                fetchUserEscapeData(currentLat, currentLng);
            }
        }, (err) => { });
    } else { /* geolocation IS NOT available, handle it */ }
});

// コントロール関係表示
map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.ScaleControl());

// 現在位置表示
map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserLocation: true
}));

// 洪水レイヤー削除
document.getElementById('kouzui').addEventListener('click', (elm) => {
    const layer = 'KOUZUI';
    const visibility = map.getLayoutProperty(layer, 'visibility');
    if (visibility === 'visible') {
        elm.target.innerText = "洪水情報 非表示中";
        elm.target.classList.add('deactive');
        map.setLayoutProperty(layer, 'visibility', 'none');
    } else {
        elm.target.innerText = "洪水情報 表示中";
        elm.target.classList.remove('deactive');

        map.setLayoutProperty(layer, 'visibility', 'visible');
    }
});

// 土砂レイヤー削除
document.getElementById('dosya').addEventListener('click', (elm) => {
    const layer1 = 'KYUKEISHAKEIKAIKUIKI';
    const layer2 = 'DOSEKIRYUKIKENKEIRYU';
    const visibility1 = map.getLayoutProperty(layer1, 'visibility');

    if (visibility1 === 'visible') {
        elm.target.innerText = "土砂・災害情報 非表示中";
        elm.target.classList.add('deactive');
        map.setLayoutProperty(layer1, 'visibility', 'none');
        map.setLayoutProperty(layer2, 'visibility', 'none');
    } else {
        elm.target.innerText = "土砂・災害情報 表示中";
        elm.target.classList.remove('deactive');
        map.setLayoutProperty(layer1, 'visibility', 'visible');
        map.setLayoutProperty(layer2, 'visibility', 'visible');
    }
});

// 標高レイヤー削除
document.getElementById('hyoukou').addEventListener('click', (elm) => {
    const layer = 'GSI dem';
    const visibility = map.getLayoutProperty(layer, 'visibility');
    if (visibility === 'visible') {
        elm.target.innerText = "標高情報 非表示中";
        elm.target.classList.add('deactive');
        map.setLayoutProperty(layer, 'visibility', 'none');
    } else {
        elm.target.innerText = "標高情報 表示中";
        elm.target.classList.remove('deactive');
        map.setLayoutProperty(layer, 'visibility', 'visible');
    }
});

/**
 * 避難所取得
 * @param {} lat 
 * @param {*} lng 
 */
async function requestHinanjyoAPI(lat, lng) {
    var url = `https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPWthaFNxUDdmN3pTUSZzPWNvbnN1bWVyc2VjcmV0Jng9Y2Y-&output=jsonp&gc=0425&dist=3&results=100&lat=${lat}&lon=${lng}&sort=dist`;
    const config = {
        adapter: axiosJsonpAdapter
    };
    return await axios(url, config).then(res => {
        return res;
    });
}

async function requestRouteAPI(flat, flng, tlat, tlng) {
    var url = `https://api.mapbox.com/directions/v5/mapbox/walking/${tlng},${tlat};${flng},${flat}?geometries=geojson&access_token=${access_token}`;
    return await axios(url).then(res => {
        return res;
    });
}


function createHinanjyoMarker(lat, lng, name) {
    var el = document.createElement('div');
    el.className = 'marker';
    // el.style.backgroundColor = 'green';
    el.style.backgroundImage = 'url(./zmap_icon_h.png)';
    el.style.backgroundSize = 'cover';
    el.style.width = '25px';
    el.style.height = '25px';

    // create the popup
    var popup = new mapboxgl.Popup()
        .setText(name);

    // add marker to map
    const marker = new mapboxgl.Marker(el)
        .setPopup(popup)
        .setLngLat(new mapboxgl.LngLat(lng, lat));
    marker.addTo(map);
    hinanjyoMarkers.push(marker);
}

function createNaviMaker(lat, lng) {
    var el = document.createElement('div');
    el.className = 'navigate-solid icon';
    // add marker to map
    const marker = new mapboxgl.Marker(el)
        .setLngLat(new mapboxgl.LngLat(lng, lat));
    marker.addTo(map);
}

function createEscapeDirectionMarker(lat, lng) {
    var el = document.createElement('div');
    // el.className = 'pin-solid icon';
    el.style.backgroundImage = 'url(./zmap_icon_goal.png)';
    el.style.backgroundSize = 'cover';
    el.style.width = '25px';
    el.style.height = '25px';

    // add marker to map
    const marker = new mapboxgl.Marker(el)
        .setLngLat(new mapboxgl.LngLat(lng, lat));
    marker.addTo(map);
    escapeMarker = marker;
}

function clearHinanjyoMarkers() {
    for (let index = 0; index < hinanjyoMarkers.length; index++) {
        const m = hinanjyoMarkers[index];
        m.remove();
    }
    hinanjyoMarkers = [];
}

function clearEscapeMarker() {
    if (escapeMarker) {
        escapeMarker.remove();
    }
    escapeMarker = null;
}

async function clearAndcreateRoute(flat, flng, tlat, tlng) {
    const LayerRouteId = 'layer-route';
    const route = await requestRouteAPI(flat, flng, tlat, tlng);
    console.log(route);
    if (!route) {
        return;
    }
    console.log(route);
    const routeGeometry = route.data.routes[0].geometry;
    console.log(routeGeometry);
    if (!routeGeometry) {
        return;
    }

    if (map.getLayer(LayerRouteId)) {
        map.removeLayer(LayerRouteId);
        map.removeSource(LayerRouteId);
    }

    map.addLayer({
        "id": LayerRouteId,
        "type": "line",
        "source": {
            "type": "geojson",
            "data": routeGeometry
        },
        "layout": {
            "line-join": "round",
            "line-cap": "round"
        },
        "paint": {
            "line-color": "#1976d2",
            "line-width": 4
        }
    }
    );
}

//２点間を計算する関数
//距離の計算//
function getDistance(lat1, lng1, lat2, lng2) {

    function radians(deg) {
        return deg * Math.PI / 180;
    }

    return 6378.14 * Math.acos(Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.cos(radians(lng2) - radians(lng1)) +
        Math.sin(radians(lat1)) *
        Math.sin(radians(lat2)));
};

async function fetchUserEscapeData(currentLat, currentLng) {
    const result = await requestHinanjyoAPI(currentLat, currentLng);
    if (!result.data.Feature) {
        return;
    }
    // 新しい位置での避難所表示
    let coordinates;
    result.data.Feature.forEach(f => {
        coordinates = f.Geometry.Coordinates.split(',');
        createHinanjyoMarker(coordinates[1], coordinates[0], f.Name);
    });

    // ground escape direction 
    const escapeDirection = await direction.suggestDirection({ lat: currentLat, lon: currentLng });
    // if (!escapeDirection) {
    //     return;
    // }

    createEscapeDirectionMarker(escapeDirection.lat, escapeDirection.lon);
    createNaviMaker(escapeDirection.guideLocation.lat, escapeDirection.guideLocation.lon);

    // await clearAndcreateRoute(currentLat, currentLng, escapeDirection.lat, escapeDirection.lon);
    await clearAndcreateRoute(currentLat, currentLng, coordinates[1], coordinates[0]);
}