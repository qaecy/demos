import * as WEBIFC from "web-ifc";
import { IfcCategoryMap } from "../ifc-category-map";
export class IfcPropertiesUtils {
    static async getUnits(group) {
        const { IFCUNITASSIGNMENT } = WEBIFC;
        const allUnitsSets = await group.getAllPropertiesOfType(IFCUNITASSIGNMENT);
        if (!allUnitsSets) {
            return 1;
        }
        const unitIDs = Object.keys(allUnitsSets);
        const allUnits = allUnitsSets[parseInt(unitIDs[0], 10)];
        for (const unitRef of allUnits.Units) {
            if (unitRef.value === undefined || unitRef.value === null)
                continue;
            const unit = await group.getProperties(unitRef.value);
            if (!unit || !unit.UnitType || !unit.UnitType.value) {
                continue;
            }
            const value = unit.UnitType.value;
            if (value !== "LENGTHUNIT")
                continue;
            let factor = 1;
            let unitValue = 1;
            if (unit.Name.value === "METRE") {
                unitValue = 1;
            }
            if (unit.Name.value === "FOOT") {
                unitValue = 0.3048;
            }
            if (unit.Prefix?.value === "MILLI") {
                factor = 0.001;
            }
            return unitValue * factor;
        }
        return 1;
    }
    static async findItemByGuid(model, guid) {
        const ids = model.getAllPropertiesIDs();
        for (const id of ids) {
            const property = await model.getProperties(id);
            if (property && property.GlobalId?.value === guid) {
                return property;
            }
        }
        return null;
    }
    static async getRelationMap(model, relationType, onElementsFound) {
        const defaultCallback = () => { };
        const _onElementsFound = onElementsFound ?? defaultCallback;
        const result = {};
        const ids = model.getAllPropertiesIDs();
        for (const expressID of ids) {
            const prop = await model.getProperties(expressID);
            if (!prop) {
                continue;
            }
            const isRelation = prop.type === relationType;
            const relatingKey = Object.keys(prop).find((key) => key.startsWith("Relating"));
            const relatedKey = Object.keys(prop).find((key) => key.startsWith("Related"));
            if (!(isRelation && relatingKey && relatedKey))
                continue;
            const relating = await model.getProperties(prop[relatingKey]?.value);
            const related = prop[relatedKey];
            if (!relating || !related) {
                continue;
            }
            if (!(related && Array.isArray(related)))
                continue;
            const elements = related.map((el) => {
                return el.value;
            });
            _onElementsFound(relating.expressID, elements);
            result[relating.expressID] = elements;
        }
        return result;
    }
    static async getQsetQuantities(model, expressID, onQuantityFound) {
        const defaultCallback = () => { };
        const _onQuantityFound = onQuantityFound ?? defaultCallback;
        const pset = await model.getProperties(expressID);
        if (!pset || pset.type !== WEBIFC.IFCELEMENTQUANTITY) {
            return null;
        }
        const quantities = pset.Quantities ?? [{}];
        const qtos = quantities.map((prop) => {
            if (prop.value)
                _onQuantityFound(prop.value);
            return prop.value;
        });
        return qtos.filter((prop) => prop !== null);
    }
    static async getPsetProps(model, expressID, onPropFound) {
        const defaultCallback = () => { };
        const _onPropFound = onPropFound ?? defaultCallback;
        const pset = await model.getProperties(expressID);
        if (!pset || pset.type !== WEBIFC.IFCPROPERTYSET) {
            return null;
        }
        const hasProperties = pset.HasProperties ?? [{}];
        const props = hasProperties.map((prop) => {
            if (prop.value)
                _onPropFound(prop.value);
            return prop.value;
        });
        return props.filter((prop) => prop !== null);
    }
    static async getPsetRel(model, psetID) {
        const prop = await model.getProperties(psetID);
        if (!prop) {
            return null;
        }
        const allPropsRels = await model.getAllPropertiesOfType(WEBIFC.IFCRELDEFINESBYPROPERTIES);
        if (!allPropsRels) {
            return null;
        }
        const allRels = Object.values(allPropsRels);
        let found = null;
        for (const rel of allRels) {
            if (rel.RelatingPropertyDefinition?.value === psetID) {
                found = rel.expressID;
            }
        }
        return found;
    }
    static async getQsetRel(model, qsetID) {
        return IfcPropertiesUtils.getPsetRel(model, qsetID);
    }
    static async getEntityName(model, entityID) {
        const entity = await model.getProperties(entityID);
        if (!entity) {
            return { key: null, name: null };
        }
        const key = Object.keys(entity).find((key) => key.endsWith("Name")) ?? null;
        const name = key ? entity[key]?.value : null;
        return { key, name };
    }
    static async getQuantityValue(model, quantityID) {
        const quantity = await model.getProperties(quantityID);
        if (!quantity) {
            return { key: null, value: null };
        }
        const key = Object.keys(quantity).find((key) => key.endsWith("Value")) ?? null;
        let value;
        if (key === null) {
            value = null;
        }
        else if (quantity[key] === undefined || quantity[key] === null) {
            value = null;
        }
        else {
            value = quantity[key].value;
        }
        return { key, value };
    }
    static isRel(expressID) {
        const entityName = IfcCategoryMap[expressID];
        return entityName.startsWith("IFCREL");
    }
    static async attributeExists(model, expressID, attribute) {
        const entity = await model.getProperties(expressID);
        if (!entity) {
            return false;
        }
        return Object.keys(entity).includes(attribute);
    }
    static async groupEntitiesByType(model, expressIDs) {
        const categoriesMap = new Map();
        for (const expressID of expressIDs) {
            const entity = await model.getProperties(expressID);
            if (!entity) {
                continue;
            }
            const key = entity.type;
            const set = categoriesMap.get(key);
            if (!set)
                categoriesMap.set(key, new Set());
            categoriesMap.get(key)?.add(expressID);
        }
        return categoriesMap;
    }
}
//# sourceMappingURL=index.js.map