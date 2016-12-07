"use strict";
var mapUtils = require("util.map");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    //Check for claim flags
    for (let flagName in Game.flags) {
        var flag = Game.flags[flagName];
        if (flag.color === COLOR_ORANGE) {
            var flagMemory = Memory.flags[flag.name];
            if (!flagMemory) {
                flagMemory = {};
                Memory.flags[flag.name] = flagMemory;
            }
            if (!flagMemory.claimer) {
                var room = Game.rooms[flag.pos.roomName];
                if (room && room.controller && !flag.room.controller.my) {
                    var memory = {
                        military: true,
                        special: true,
                        role: "claimer",
                        flag: flag.name,
                        room: room.name
                    };
                    requestUtils.add(creepRequests, 0.82, memory);
                }
            }
        }
    }
}