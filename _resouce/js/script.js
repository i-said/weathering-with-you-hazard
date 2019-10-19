
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
