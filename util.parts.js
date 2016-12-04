"use strict";
module.exports.get = function(initialParts, repeatParts, maxCost) {
    var body = [].concat(initialParts);
    var currentCost = calcBodyCost(initialParts);
    var nextCost;

    if (repeatParts.length > 0) {
        var partsCost = calcBodyCost(repeatParts);
        nextCost = currentCost + partsCost;
        while(nextCost <= maxCost || body.length === 0) {
            body = body.concat(repeatParts);
            currentCost += partsCost;
            nextCost += partsCost;
        }

        //Body cannot have more than 50 parts
        if (body.length > 50) {
            body = body.slice(0, 50);
            cost = calcBodyCost(nextBody);
            nextCost = 0;
        }
        else if (body.length + repeatParts.length > 50) {
            var nextBody = body.concat(repeatParts.slice(0, 50 - (body.length + repeatParts.length))) 
            nextCost = calcBodyCost(nextBody);
        }
    }
    else
        nextCost = 0;

    return {
        body: body,
        cost: currentCost,
        upgradeCost: nextCost
    };
}

module.exports.getPowerLevel = function(creep) {
    var attack = creep.getActiveBodyparts(ATTACK);
    var rangedAttack = creep.getActiveBodyparts(RANGED_ATTACK);
    var heal = creep.getActiveBodyparts(HEAL);
    var hits = creep.hits;
    return (attack * 800) + (rangedAttack * 1500) + (heal * 2500) + hits;
}

function calcBodyCost(body) {
    var cost = 0;
    for (var i = 0; i < body.length; i++)
        cost += BODYPART_COST[body[i]];
    return cost;
} 