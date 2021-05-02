import * as t from 'io-ts';
import axios from "axios";
import Tile38 from "tile38";
import REDIS        from "redis"
import {promisify} from "util"

import { GeofencesAddC, AssetsAddC, AssignC } from "../api/interfaces";



const _rclient     = REDIS.createClient({port: 9851});
const subscriber   = REDIS.createClient({port: 9851});
const rclient = {
    send_command :promisify(_rclient.send_command).bind(_rclient),
    get :promisify(_rclient.get).bind(_rclient),
}


type GeofencesAddI = t.TypeOf<typeof GeofencesAddC>;
type AssetsAddI = t.TypeOf<typeof AssetsAddC>;
type AssignI = t.TypeOf<typeof AssignC>;

const tile = new Tile38();

const API_URL = "http://localhost:3000/api/v1";
let gg1: GeofencesAddI = {
    id: "gg1",
    name: "GG1",
    geofences: [
        {
            id: "g1",
            name: "G1",
            center: { lat: 0, lng: 0 },
            radius: 10,
            shape: "circle",
            path: [],
            address: ""
        },
        {
            id: "g2",
            name: "G2",
            center: { lat: 2, lng: 2 },
            radius: 10,
            shape: "circle",
            path: [],
            address: ""
        }
    ]
}
let createGeofences = async () => {
    let url = API_URL + `/geofences/create?data=${JSON.stringify(gg1)}`;
    let r = await axios.get(url).catch(console.warn);
    if (r && r.data) return r.data;
}


let ag1: AssetsAddI = {
    id: "ag1",
    name: "AG1",
    assets: [
        {
            id: "a1",
            name: "A1",
            location: { lat: 19, lng: 72 }
        }
    ]
}
let createAssets = async () => {
    let url = API_URL + `/assets/create?data=${JSON.stringify(ag1)}`;
    let r = await axios.get(url).catch(console.warn);
    if (r && r.data) return r.data;
}

let assign = async () => {
    let a: AssignI = {
        geofenceGroupId: "gg1",
        assetGroupId: "ag1",
    }
    let url = API_URL + `/assign?data=${JSON.stringify(a)}`;
    let r = await axios.get(url).catch(console.warn);
    if (r && r.data) return r.data;
}



let live = async () => {
    
}




let main = async () => {
    let r = await createGeofences();
    console.log("createGeofences", r);
    r = await createAssets();
    console.log("createAssets", r);
    r = await assign();
    console.log("assign", r);

    live();
}


(async () => {
    await main();
})()


export default {};