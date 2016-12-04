"use strict";
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var exits = Game.map.describeExits(base.name);
    for (var dir in exits) {
        var roomName = exits[dir];
        var roomMemory = Memory.rooms[roomName];
        if ((!roomMemory || (!roomMemory.scanned && !Memory.rooms[roomName].scout)) && Game.map.isRoomAvailable(roomName)) {
            var memory = {
                military: true, 
                special: true,
                role: 'scout', 
                target: roomName 
            };
            requestUtils.add(creepRequests, 0.90, memory);
            break;
        }
    }
}