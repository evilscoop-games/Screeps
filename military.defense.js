"use strict";
var listUtils = require("util.list");
var partUtils = require("util.parts");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var totalThreatLevel = 0;
    var totalDefenseLevel = 0;
    var threatRooms = [];
    var melee = Memory.military.roles.melee;
    var ranged = Memory.military.roles.ranged;
    var healer = Memory.military.roles.healer;
    var military = melee.creeps.concat(ranged.creeps).concat(healer.creeps);

    for (var i = 0; i < baseMemory.rooms.length; i++) {
        var roomName = baseMemory.rooms[i];
        var roomMemory = Memory.rooms[roomName];

        if (roomMemory.threatLevel > roomMemory.defenseLevel)
            listUtils.add(threatRooms, roomName);

        if (roomMemory.threatLevel === 0) {
            for (var j = 0; j < military.length; j++) {
                var creepMemory = Memory.creeps[military[j]];
                if (creepMemory.room === roomName)
                    creepMemory.room = null;
            }
        }
        
        totalThreatLevel += roomMemory.threatLevel;
        totalDefenseLevel += roomMemory.defenseLevel;
    }

    baseMemory.threatLevel = totalThreatLevel;
    baseMemory.defenseLevel = totalDefenseLevel;

    var memory = {
        military: true
    };
    if (healer.parts.heal < Math.floor((ranged.parts.ranged_attack + melee.parts.attack) / 4))
        memory.role = 'healer';
    else if (ranged.parts.ranged_attack < melee.parts.attack)
        memory.role = 'ranged';
    else
        memory.role = 'melee';

    if (totalThreatLevel > totalDefenseLevel) {
        console.log('Threat alert! (' + baseMemory.defenseLevel + ' vs ' + baseMemory.threatLevel + ')');
        requestUtils.add(creepRequests, 0.91, memory);
    }
    else if (totalDefenseLevel < 5000)
        requestUtils.add(creepRequests, 0.79, memory);

    //Redirect current units
    if (threatRooms.length > 0) {
        for (var j = 0; j < military.length; j++) {
            var creepMemory = Memory.creeps[military[j]];
            if (!creepMemory.room && !creepMemory.squad && !creepMemory.special) { //Is not an attacker or special unit, and not already assigned to a room
                creepMemory.room = threatRooms[0];
                console.log('Sending ' + military[j] + ' to ' + threatRooms[0]);
            }
        }
    }
}
