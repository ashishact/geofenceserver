import express      from "express";

interface DEFI{
    API_VERSION: string,
    REDIS: any,
    WS: SocketIO.Namespace|null,
    EXP: express.Application|null,
    DDB: any
}
const DEF:DEFI = {
    REDIS:      null,
    WS:         null,
    EXP:        null,
    DDB:        null,
    API_VERSION: "v1",
}




export default DEF;