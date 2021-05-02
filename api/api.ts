import _log         from "../_log";
import DEF          from "../_global";

import TILE       from "./tile";

const init = ()=>{
    _log("API INIT");
    
    TILE.init();
}
export default {
    init: init
};