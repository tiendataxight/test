"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));

var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});

var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};

const fs = __importStar(require("fs"));
const path_1 = __importDefault(require("path"));

function convertJsonSchemaToV3(jsonSchema) {
    var _a, _b;
    return Object.assign({ schema: 'v3', id: '', displayName: '', title: (_a = jsonSchema.title) !== null && _a !== void 0 ? _a : '', workflowVersion: '', categories: [], description: (_b = jsonSchema.description) !== null && _b !== void 0 ? _b : '' }, getInputsAndUI(jsonSchema));
}

function getInputsAndUI(jsonSchema) {
    const inputsAndUI = { inputs: {}, ui: { inputs: [] } };
    if (jsonSchema.allOf) {
        return jsonSchema.allOf.reduce((acc, ref) => {
            var _a, _b;
            const groupName = (_b = (_a = ref.$ref) === null || _a === void 0 ? void 0 : _a.split('/').pop()) !== null && _b !== void 0 ? _b : '';
            if (groupName && jsonSchema.definitions && groupName in jsonSchema.definitions) {
                const group = jsonSchema.definitions[groupName];
                if (typeof group === 'object') {
                    return {
                        inputs: Object.assign(Object.assign({}, acc.inputs), getInputsFromGroup(group.properties, group.required)),
                        ui: {
                            inputs: [
                                ...acc.ui.inputs,
                                getUIFromGroup(groupName, group),
                            ]
                        }
                    };
                }
            }
            return acc;
        }, inputsAndUI);
    }
    return inputsAndUI;
}
function getInputsFromGroup(properties, required) {
    return Object.entries(properties !== null && properties !== void 0 ? properties : {}).reduce((acc, [name, property]) => {
        var _a;
        if (typeof property === 'object') {
            const requiredValue = (_a = required === null || required === void 0 ? void 0 : required.includes(name)) !== null && _a !== void 0 ? _a : false;
            const input = getInputFromProperty(property, requiredValue);
            return Object.assign(Object.assign({}, acc), { [name]: input });
        }
        return acc;
    }, {});
}
function getUIFromGroup(groupName, group) {
    var _a, _b, _c;
    return {
        id: groupName,
        title: (_a = group.title) !== null && _a !== void 0 ? _a : groupName,
        description: (_b = group.description) !== null && _b !== void 0 ? _b : '',
        fields: Object.keys((_c = group.properties) !== null && _c !== void 0 ? _c : {})
    };
}
function getInputFromProperty(property, required) {
    var _a;
    const base = Object.assign(Object.assign(Object.assign(Object.assign({ title: (_a = property.title) !== null && _a !== void 0 ? _a : '', required }, (property.description && { description: property.description })), (property.default && { default: property.default })), (property.help_text && { help_text: property.help_text })), (property.hidden && { hidden: property.hidden }));
    if (property.type === 'string') {
        if ('enum' in property) {
            return Object.assign(Object.assign({}, base), { type: 'string', format: 'enum', enum: property.enum.map((option) => ({ id: option, name: option })) });
        }
        if (property.format === 'file-path') {
            return Object.assign(Object.assign({}, base), { type: 'string', format: 'file' });
        }
        if (property.format === 'directory-path') {
            return Object.assign(Object.assign({}, base), { type: 'string', format: 'dir-path' });
        }
    }
    if (property.type === 'integer') {
        return Object.assign(Object.assign(Object.assign(Object.assign({}, base), { type: 'integer' }), (property.minimum && { minimum: property.minimum })), (property.maximum && { maximum: property.maximum }));
    }
    if (property.type === 'boolean') {
        return Object.assign(Object.assign({}, base), { type: 'boolean' });
    }
    if (property.type == 'array') {
        const itemsArray = Object.entries(property.items).map(([key, value]) => ({ 'id': key, 'name': value }));
        return Object.assign(base, { uniqueItems: true, type: 'array', items: itemsArray });
    }
    return Object.assign(Object.assign(Object.assign({}, base), { type: 'string' }), (property.pattern && { pattern: property.pattern }));
}

const schemaFilePath = process.argv[2];
const jsonSchema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf-8'));
const v3Json = JSON.stringify((0, convertJsonSchemaToV3)(jsonSchema), null, 2);
fs.writeFileSync(`${path_1.default.dirname(schemaFilePath)}/workflow.json`, v3Json, 'utf-8');