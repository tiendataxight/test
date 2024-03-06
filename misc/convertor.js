"use strict";

// Import necessary modules
const fs = require("fs");
const path = require("path");

// Convert JSON schema to v3 format
function convertJsonSchemaToV3(jsonSchema) {
    // Initialize default values
    const defaultValues = {
        schema: 'v3',
        id: '',
        displayName: '',
        title: jsonSchema.title || '',
        workflowVersion: '',
        categories: [],
        description: jsonSchema.description || ''
    };

    // Extract inputs and UI from JSON schema
    const { inputs, ui } = getInputsAndUI(jsonSchema);

    // Combine default values with extracted inputs and UI
    return Object.assign(defaultValues, { inputs, ui });
}

// Extract inputs and UI from JSON schema
function getInputsAndUI(jsonSchema) {
    // Initialize inputsAndUI object with default structure
    const inputsAndUI = { inputs: {}, ui: { inputs: [] } };

    // Check if JSON schema contains "allOf" property
    if (jsonSchema.allOf) {
        // Iterate through each reference in "allOf"
        return jsonSchema.allOf.reduce((acc, ref) => {
            // Extract the group name from the reference
            const groupName = ref.$ref ? ref.$ref.split('/').pop() : '';

            // If group name exists and is defined in JSON schema
            if (groupName && jsonSchema.definitions && groupName in jsonSchema.definitions) {
                // Get the group definition
                const group = jsonSchema.definitions[groupName];

                // If group is an object
                if (typeof group === 'object') {
                    // Extract inputs from the group and merge with existing inputs
                    const groupInputs = getInputsFromGroup(group.properties, group.required);
                    const mergedInputs = Object.assign(acc.inputs, groupInputs);

                    // Extract UI from the group and add to existing UI inputs
                    const groupUI = getUIFromGroup(groupName, group);
                    const mergedUIInputs = [...acc.ui.inputs, groupUI];

                    // Return updated inputsAndUI object
                    return { inputs: mergedInputs, ui: { inputs: mergedUIInputs } };
                }
            }
            // Return the original inputsAndUI object if no valid group found
            return acc;
        }, inputsAndUI);
    }

    // Return inputsAndUI object if JSON schema does not contain "allOf" property
    return inputsAndUI;
}

// Extract inputs from property group
function getInputsFromGroup(properties, required) {
    return Object.entries(properties || {}).reduce((acc, [name, property]) => {
        if (typeof property === 'object') {
            const requiredValue = required ? required.includes(name) : false;
            const input = getInputFromProperty(property, requiredValue);
            return Object.assign(acc, { [name]: input });
        }
        return acc;
    }, {});
}

// Extract UI from property group
function getUIFromGroup(groupName, group) {
    return {
        id: groupName,
        title: group.title || groupName,
        description: group.description || '',
        fields: Object.keys(group.properties || {})
    };
}

// Extract input details from property
function getInputFromProperty(property, required) {
    // Initialize base object with common properties
    const base = {
        title: property.title || '',
        required,
        description: property.description || '',
        default: property.default || '',
        help_text: property.help_text || '',
        hidden: property.hidden || false
    };

    // Check property type and format to determine additional properties
    if (property.type === 'string') {
        // If property has enum, format it accordingly
        if ('enum' in property) {
            return Object.assign(base, {
                type: 'string',
                format: 'enum',
                enum: property.enum.map(option => ({ id: option, name: option }))
            });
        }
        // If property format is file path, update format
        if (property.format === 'file-path') {
            return Object.assign(base, { type: 'string', format: 'file' });
        }
        // If property format is directory path, update format
        if (property.format === 'directory-path') {
            return Object.assign(base, { type: 'string', format: 'dir-path' });
        }
    }
    // If property type is integer, include minimum and maximum values
    if (property.type === 'integer') {
        return Object.assign(base, {
            type: 'integer',
            minimum: property.minimum || '',
            maximum: property.maximum || ''
        });
    }
    // If property type is boolean, set type to boolean
    if (property.type === 'boolean') {
        return Object.assign(base, { type: 'boolean' });
    }
    // For any other type, default to string type and include pattern if available
    return Object.assign(base, { type: 'string', pattern: property.pattern || '' });
}

// Get the file path from command line arguments
const schemaFilePath = process.argv[2];

// Read JSON schema from file
const jsonSchema = JSON.parse(fs.readFileSync(schemaFilePath, 'utf-8'));

// Convert JSON schema to v3 format
const v3Json = JSON.stringify(convertJsonSchemaToV3(jsonSchema), null, 2);

// Write v3 JSON schema to file
fs.writeFileSync(`${path.dirname(schemaFilePath)}/workflow.json`, v3Json, 'utf-8');
