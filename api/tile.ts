import util         from "util"

// Modules
import _log         from "../_log";
import DEF          from "../_global";
import REDIS        from "redis"


// Interfaces
import {Request, Response}                      from "express";
import {STATUS, GeofenceC}                      from "./interfaces";
import {ERROR_CODES, GEN_FAIL, GEN_SUCCESS}     from "./interfaces";
import {GeofencesAddC, GeofenceRemoveC, idC}    from "./interfaces"
import {AssetsAddC, AssetsRemoveC}              from "./interfaces"
import {AssignC, SetAssetLocationC}             from "./interfaces"
import {decode}                                 from "./interfaces"
import {GeofenceI, AssetI}                      from "./interfaces"

// Globals
const pub     = REDIS.createClient({port: 9851});
const sub     = REDIS.createClient({port: 9851});

const API_ROOT  = `/api/${DEF.API_VERSION}`;

enum PREFIX{
    GEOFENCES="geofences/",
    ASSETS="assets/",
    FENCE="fence"
}


const redis = {
    scan: async (key: string): Promise<[Error|null, {key: string, value:any}[]|null]>=>{
        return await new Promise((resolve, reject)=>{
            pub.SCAN(key, (err, objects)=>{
                if(err || objects.length < 2) return resolve([err, null]);
                let data:any[] = [];
                for(let oa of objects[1]){
                    let key = "";
                    let value = {};
                    if(oa.length>0) key = oa[0];
                    try {
                        if(oa.length>1) value = JSON.parse(oa[1]);
                    } catch (e) {
                        value = {err: "parsing error"};
                    }
                    data.push({key, value});
                }
                resolve([null, data]);
            })
        });
    },
    hgetall: async (key: string): Promise<[Error|null, any]>=>{
        return await new Promise((resolve, reject)=>{
            pub.HGETALL(key, (err, value)=>{
                if(err) return resolve([err, null]);
                return resolve([null, value]);
            })
        });
    },
    set: async (key: string, field: string, value: any): Promise<[Error|null, any]> =>{
        let err = null;
        let r = await new Promise((resolve, reject)=>{
            pub.send_command("SET", [key, field, "STRING", JSON.stringify(value)], (e, reply)=>{
                    if (e){
                        err = e; return resolve(null)
                    }
                    resolve(reply);
                }
            )
        });
        return [err, r];
    },
    get: async (key: string, field: string, value: any): Promise<[Error|null, any]> =>{
        let err = null;
        let r = await new Promise((resolve, reject)=>{
            pub.send_command("GET", [key, field], (e, reply)=>{
                    if (e){
                        err = e; return resolve(null)
                    }
                    resolve(reply);
                }
            )
        });
        return [err, r];
    },
    del: async (key: string, field: string): Promise<[Error|null, any]> =>{
        let err = null;
        let r = await new Promise((resolve, reject)=>{
            pub.send_command("DEL", [key, field], (e, reply)=>{
                    if (e){
                        err = e; return resolve(null)
                    }
                    resolve(reply);
                }
            )
        });
        return [err, r];
    },
    send: async (cmd: string, args: string[]): Promise<[Error|null, any]> =>{
        let err = null;
        let r = await new Promise((resolve, reject)=>{
            pub.send_command( cmd, args, (e, reply)=>{
                    if (e){
                        err = e; return resolve(null)
                    }
                    resolve(reply);
                }
            )
        });

        return [err, r];
    }
}

const GEOFENCE_MESSAGES:any = {};
/*
// example 
GEOFENCE_MESSAGES["assets/ag1/a1"] = {
    command: 'set',
    group:'5eeb6fba2c8c802f3af8ae01',
    detect: 'enter',
    hook: 'geofences/g1',
    key: 'assets/ag1',
    time: '2020-06-18T19:14:26.89165+05:30',
    id: 'a1',object: { type: 'Point', coordinates: [ 0, 0 ] }
}
*/
sub.on("message", function(channel, message) {
    let msg = JSON.parse(message);
    if(msg.key && msg.id){
        let key = msg.key + "/" + msg.id;
        GEOFENCE_MESSAGES[key] = msg;
        setTimeout(()=>{
            delete GEOFENCE_MESSAGES[key];
        }, 5000);
    }
})


const fetchGeofences = async (id: string): Promise<GeofenceI[]>=>{
    let geofences: GeofenceI[] = [];
    let key = PREFIX.GEOFENCES + id; // query.id is the group id
    let r = await redis.scan(key);
    if(r[1]){
        for(let o of r[1]){
            let [e, g] = await decode(GeofenceC, o.value);
            if(g) geofences.push(g);
        }
    }
    return geofences;
}
const getGeoJSON = (path: {lat: number, lng: number}[]):any=>{
    return {
        type:"Polygon",
        coordinates:[
            path.map(c=>[c.lat, c.lat])
        ]
    }
}


/**
 * input  => geofence group id
 * output => geofences that belong to this group
 */
const geofencesGet = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(idC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }
    
    let key = PREFIX.GEOFENCES + query.id; // query.id is the group id
    let r = await redis.scan(key);
    if(r[0]) return res.send(GEN_FAIL(r[0], ERROR_CODES.TILE_SERVER_ERROR));
    if(r[1]) return res.send(GEN_SUCCESS(r[1]));

    return res.send(GEN_FAIL("Failed to get geofence: " + query.id, ERROR_CODES.TILE_SERVER_ERROR));
}
const geofencesAdd = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(GeofencesAddC, data)
    
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }

    let r = await Promise.all(query.geofences.map(g=>{
        if(query){
            let key = PREFIX.GEOFENCES + query.id; // query.id is the group id
            let field = g.id; // id here is individual geofence id
            return redis.set(key, field, g).catch(_log);
            // return tile.set(key, field, JSON.stringify(g), null, {type: 'string'}).catch(_log);
        }
    }));
    
    if(r){
        let errors:Error[] = [];
         r.map(v=>{if(v && v[0]) errors.push(v[0]);});
        if(errors.length) return res.send(GEN_FAIL(errors, ERROR_CODES.TILE_SERVER_ERROR));
        else return res.send(GEN_SUCCESS([r, query]));
    }
    
    return res.send(GEN_FAIL("Failed to add", ERROR_CODES.TILE_SERVER_ERROR));
}
/**
 * input => geofence group id and list of geofence ids inside them
 */
const geofencesRemove = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(GeofenceRemoveC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }
    
    let r = await Promise.all(query.ids.map(id=>{
        if(query){
            let key = PREFIX.GEOFENCES + query.id; // query.id is the group id
            let field = id; // id here is individual geofence id
            return redis.del(key, field).catch(_log);
        }
    }));

    if(r){
        let errors:Error[] = [];
        r.map(v=>{if(v && v[0]) errors.push(v[0]);});

        if(errors.length) return res.send(GEN_FAIL(errors, ERROR_CODES.TILE_SERVER_ERROR));
        else return res.send(GEN_SUCCESS([r, query]));
    }

    return res.send(GEN_FAIL("Failed to remove", ERROR_CODES.TILE_SERVER_ERROR));
}
const geofencesDelete = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(idC, data)

    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }

    let key = PREFIX.GEOFENCES + query.id; // query.id is the group id
    let r = await redis.scan(key);
    if(r){
        console.log("DELETE", r);
    }


    return res.send(GEN_FAIL("NOT IMPLEMENTED YET", ERROR_CODES.NOT_IMPLEMENTED));
}



const assetsGet = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(idC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }
    
    let key = PREFIX.ASSETS + query.id; // query.id is the group id
    let r = await redis.scan(key);
    if(r[0]) return res.send(GEN_FAIL(r[0], ERROR_CODES.TILE_SERVER_ERROR));
    if(r[1]) return res.send(GEN_SUCCESS(r[1]));

    return res.send(GEN_FAIL("Failed to get assets: " + query.id, ERROR_CODES.TILE_SERVER_ERROR));
}
const assetsAdd = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(AssetsAddC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }


    let r = await Promise.all(query.assets.map(a=>{
        if(query){
            let key = PREFIX.ASSETS + query.id; // query.id is the group id
            let field = a.id; // id here is individual asset id
            return redis.send(
                "SET",
                [
                    key,
                    field,
                    "POINT",
                    String(a.location.lat),
                    String(a.location.lng),
                ]
            ).catch(_log);
        }
    }));
    
    if(r){
        let errors:Error[] = [];
         r.map(v=>{if(v && v[0]) errors.push(v[0]);});

        if(errors.length) return res.send(GEN_FAIL(errors, ERROR_CODES.TILE_SERVER_ERROR));
        else return res.send(GEN_SUCCESS([r, query]));
    }
    
    return res.send(GEN_FAIL("Failed to add", ERROR_CODES.TILE_SERVER_ERROR));

}
const assetsRemove = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(AssetsRemoveC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }
    
    let r = await Promise.all(query.ids.map(id=>{
        if(query){
            let key = PREFIX.ASSETS + query.id; // query.id is the group id
            let field = id; // id here is individual geofence id
            return redis.del(key, field).catch(_log);
        }
    }));

    if(r){
        let errors:Error[] = [];
        r.map(v=>{if(v && v[0]) errors.push(v[0]);});

        if(errors.length) return res.send(GEN_FAIL(errors, ERROR_CODES.TILE_SERVER_ERROR));
        else return res.send(GEN_SUCCESS([r, query]));
    }

    return res.send(GEN_FAIL("Failed to remove", ERROR_CODES.TILE_SERVER_ERROR));
}
const assetsDelete = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(idC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }

    let key = PREFIX.ASSETS + query.id; // query.id is the group id
    let r = await redis.scan(key);
    if(r){
        console.log('DELETE', r);
        // delete these
    }
    return res.send(GEN_FAIL("NOT IMPLEMENTED YET", ERROR_CODES.NOT_IMPLEMENTED));
}


const assign = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(AssignC, data)
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }

    let geofences = await fetchGeofences(query.geofenceGroupId);

    for(let g of geofences){
        let geofenceKey = PREFIX.GEOFENCES + g.id;
        let assetsKey = PREFIX.ASSETS + query.assetGroupId;
        if(g.shape === "polygon" && g.path){
            let geoj = getGeoJSON(g.path);
            let r = await redis.send(
                "SETCHAN", 
                [
                    geofenceKey, 
                    "NEARBY", 
                    assetsKey, 
                    "FENCE", 
                    "DETECT", 
                    "enter,exit,cross,inside,outside", 
                    "OBJECT", 
                    JSON.stringify(geoj)
                ] 
            ).catch(console.warn);
        }
        else{ // circle is default
            let r = await redis.send(
                "SETCHAN", 
                [
                    geofenceKey, 
                    "NEARBY", 
                    assetsKey, 
                    "FENCE", 
                    "DETECT", 
                    "enter,exit,cross", 
                    "POINT", 
                    String(g.center.lat), String(g.center.lng),
                    String(g.radius)
                ] 
            ).catch(console.warn);
            
        }
        sub.subscribe(geofenceKey);
    }


    let result = `${geofences.length} geofences from Geofence Group: (${query.geofenceGroupId}) were assigned to Asset Group: (${query.assetGroupId})`;

    return res.send(GEN_SUCCESS([{result}]));
}

const setAssetLocation = async (req: Request, res: Response)=>{
    const data = req.query?.data || req.body?.data;
    let [errors, query] = await decode(SetAssetLocationC, data);
    if(!query){
        return res.send(GEN_FAIL(errors, ERROR_CODES.INVALID_PARAMS));
    }

    let key = PREFIX.ASSETS + query.assetGroupId; // query.assetsId is the group id
    let id = query.assetId; // assetId here is individual asset id
    let coordinate = [query.location.lat, query.location.lng];

    let r = await redis.send(
        "SET",
        [
            key,
            id,
            "POINT",
            String(query.location.lat),
            String(query.location.lng)
        ]
    ).catch(console.warn);

    const to_each = 50;
    let to = query.timeout || 300;
    if(to>2000) to = 2000;

    r = await new Promise((resolve, reject)=>{
        let count = 0;
        let name = key + "/" + id;
        
        let interval = setInterval(()=>{
            if(GEOFENCE_MESSAGES[name]){
                clearInterval(interval);
                resolve(GEOFENCE_MESSAGES[name]);
            }
            count++;
            if(count > to/to_each) {
                clearInterval(interval);
                // resolve([new Error("Timeout"), null]);
                //@ts-ignore
                resolve(null);
            }
        }, to_each);

    });


    return res.send(GEN_SUCCESS(r ? [r] : []));
    
}



const init = ()=>{
    if(DEF.EXP){
        DEF.EXP.get(API_ROOT + "/geofences", geofencesGet);
        DEF.EXP.post(API_ROOT + "/geofences", geofencesGet);
        DEF.EXP.get(API_ROOT + "/geofences/create", geofencesAdd);
        DEF.EXP.post(API_ROOT + "/geofences/create", geofencesAdd);
        DEF.EXP.get(API_ROOT + "/geofences/add", geofencesAdd);
        DEF.EXP.post(API_ROOT + "/geofences/add", geofencesAdd);
        DEF.EXP.get(API_ROOT + "/geofences/remove", geofencesRemove);
        DEF.EXP.post(API_ROOT + "/geofences/remove", geofencesRemove);
        DEF.EXP.get(API_ROOT + "/geofences/delete", geofencesDelete);
        DEF.EXP.post(API_ROOT + "/geofences/delete", geofencesDelete);
        
        DEF.EXP.get(API_ROOT + "/assets", assetsGet);
        DEF.EXP.post(API_ROOT + "/assets", assetsGet);
        DEF.EXP.get(API_ROOT + "/assets/create", assetsAdd);
        DEF.EXP.post(API_ROOT + "/assets/create", assetsAdd);
        DEF.EXP.get(API_ROOT + "/assets/add", assetsAdd);
        DEF.EXP.post(API_ROOT + "/assets/add", assetsAdd);
        DEF.EXP.get(API_ROOT + "/assets/remove", assetsRemove);
        DEF.EXP.post(API_ROOT + "/assets/remove", assetsRemove);
        DEF.EXP.get(API_ROOT + "/assets/delete", assetsDelete);
        DEF.EXP.post(API_ROOT + "/assets/delete", assetsDelete);
        
        
        DEF.EXP.get(API_ROOT + "/assign", assign);
        DEF.EXP.post(API_ROOT + "/assign", assign);
        DEF.EXP.get(API_ROOT + "/setAssetLocation", setAssetLocation);
        DEF.EXP.post(API_ROOT + "/setAssetLocation", setAssetLocation);
    }


    _log("TILE38 INIT");
}
export default {
    init: init
};


// GEOFENCE group => create([g1, g2, g3]), add([]) remove([g2]) , delete(G)
// ASSET    group => create([])            add([]) remove([])     delete(A)
// Assign(G_id, A_id)

// set(A(id).pos={lat, lng}) =>  {ENTER, EXIT, CROSS, INSIDE, OUTSIDE}

// ?id=id&lat=lat&lng=lng
// ?assetId=string&geofenceGroupId=string



