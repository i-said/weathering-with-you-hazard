import firebase from 'firebase';

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const firestore = firebase.firestore({
  timestampsInSnapshots: true
})

// Init GeoFireX
import * as geofirex from 'geofirex';
const geo = geofirex.init(firestore);


const hinanjyo = geo.collection('hihanjyo')

const now = {
  lat: 40.1,
  lng: -119.1
}

const center = geo.point(now.lat, now.lng);
const radius = 100; // 100km
const field = 'location';

const query = hinanjyo.within(center, radius, field);
query.subscribe((spots) => {
  console.log(spots)
})