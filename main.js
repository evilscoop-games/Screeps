"use strict";
var actions = require('actions');
var debug = require('util.debug');
var listUtils = require('util.list');
var mapUtils = require('util.map');
var memoryUtils = require('util.memory');
var baseManager = require('main.base');
var militaryManager = require('main.military');
var creepRequests = require('util.requests');
var structureRequests = require('util.requests');
var defenseRequests = require('util.requests');

function init() {
    memoryUtils.init();
    baseManager.initMemory();
    militaryManager.initMemory();
}

var skipLoops = 0;
module.exports.loop = function () {
    if (!Memory.bases)
        init(); //Init Memory

    Game.debug = debug;
    if (Memory.debug.run === true) {
        var bucket = Game.cpu.bucket;
        var skipManagers = false;

        //Skip frames if we're having troubles
        if (bucket < 6000) {
            console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");   
            return;                     
        }
        if ((bucket < 7000 && skipLoops < 1)) {
            console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");
            skipLoops++;
            return;
        }
        else if (bucket < 8000) {
            console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
            skipManagers = true;
        }
        else if (bucket < 9000 && skipLoops < 1) {
            console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
            skipManagers = true;
            skipLoops++;
        }
        if (skipManagers === false)
            skipLoops = 0;
            
        Game.baseManager = baseManager;
        Game.militaryManager = militaryManager;
        Game.bases = {};

        for (var baseName in Memory.bases) {
            Game.bases[baseName] = {
                name: baseName,
                memory: Memory.bases[baseName],
                dropoff: [],
                pickups: []
            };
        }
    
        debug.beginLoop();        

        if (skipManagers === false) {
            debug.startGlobalSection();
            updateGlobal();
            debug.endSection();
            
            for (var name in Memory.bases) {
                var base = Game.bases[name];
                debug.startBaseSection(base);
                updateBase(base);
                debug.endSection();
            }
        }

        for(var name in Game.creeps) {
            var creep = Game.creeps[name];
            debug.startCreepSection(creep);            
            updateCreep(creep);
            debug.endSection();
        }

        debug.endLoop();
    }
}

function updateGlobal() {
    try
    {
        //Delete destroyed flags
        for (var flag in Memory.flags) {
            if (!Game.flags[flag])
                delete Memory.flags[flag];
        }

        militaryManager.updateGlobal(actions);
        baseManager.updateGlobal(militaryManager, actions);
    } catch (error) {
        console.log("[!] Global Error: " + error.stack);
    }
}

function updateBase(base) {
    try
    {
        var creepRequests = [];
        var structureRequests = [];
        var defenseRequests = [];
        militaryManager.updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
        baseManager.updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
    } catch (error) {
        console.log("[!] Base Error (" + base.name + "): " + error.stack);
    }
}

function updateCreep(creep) {
    try {
        if (creep.spawning)
            return;

        //TODO: This doesnt work across rooms
        if (creep.ticksToLive < 250 && !actions.hasAction(creep, 'recycle')) {
            var base = Memory.bases[creep.memory.base];
            if (base) {
                var spawn = Game.spawns[base.spawns[0]];
                if (spawn) {
                    actions.recycle(creep, spawn, true) //renew
                    return;
                }
            }
        }

        if (!actions.hasAnyAction(creep)) {
            if (creep.pos.x === 0 || creep.pos.y === 0 || creep.pos.x === 49 || creep.pos.y === 49) {
                actions.flee(creep, creep, 1);
                return;
            }
        }

        if (actions.continueAction(creep) === true)
            return;

        var memory = creep.memory;
        if (memory.military)
            militaryManager.updateCreep(creep, memory, actions);      
        else
            baseManager.updateCreep(creep, memory, actions);  
    } catch (error) {
        console.log("[!] Creep Error (" + creep.name + "): " + error.stack);
    }
}