"use strict";
var actions = require('actions');
var debug = require('util.debug');
var listUtils = require('util.list');
var mapUtils = require('util.map');
var memoryUtils = require('util.memory');
var partUtils = require('util.parts');
var requestUtils = require('util.requests');
var scanner = require('util.scanner');
var planner = require('util.planner');
var baseManagers = [
    require('base.storage'),
    require('base.territory'),
    
    require('base.creeps'),
    require('base.construction'),

    require('base.builders'),
    require('base.harvesters'),
    require('base.miners'),
    require('base.transporters'),
    require('base.upgraders'),
    
    require('base.spawns')
]
var militaryManagers = [
    require('military.creeps'),
    require('military.intel'),
    require('military.flags'),

    require('military.squads'),

    require('military.reservations'),
    require('military.defense'),
    require('military.scouts')    
]
var creepManagers = {
    builder_defense: require('creep.builder_defense'),
    builder_road: require('creep.builder_road'),
    builder_structure: require('creep.builder_structure'),
    collector: require('creep.collector'),
    harvester: require('creep.harvester'),
    harvester_simple: require('creep.harvester_simple'),
    healer: require('creep.healer'),
    maintainer: require('creep.maintainer'),
    miner: require('creep.miner'),
    recharger: require('creep.recharger'),
    recharger_core: require('creep.recharger_core'),
    repairer: require('creep.repairer'),
    scavenger: require('creep.scavenger'),
    upgrader: require('creep.upgrader')
}
var unitManagers = {
    healer: require('unit.healer'),
    reserver: require('unit.reserver'),
    scout: require('unit.scout'),
    melee: require('unit.melee'),
    ranged: require('unit.ranged')
}
var towerManager = require('structure.tower');

function init() {
    memoryUtils.init();

    //Find spawns and build bases
    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        Memory.structures[spawn.id] = {};
        if (!Memory.bases[spawn.room.name])
            createBase(spawn.room).memory;
    }
    
    //Set up military roles
    var militaryMemory = Memory.military;
    for (var manager in unitManagers)
        militaryMemory.roles[manager] = [];
}

module.exports.loop = function () {
    if (!Memory.bases)
        init(); //Init Memory

    Game.debug = debug;
    if (Memory.debug.run === true) {
            
        Game.bases = {};
        var bucketLevel = checkBucket();

        debug.beginLoop();
        if (bucketLevel >= 2) {
            updateGlobal();            
            for (var name in Memory.bases)
                updateBase(name);
        }
        if (bucketLevel >= 1) {
            for(var name in Game.creeps)  
                updateCreep(Game.creeps[name]);
        }
        debug.endLoop();
    }
}

function updateGlobal() {
    try
    {
        debug.startGlobalSection();

        Game.creepManagers = creepManagers;
        Game.unitManagers = unitManagers;

        for (var i = 0; i < unitManagers.length; i++)
            militaryManagers[i].updateGlobal(actions);
        for (var i = 0; i < baseManagers.length; i++)
            baseManagers[i].updateGlobal(actions);

        debug.endSection();
    } catch (error) {
        console.log("[!] Global Error: " + error.stack);
    }
}

function updateBase(name) {
    try
    {        
        var base = {
            name: name,
            memory: Memory.bases[name],
            dropoffs: [],
            pickups: []
        };
        Game.bases[name] = base;

        var creepRequests = [];
        var structureRequests = [];
        var defenseRequests = [];

        for (var i = 0; i < militaryManagers.length; i++) {
            debug.startBaseSection(base, militaryManagers[i].name);
            militaryManagers[i].updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
            debug.endSection();
        }
        for (var i = 0; i < baseManagers.length; i++) {
            debug.startBaseSection(base, baseManagers[i].name);
            baseManagers[i].updateBase(base, actions, creepRequests, structureRequests, defenseRequests);
            debug.endSection();
        }

        //Update towers
        var towers = base.memory.structures[STRUCTURE_TOWER];
        for(var i = 0; i < towers.length; i++)
            towerManager.updateTower(Game.structures[towers[i]], actions);

    } catch (error) {
        console.log("[!] Base Error (" + name + "): " + error.stack);
    }
}

function updateCreep(creep) {
    try {
        if (creep.spawning)
            return;

        debug.startCreepSection(creep);

        /*if (creep.ticksToLive < 150 && !actions.hasAction(creep, 'recycle') && !actions.hasAction(creep, 'renew') && !creep.memory.military) {
            var base = Memory.bases[creep.memory.base];
            if (base) {
                var spawn = Game.spawns[base.spawns[0]];
                if (spawn) {
                    actions.renew(creep, spawn, true);
                    return;
                }
            }
        }*/

        if (!actions.hasAnyAction(creep)) {
            if (creep.pos.x === 0 || creep.pos.y === 0 || creep.pos.x === 49 || creep.pos.y === 49)
                actions.flee(creep, creep, 1);
        }

        if (actions.continueAction(creep) !== true) {
            var memory = creep.memory;
            if (memory.military)
                unitManagers[memory.role].update(creep, memory, actions);  
            else
                creepManagers[memory.role].update(creep, memory, actions);
        }

        debug.endSection();
    } catch (error) {
        console.log("[!] Creep Error (" + creep.name + "): " + error.stack);
    }
}

function createBase(room) {
    var baseMemory = memoryUtils.createBase();
    var base = {
        name: room.name,
        memory: baseMemory
    };
    Memory.bases[room.name] = baseMemory;
    Game.bases[room.name] = base;

    baseMemory.structures[STRUCTURE_CONTROLLER] = [];
    for (var structureType in CONSTRUCTION_COST) {
        if (structureType !== STRUCTURE_RAMPART &&
            structureType !== STRUCTURE_WALL && 
            structureType !== STRUCTURE_ROAD &&
            structureType !== STRUCTURE_CONTAINER)
        baseMemory.structures[structureType] = [];
    }

    var structures = room.find(FIND_MY_STRUCTURES);
    for (var i = 0; i < structures.length; i++) {
        var structure = structures[i];
        var list = baseMemory.structures[structure.structureType];
        if (list)
            listUtils.add(list, structure.id);
        if (structure.structureType === STRUCTURE_SPAWN)
            listUtils.add(baseMemory.spawns, structure.name);
    }

    scanner.scanRoom(room);
    claimRoom(base, room);    
    
    for (var manager in creepManagers) {
        baseMemory.roles[manager] = {
            parts: {
                move: 0,
                work: 0,
                carry: 0,
                attack: 0,
                ranged_attack: 0,
                tough: 0,
                heal: 0,
                claim: 0
            },
            creeps: []
        };
    }
}

var skipLoops = 0;
function checkBucket() {    
    var bucket = Game.cpu.bucket;

    //Skip partial/full frames if we're having troubles
    if (bucket < 6000) {
        console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");
        skipLoops = 0;
        return 0;                     
    }
    else if ((bucket < 7000 && skipLoops < 1)) {
        console.log("CPU Bucket is low (" + bucket + "), skipping all ticks");
        skipLoops++;
        return 0;
    }
    else if (bucket < 8000) {
        console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
        skipLoops = 0;
        return 1;
    }
    else if (bucket < 9000 && skipLoops < 1) {
        console.log("CPU Bucket is low (" + bucket + "), skipping global/base tick");
        skipLoops++;
        return 1;
    }
    else {
        skipLoops = 0;
        return 2;
    }
}