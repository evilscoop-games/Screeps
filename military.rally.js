"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    //Check for rally flags
    for (var roomName in Memory.rooms)
        delete Memory.rooms[roomName].rallyPos;
    for (var flagName in Game.flags) {
        var flag = Game.flags[flagName];
        if (flag.color === COLOR_BLUE) {
            var room = Game.rooms[flag.pos.roomName];
            if (room)
                Memory.rooms[room.name].rallyPos = mapUtils.serializePos(flag.pos);
        }
    }
}