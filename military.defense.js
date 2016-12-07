"use strict";
var listUtils = require("util.list");
var partUtils = require("util.parts");
var requestUtils = require("util.requests");

module.exports.updateGlobal = function(actions) {
}

module.exports.updateBase = function(base, actions, creepRequests, structureRequests, defenseRequests) {
    var baseMemory = base.memory;
    var level = Game.rooms[base.name].controller.level;
    var threatRooms = [];
    var melee = Memory.military.roles.melee;
    var ranged = Memory.military.roles.ranged;
    var healer = Memory.military.roles.healer;
    var military = melee.creeps.concat(ranged.creeps).concat(healer.creeps);

    for (let i = 0; i < baseMemory.rooms.length; i++) {
        var roomName = baseMemory.rooms[i];
        var roomMemory = Memory.rooms[roomName];

        if (roomMemory.threatLevel * 1.2 > roomMemory.defenseLevel + roomMemory.staticDefenseLevel)
            listUtils.add(threatRooms, roomName);

        if (roomMemory.threatLevel === 0) {
            for (let j = 0; j < military.length; j++) {
                var creepMemory = Memory.creeps[military[j]];
                if (creepMemory.room === roomName)
                    creepMemory.room = null;
            }
        }
        
    }

    var memory = {
        military: true
    };
    if (healer.parts.heal < Math.floor((ranged.parts.ranged_attack + melee.parts.attack) / 4))
        memory.role = 'healer';
    else if (ranged.parts.ranged_attack < melee.parts.attack)
        memory.role = 'ranged';
    else
        memory.role = 'melee';

    if (baseMemory.threatLevel > baseMemory.defenseLevel) {
        console.log('Threat alert! (' + baseMemory.defenseLevel + ' vs ' + baseMemory.threatLevel + ')');
        requestUtils.add(creepRequests, 0.95, memory);
    }
    else if (baseMemory.defenseLevel < 2500 * (level - 1)) {
        var priority;
        //Dont need as many defenders if our only room is in safe mode
        if (baseMemory.rooms.length !== 1 || !Game.rooms[base.name].controller.safeMode)
            priority = 0.79;
        else
            priority = 0.49;
        requestUtils.add(creepRequests, priority, memory);
    }

    //Redirect current units
    if (threatRooms.length > 0) {
        for (let j = 0; j < military.length; j++) {
            var creepMemory = Memory.creeps[military[j]];
            if (!creepMemory.room && !creepMemory.squad && !creepMemory.special) { //Is not an attacker or special unit, and not already assigned to a room
                creepMemory.room = threatRooms[0];
                console.log('Sending ' + military[j] + ' to ' + threatRooms[0]);
            }
        }
    }
}
