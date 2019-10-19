const axios = require("axios");
const axiosJsonpAdapter = require("axios-jsonp");
const hinanjyoMarkers = [];

mapboxgl.accessToken = "pk.eyJ1Ijoic2hteXQiLCJhIjoiY2ozbWE0djUwMDAwMjJxbmR6c2cxejAyciJ9.pqa04_rvKov3Linf7IAWPw";
var map = new mapboxgl.Map({
    container: "map",
    style: {
        "version": 8,
        "sources": {
            // "NORMAL": {
            //     "type": "vector",
            //     "url": "mapbox://styles/mapbox/streets-v11"
            // },
            // "MIZU": {
            //     "type": "vector",
            //     "url": "mapbox://styles/v1/shmyt/cj4dvtopr044m2sn5m86h4ih2"
            // },
            'dem': {
                "type": "raster-dem",
                "url": "mapbox://mapbox.terrain-rgb"
            },
            "MIERUNEMAP": {
                "type": "raster",
                "tiles": ["https://tile.mierune.co.jp/mierune_mono/{z}/{x}/{y}.png"],
                "tileSize": 256,
                "attribution": "Maptiles by <a href='http://mierune.co.jp/' target='_blank'>MIERUNE</a>, under CC BY. Data by <a href='http://osm.org/copyright' target='_blank'>OpenStreetMap</a> contributors, under ODbL."
            },
            "KOUZUI": {
                "type": "raster",
                "tiles": ["https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin/{z}/{x}/{y}.png"],
                "tileSize": 256
            },
            // 急傾斜警戒区域
            "KYUKEISHAKEIKAIKUIKI": {
                "type": "raster",
                "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png"],
                "tileSize": 256
            },
            // 土石流警戒区域
            "DOSEKIRYUKIKENKEIRYU": {
                "type": "raster",
                "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_dosekiryukikenkeiryu/{z}/{x}/{y}.png"],
                "tileSize": 256
            },
            // "wms": {
            //     'type': 'raster',
            //     'tiles': [
            //         'https://img.nj.gov/imagerywms/Natural2015?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=Natural2015'
            //     ],
            //     'tileSize': 256
            // }
            // "MIZU": {
            //     "type": "vector",
            //     "tiles": "mapbox://styles/v1/shmyt/cj4dvtopr044m2sn5m86h4ih2"
            // }
        },
        "layers": [
            {
                "id": "MIERUNEMAP",
                "type": "raster",
                "source": "MIERUNEMAP",
                "minzoom": 0,
                "maxzoom": 18
            },
            {
                "id": "KOUZUI",
                "type": "raster",
                "source": "KOUZUI",
                "minzoom": 0,
                "maxzoom": 18,
                'layout': {
                    'visibility': 'visible',
                }
            },
            {
                "id": "KYUKEISHAKEIKAIKUIKI",
                "type": "raster",
                "source": "KYUKEISHAKEIKAIKUIKI",
                "minzoom": 0,
                "maxzoom": 18,
                'layout': {
                    'visibility': 'visible',
                }
            },
        ]
    },
    center: [139.767, 35.681],
    zoom: 11
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
        hinanjyoMarkers.forEach(m => {
            m.remove();
        })

        const result = await requestHinanjyoAPI(position.coords.latitude, position.coords.longitude);
        console.log(result.data.Feature);

        // 新しい位置での避難所表示
        if (!result.data.Feature) {
            return;
        }

        result.data.Feature.forEach(f => {
            console.log(f);
            const coordinates = f.Geometry.Coordinates.split(',');
            console.log(coordinates);
            console.log(f.Name);
            createMarker(coordinates[1], coordinates[0], f.Name);
        });
    }, (err) => { }, {
        timeout: 10000
    });
} else { /* geolocation IS NOT available, handle it */ }

function createMarker(lat, lng, name) {
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
    console.log(hinanjyoMarkers);
}