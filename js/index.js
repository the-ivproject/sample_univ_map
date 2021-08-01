// Google sheet name
const google_sheet_name = 'https://docs.google.com/spreadsheets/d/1j62R0wMFHPkqi-iefggkUB9QT5n8EuYdusIWhJgjSGs'
// Sheet name
const sheet_name = 'Lincoln University 15 Mile Radi'

// Mapbox token
const mapbox_token = 'pk.eyJ1IjoiaXZwcm9qZWN0IiwiYSI6ImNrcDZuOWltYzJyeGMycW1jNDVlbDQwejQifQ.97Y2eucdbVp1F2Ow8EHgBQ'

// Point style 
let stylePoint = {
    'circle-color': 'blue',
    'circle-radius': 5,
    'circle-stroke-width': 3,
    'circle-stroke-color': '#ffffff',
    'circle-opacity': 1
}

// Don't change anything below
let transformRequest = (url, resourceType) => {
    var isMapboxRequest =
        url.slice(8, 22) === "api.mapbox.com" ||
        url.slice(10, 26) === "tiles.mapbox.com";
    return {
        url: isMapboxRequest ?
            url.replace("?", "?pluginName=sheetMapper&") : url
    };
};

//YOUR TURN: add your Mapbox token
mapboxgl.accessToken = mapbox_token

let map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/mapbox/streets-v11', // YOUR TURN: choose a style: https://docs.mapbox.com/api/maps/#styles
    center: [ -75.887764,39.781616], // starting position [lng, lat]
    zoom: 7, // starting zoom
    transformRequest: transformRequest
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');

$(document).ready(() => {
    $.ajax({
        type: "GET",
        //YOUR TURN: Replace with csv export link
        url: `${google_sheet_name}/gviz/tq?tqx=out:csv&sheet=${sheet_name}`,
        dataType: "text",
        success: function (csvData) {
            makeGeoJSON(csvData);
        }
    });

    let makeGeoJSON = csvData => {
        csv2geojson.csv2geojson(csvData, {
            latfield: 'Latitude',
            lonfield: 'Longitude',
            delimiter: ','
        }, (err, data) => {
            let addDataLayer = () => {
                var geo = {
                    'id': 'csvData',
                    'type': 'circle',
                    'source': {
                        'type': 'geojson',
                        'data': data
                    },
                    'paint': stylePoint,
                }

                map.addLayer(geo);

                // When a click event occurs on a feature in the places layer, open a popup at the
                // location of the feature, with description HTML from its properties.
                map.on('click', 'csvData', function (e) {
                    let coordinates = e.features[0].geometry.coordinates.slice();
                  
                    let prop = Object.keys(e.features[0].properties)
                    let val = Object.values(e.features[0].properties)
            
                    let htmlCol = []

                    for(let i in prop.slice(0,prop.length - 2)) {
                        let html = `
                            <tr>
                                <td style='font-weight:bold'>${prop[i]} </td>
                                <td style='padding:0 5px'> : </td>
                                <td> ${val[i]}</td>
                            </tr>
                        `
                        htmlCol.push(html)
                    }
                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }

                    new mapboxgl.Popup({closeButton:false})
                        .setLngLat(coordinates)
                        .setHTML(`<table>${htmlCol.join("")}</table>`)
                        .addTo(map);
                });

                // Change the cursor to a pointer when the mouse is over the places layer.
                map.on('mouseenter', 'places', function () {
                    map.getCanvas().style.cursor = 'pointer';
                });

                // Change it back to a pointer when it leaves.
                map.on('mouseleave', 'places', function () {
                    map.getCanvas().style.cursor = '';
                });
            }

            map.on('style.load', () => {
                // Triggered when `setStyle` is called.
                if (data) addDataLayer();
            });

            map.on('load', () => {
                document.getElementById('basemaps').addEventListener('change', function () {
                    map.setStyle(`mapbox://styles/mapbox/${this.value}`)
                });

                addDataLayer()

                map.on('data', e => {
                    if (e.dataType === 'source' && e.sourceId === 'composite') {
                        document.getElementById("loader").style.visibility = "hidden";
                        document.getElementById("overlay").style.visibility = "hidden";
                    }
                })

                // Change the cursor to a pointer when the mouse is over the places layer.
                map.on('mouseenter', 'csvData', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });

                // Change it back to a pointer when it leaves.
                map.on('mouseleave', 'places', () => {
                    map.getCanvas().style.cursor = '';
                });

                for (let i in data.features) {
                    let zip = data.features[i].properties['Zip Code']
                    let name = data.features[i].properties['Mixed City']
                    let coor = data.features[i].geometry.coordinates
                    var opt = document.createElement('option');
                    opt.value = name;
                    opt.innerHTML = zip + ' - ' + name;
                    opt.value = coor.join()
                    document.getElementById('inlineFormCustomSelect').appendChild(opt)
                }

                let UseBbox = () => {
                    let bbox = turf.bbox(data);
                    map.fitBounds(bbox, {
                        padding: 100
                    })
                }

                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('latlng');

                if(query !== null) {
                    let coor = query.split(",").map(a => { return parseFloat(a) })
                    map.flyTo({
                        center: coor.reverse(),
                        zoom: 18
                    });
                } else {
                    UseBbox()
                }

                document
                    .getElementById('fitbound')
                    .addEventListener('click', UseBbox);

                let selOption = document.getElementById("inlineFormCustomSelect")

                selOption.addEventListener('change', function (a) {

                    let coor = (selOption[selOption.selectedIndex].value).split(",").map(a => {
                        return parseFloat(a)
                    })

                    if (selOption.value === 'All') {
                        UseBbox()
                    } else {
                        map.flyTo({
                            center: coor,
                            zoom: 18
                        });
                    }
                })
            });
        });
    };
});