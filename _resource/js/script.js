
mapboxgl.accessToken = "pk.eyJ1Ijoic2hteXQiLCJhIjoiY2ozbWE0djUwMDAwMjJxbmR6c2cxejAyciJ9.pqa04_rvKov3Linf7IAWPw";
var map = new mapboxgl.Map({

    container: "map",
    style: {
        "version": 8,
        "sources": {
            "NORMAL": {
                "type": "vector",
                "url": "mapbox://styles/mapbox/streets-v11"
            },
            "MIZU": {
                "type": "vector",
                "url": "mapbox://styles/v1/shmyt/cj4dvtopr044m2sn5m86h4ih2"
            },
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
            "DOSYA_SAIGAI": {
                "type": "raster",
                "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png"],
                "tileSize": 256
            },
            "DOSYA_SAIGAI": {
                "type": "raster",
                "tiles": ["https://disaportaldata.gsi.go.jp/raster/05_kyukeishakeikaikuiki/{z}/{x}/{y}.png"],
                "tileSize": 512
            },
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
                "id": "hillshading",
                "source": "dem",
                "type": "hillshade"
            },
            {
                "id": "KOUZUI",
                "type": "raster",
                "source": "KOUZUI",
                "minzoom": 0,
                "maxzoom": 18
            },
            {
                "id": "DOSYA_SAIGAI",
                "type": "raster",
                "source": "DOSYA_SAIGAI",
                "minzoom": 0,
                "maxzoom": 18
            }
        ]
    },
    center: [139.767, 35.681],
    zoom: 11
});
// map.setStyle('mapbox://styles/mapbox/streets-v11');

// コントロール関係表示
map.addControl(new mapboxgl.NavigationControl());


const axios = require('axios');
const estimateDistance = 1000; // m

var getEightDirectionsLocationFromCurrentLocation = (currentLocation, distance) => {
    var correction = distance / 1000; // 1kmあたりの誤差 
    var latBy1000m = 0.0090133729745762 * correction;
    var lonBy1000m = 0.010966404715491394 * correction;

    // 斜めは厳密には√2なのだけどめんどくさいので一旦無視する
    return {
        N: {
            lat: currentLocation.lat + latBy1000m,
            lon: currentLocation.lon
        },
        NE: {
            lat: currentLocation.lat + latBy1000m,
            lon: currentLocation.lon + lonBy1000m
        },
        E: {
            lat: currentLocation.lat,
            lon: currentLocation.lon + lonBy1000m
        },
        SE: {
            lat: currentLocation.lat - latBy1000m,
            lon: currentLocation.lon + lonBy1000m
        },
        S: {
            lat: currentLocation.lat - latBy1000m,
            lon: currentLocation.lon
        },
        SW: {
            lat: currentLocation.lat - latBy1000m,
            lon: currentLocation.lon - lonBy1000m
        },
        W: {
            lat: currentLocation.lat,
            lon: currentLocation.lon - lonBy1000m
        },
        NW: {
            lat: currentLocation.lat + latBy1000m,
            lon: currentLocation.lon - lonBy1000m
        },
    }
}

async function requestEvaluationAPI(location, isCurrent) {
    // lat=35&lon=135&output=json
    var url = 'http://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php'
    var parameters = `?lat=${location.lat}&lon=${location.lon}&output=json`
    return await axios.get(url + parameters)
    .then(function (res) {
        return res.data.elevation;
    })
    .catch(function (error) {
        return null;
    })

}

async function isHigherPlaceFromCurrent (current, distination) {
    // 標高APIを叩く
    var currentHeight = await requestEvaluationAPI(current, true); //TODO 標高API
    var distinationHeight = await requestEvaluationAPI(distination)
    
    if (currentHeight === distinationHeight) return 'flat'
    if (currentHeight < distinationHeight) return 'higher'

    return 'lower';
}

async function decideDirectionKeyToEvacuate (directions) {

    // sortする / [1, 1] [1,0] だけという雑なのでもっといい方法がありそう...
    for( var key in directions) {
        console.log("decideDirection:", directions[key])
        if(directions[key].every(val => val === 'higher')) {
            return key;
        }
    }
    return null;
}

// 方向を返すやつ。返り値は {lat, lon}
async function suggestDirection (currentLocation) {

    // 8方向の緯度経度を取得
    var eightDirections = getEightDirectionsLocationFromCurrentLocation(currentLocation, estimateDistance);
    // あとで追加する
    var eightDirectionsHalfWay = getEightDirectionsLocationFromCurrentLocation(currentLocation, estimateDistance);

    // もってきた緯度経度を高さを測定して true or false
    var higherDirections = {};
    for(var i in eightDirections) {
        higherDirections[i] = [
            await isHigherPlaceFromCurrent(currentLocation, eightDirectionsHalfWay[i]),
            await isHigherPlaceFromCurrent(currentLocation, eightDirections[i])
        ];
    }

    suggestDirectionKeyName = await decideDirectionKeyToEvacuate(higherDirections);
    console.log("suggest keyname:", suggestDirectionKeyName)
    return eightDirections[suggestDirectionKeyName];
}

// for test
// 35.688955, 139.787829
location = { lat: 35.688955, lon: 139.787829 }
var res = suggestDirection(location)