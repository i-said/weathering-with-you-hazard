var fs = require('fs');
const firebase = require("firebase");
// Required for side-effects
require("firebase/firestore");

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

var db = firebase.firestore();

fs.readFile('./geodata.geojson', 'utf8', function (err, result) {
  console.log('text file!');
  const data = JSON.parse(result);

  data.features.forEach(function (obj) {
    console.log(obj);
    db.collection("hinanjyo").add({
      lat: obj.geometry.coordinates[1],
      lng: obj.geometry.coordinates[0],
      name: obj.properties.name,
      address: obj.properties.address,
    }).then(function (docRef) {
      console.log("Document written with ID: ", docRef.id);
    })
      .catch(function (error) {
        console.error("Error adding document: ", error);
      });
  });
});

