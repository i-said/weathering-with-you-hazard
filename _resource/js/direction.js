const axios = require('axios');
const estimateDistance = 1000; // m
const guideMarkerDistance = 50;
const guideLocationDiff = {
    lat: 0.0090133729745762 * guideMarkerDistance / 1000,  // 50m先を案内
    lon: 0.010966404715491394 * guideMarkerDistance / 1000
}

const guideLocationDiffForAllDirections = {
    N: {
        lat: guideLocationDiff.lat,
        lon: 0
    },
    NE: {
        lat: guideLocationDiff.lat,
        lon: guideLocationDiff.lon
    },
    E: {
        lat: 0,
        lon: guideLocationDiff.lon
    },
    SE: {
        lat: 0 - guideLocationDiff.lat,
        lon: guideLocationDiff.lon
    },
    S: {
        lat: 0 - guideLocationDiff.lat,
        lon: 0
    },
    SW: {
        lat: 0 - guideLocationDiff.lat,
        lon: 0 - guideLocationDiff.lon
    },
    W: {
        lat: 0,
        lon: 0 - guideLocationDiff.lon
    },
    NW: {
        lat: guideLocationDiff.lat,
        lon: 0 - guideLocationDiff.lon
    },
}

function calculateGuideLocation(current, directionSymbolName) {
    if (!directionSymbolName) return { lat: null, lon: null};
    
    return {
        lat: current.lat + guideLocationDiffForAllDirections[directionSymbolName].lat,
        lon: current.lon + guideLocationDiffForAllDirections[directionSymbolName].lon 
    }
}

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
    var url = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php'
    var parameters = `?lat=${location.lat}&lon=${location.lon}&output=json`
    return await axios.get(url + parameters)
        .then(function (res) {
            return res.data.elevation;
        })
        .catch(function (error) {
            return null;
        })

}

async function isHigherPlaceFromCurrent(current, distination) {
    // 標高APIを叩く
    var currentHeight = await requestEvaluationAPI(current, true); //TODO 標高API
    var distinationHeight = await requestEvaluationAPI(distination)

    if (currentHeight === distinationHeight) return 'flat'
    if (currentHeight < distinationHeight) return 'higher'

    return 'lower';
}

async function decideDirectionKeyToEvacuate(directions) {

    // sortする / [1, 1] [1,0] だけという雑なのでもっといい方法がありそう...
    for (var key in directions) {
        if (directions[key].every(val => val === 'higher')) {
            return key;
        } else {
            // TODO: 2点only version
            if(directions[key][0] === 'high') {
                return key;
            }
        }
    }
    return null;
}

// 方向を返すやつ。返り値は {lat, lon}
export async function suggestDirection(currentLocation) {

    // 8方向の緯度経度を取得
    var eightDirections = getEightDirectionsLocationFromCurrentLocation(currentLocation, estimateDistance);
    // あとで追加する
    var eightDirectionsHalfWay = getEightDirectionsLocationFromCurrentLocation(currentLocation, estimateDistance);

    // もってきた緯度経度を高さを測定して true or false
    var higherDirections = {};
    for (var i in eightDirections) {
        higherDirections[i] = [
            await isHigherPlaceFromCurrent(currentLocation, eightDirectionsHalfWay[i]),
            await isHigherPlaceFromCurrent(currentLocation, eightDirections[i])
        ];
    }

    const suggestDirectionKeyName = await decideDirectionKeyToEvacuate(higherDirections);
    console.log("suggest keyname:", suggestDirectionKeyName);
    const response = {
        guideLocation: {
            lat: null,
            lon: null
        }
    }
    response.guideLocation =  calculateGuideLocation(currentLocation, suggestDirectionKeyName);

    Object.assign(response, eightDirections[suggestDirectionKeyName]);
    console.log("return response is...", response);
    return response;
}

// for test
// 35.688955, 139.787829
// location = { lat: 35.688955, lon: 139.787829 }
// var res = suggestDirection(location)
