const axios = require("axios");
const axiosJsonpAdapter = require("axios-jsonp");
const direction = require("./direction");
let hinanjyoMarkers = [];
let escapeMarker = null;

mapboxgl.accessToken = "pk.eyJ1Ijoic2hteXQiLCJhIjoiY2ozbWE0djUwMDAwMjJxbmR6c2cxejAyciJ9.pqa04_rvKov3Linf7IAWPw";
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g', // the outdoors-v10 style but without Hillshade layers
    center: [139.767, 35.681],
    zoom: 11
});

map.on('load', function () {
    // map.addSource('gis-dem', {
    //     "type": "raster-dem",
    //     "encoding": "gsi",
    //     "tiles": [
    //         "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png"
    //     ],
    //     "tileSize": 256,
    //     "maxzoom": 14,
    //     "attribution": '<a href="https://maps.gsi.go.jp/development/ichiran.html#dem" target="_blank">地理院標高タイル</a>'
    // });
    map.addSource('dem', {
        "type": "raster-dem",
        "url": "mapbox://mapbox.terrain-rgb"
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
        }
    });
    // map.addLayer({
    //     "id": "GSI dem",
    //     "source": "gsi-dem",
    //     "type": "hillshade"
    // }, 'waterway-river-canal-shadow');
    map.addLayer({
        "id": "dem",
        "type": "hillshade",
        "source": "dem",
        "minzoom": 0,
        "maxzoom": 18,
    });
    map.addLayer({
        "id": "KYUKEISHAKEIKAIKUIKI",
        "type": "raster",
        "source": "KYUKEISHAKEIKAIKUIKI",
        "minzoom": 0,
        "maxzoom": 18,
        'layout': {
            'visibility': 'visible',
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
        }
    });
    map.addLayer();
    map.addLayer();
});



// コントロール関係表示
map.addControl(new mapboxgl.NavigationControl());

// 現在位置表示
map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true
}));

// 洪水レイヤー削除
document.getElementById('kouzui').addEventListener('click', () => {
    const layer = 'KOUZUI';
    const visibility = map.getLayoutProperty(layer, 'visibility');
    if (visibility === 'visible') {
        map.setLayoutProperty(layer, 'visibility', 'none');
    } else {
        map.setLayoutProperty(layer, 'visibility', 'visible');
    }
});

// 土砂レイヤー削除
document.getElementById('dosya').addEventListener('click', () => {
    const layer1 = 'KYUKEISHAKEIKAIKUIKI';
    const layer2 = 'DOSEKIRYUKIKENKEIRYU';
    const visibility1 = map.getLayoutProperty(layer1, 'visibility');

    if (visibility1 === 'visible') {
        map.setLayoutProperty(layer1, 'visibility', 'none');
        map.setLayoutProperty(layer2, 'visibility', 'none');
    } else {
        map.setLayoutProperty(layer1, 'visibility', 'visible');
        map.setLayoutProperty(layer2, 'visibility', 'visible');
    }
});

/**
 * 避難所取得
 * @param {} lat 
 * @param {*} lng 
 */
async function requestHinanjyoAPI(lat, lng) {
    var url = `https://map.yahooapis.jp/search/local/V1/localSearch?appid=dj00aiZpPWthaFNxUDdmN3pTUSZzPWNvbnN1bWVyc2VjcmV0Jng9Y2Y-&output=jsonp&gc=0425&dist=3&results=100&lat=${lat}&lon=${lng}`;
    const config = {
        adapter: axiosJsonpAdapter
    };
    return await axios(url, config).then(res => {
        return res;
    });
}

if ("geolocation" in navigator) {
    navigator.geolocation.watchPosition(async position => {
        console.log("位置 更新!!!");
        // 避難所を更新ごとに一旦消す
        clearEscapeMarker();
        clearHinanjyoMarkers();

        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        const result = await requestHinanjyoAPI(currentLat, currentLng);
        if (!result.data.Feature) {
            return;
        }
        // 新しい位置での避難所表示
        result.data.Feature.forEach(f => {
            const coordinates = f.Geometry.Coordinates.split(',');
            createHinanjyoMarker(coordinates[1], coordinates[0], f.Name);
        });

        // ground escape direction 
        const escapeDirection = await direction.suggestDirection({ lat: currentLat, lon: currentLng });
        if (!escapeDirection) {
            return;
        }
        createEscapeDirectionMarker(escapeDirection.lat, escapeDirection.lon);
        console.log(escapeDirection);

    }, (err) => { });
} else { /* geolocation IS NOT available, handle it */ }

function createHinanjyoMarker(lat, lng, name) {
    var el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundColor = 'green';
    el.style.width = '10px';
    el.style.height = '10px';

    // el.addEventListener('click', function () {
    //     window.alert(marker.properties.message);
    // });
    // create the popup
    var popup = new mapboxgl.Popup()
        .setText(name);

    // add marker to map
    const marker = new mapboxgl.Marker(el)
        .setPopup(popup)
        .setLngLat(new mapboxgl.LngLat(lng, lat));
    marker.addTo(map);
    // marker.togglePopup();
    hinanjyoMarkers.push(marker);
}

function createEscapeDirectionMarker(lat, lng) {
    var el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundColor = 'red';
    el.style.width = '15px';
    el.style.height = '15px';

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