import { RSPQLParser, ParsedQuery } from "../parser/RSPQLParser";
import { QueryCombiner } from "./QueryCombiner";

it("combiningQueriesForActivityIndex", () => {

    const queryOne = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgX)
FROM NAMED WINDOW :w1 ON STREAM <acc-x> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s saref:hasValue ?o .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
    }
}`;

    const queryTwo = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 
REGISTER RStream <output> AS
SELECT (AVG(?o2) AS ?avgY)
FROM NAMED WINDOW :w2 ON STREAM <acc-y> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w2 {
        ?s saref:hasValue ?o2 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.y .
    }
}
`;

    const queryThree = `  
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (AVG(?o3) AS ?avgZ)
FROM NAMED WINDOW :w3 ON STREAM <acc-z> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w3 {
        ?s saref:hasValue ?o3 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.z .
    }
}`;
    const combiner = new QueryCombiner();
    combiner.addQuery(queryOne);
    combiner.addQuery(queryTwo);
    combiner.addQuery(queryThree);
    const combined_parsedQuery = combiner.combine();
    console.log(combiner.ParsedToString(combined_parsedQuery));
    console.log(new RSPQLParser().parse(combiner.ParsedToString(combined_parsedQuery)).sparql);
});

it("combiningQueriesForJOIN", () => {
    const queryOne = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO) 
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?s :hasValue ?o .
        :man :hasName :name2 .
        ?p :hasName :name4 .
        ?p :relatesTo ?s .
    }
}`;
    const queryTwo = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO)
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?s :hasName :name1 .
        ?e :hasName :name3 .
        ?e :relatesTo ?s .
        ?s :hasValue ?o .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(queryOne);
    combiner.addQuery(queryTwo);
    const combined_parsedQuery = combiner.combine();
    console.log(combined_parsedQuery);
    
    // console.log(combiner.ParsedToString(combined_parsedQuery));
});

it("combiningQueriesWithStrictSubjectMatch", () => {
    const queryOne = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO)
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?s :hasValue ?o .
        ?p :hasName :name4 .
    }
}`;
    const queryTwo = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO)
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?s :hasName :name1 .
        ?p :relatesTo ?s .
    }
}`;
    const combiner = new QueryCombiner();
    combiner.addQuery(queryOne);
    combiner.addQuery(queryTwo);
    const combined_parsedQuery = combiner.combine(true); 
    console.log("Strict match (sets equal):");
    console.log(combiner.ParsedToString(combined_parsedQuery));
});

it("combiningQueriesWithPartialSubjectOverlap", () => {
    const queryOne = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO)
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?s :hasValue ?o .
        ?s :hasName ?name .
    }
}`;
    const queryTwo = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?o) AS ?avgO)
FROM NAMED WINDOW :w1 ON STREAM <stream1> [RANGE 10 STEP 10]
WHERE {
    WINDOW :w1 {
        ?e :hasName :name1 .
        ?p :relatesTo ?e .
    }
}`;
    const combiner = new QueryCombiner();
    combiner.addQuery(queryOne);
    combiner.addQuery(queryTwo);
    const combined_parsedQuery = combiner.combine(false);
    console.log(combiner.ParsedToString(combined_parsedQuery));
});

it("combiningQueriesOfAverageAndMaximumAggregation", () => {
    const query1 = `
            PREFIX mqtt_broker: <mqtt://localhost:1883/>
    PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgWearableX)
FROM NAMED WINDOW mqtt_broker:wearableX ON STREAM mqtt_broker:wearableX [RANGE 120000 STEP 60000]
WHERE {
    WINDOW mqtt_broker:wearableX {
        ?s1 saref:hasValue ?value .
        ?s1 saref:relatesToProperty dahccsensors:wearableX .
}
}
    `;
    const query2 = `
                PREFIX mqtt_broker: <mqtt://localhost:1883/>
    PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgSmartphoneX)
FROM NAMED WINDOW mqtt_broker:smartphoneX ON STREAM mqtt_broker:smartphoneX [RANGE 120000 STEP 60000]
WHERE {
    WINDOW mqtt_broker:smartphoneX {
        ?s2 saref:hasValue ?value .
        ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
    }
}
    `;
        const expectedQuery = `
PREFIX mqtt_broker: <mqtt://localhost:1883/>
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 

REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgValue)
FROM NAMED WINDOW mqtt_broker:wearableX ON STREAM mqtt_broker:wearableX [RANGE 120000 STEP 60000]
FROM NAMED WINDOW mqtt_broker:smartphoneX ON STREAM mqtt_broker:smartphoneX [RANGE 120000 STEP 60000]
WHERE {
    {
        WINDOW mqtt_broker:wearableX {
            ?s1 saref:hasValue ?value .
            ?s1 saref:relatesToProperty dahccsensors:wearableX .
        }
    } UNION {
        WINDOW mqtt_broker:smartphoneX {
            ?s2 saref:hasValue ?value .
            ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
        }
    }
}
    `;
    const expectedParsedQuery = new RSPQLParser().parse(expectedQuery);
    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);
    const combinedQuery = combiner.combine();
    console.log(expectedParsedQuery);
    console.log(combinedQuery);

});

it("should handle ontology mapping in semantic context extraction", () => {
    const query1 = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgValue)
FROM NAMED WINDOW :w1 ON STREAM <sensor> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        :sensor1 :hasValue ?value .
        :sensor1 :sensorType :temperatureSensor .
    }
}`;

    const query2 = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgValue)
FROM NAMED WINDOW :w2 ON STREAM <sensor2> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w2 {
        :sensor2 :hasValue ?value .
        :sensor2 :sensorType :temperatureSensor .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);

    // Ontology mapping that maps predicates and entities to common concepts
    const ontology = {
        'http://example.org/hasValue': 'measurement',
        'http://example.org/sensorType': 'sensor_type',
        'http://example.org/temperatureSensor': 'temp_sensor',
        'http://example.org/sensor1': 'sensor',
        'http://example.org/sensor2': 'sensor'
    };

    const result = combiner.combine(false, ontology);

    // Should unify variables and process triples within GRAPH blocks
    expect(result.aggregation_thing_in_context).toHaveLength(1);
    expect(result.projection_variables).toContain('avgValue');
});

it("should handle malformed SPARQL in ParsedToString method", () => {
    const combiner = new QueryCombiner();

    // Create a ParsedQuery with malformed SPARQL that will cause WHERE clause parsing to fail
    const malformedParsedQuery = new ParsedQuery();
    malformedParsedQuery.sparql = "SELECT ?x WHERE INVALID";
    malformedParsedQuery.projection_variables = ['x'];

    // This should trigger the WHERE clause parsing error in ParsedToString
    expect(() => {
        combiner.ParsedToString(malformedParsedQuery);
    }).toThrow("Invalid SPARQL content: missing WHERE clause");
});

it("should not unify semantically different variables", () => {
    const query1 = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?temp) AS ?avgTemp)
FROM NAMED WINDOW :w1 ON STREAM <temp-sensor> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s :hasTemperature ?temp .
        ?s :sensorType :temperatureSensor .
    }
}`;

    const query2 = `
PREFIX : <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?humidity) AS ?avgHumidity)
FROM NAMED WINDOW :w2 ON STREAM <humidity-sensor> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w2 {
        ?s :hasHumidity ?humidity .
        ?s :sensorType :humiditySensor .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);

    const result = combiner.combine();

    // Should keep both variables separate as they represent different concepts
    expect(result.aggregation_thing_in_context).toHaveLength(2);
    expect(result.aggregation_thing_in_context).toContain('temp');
    expect(result.aggregation_thing_in_context).toContain('humidity');
});

it("should throw error when no queries to combine", () => {
    const combiner = new QueryCombiner();
    expect(() => combiner.combine()).toThrow("No queries to combine");
});

it("should handle single query combination", () => {
    const query = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgValue)
FROM NAMED WINDOW :w1 ON STREAM <sensor> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s saref:hasValue ?value .
        ?s saref:relatesToProperty :temperature .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query);
    const result = combiner.combine();

    // Should return the same query structure
    expect(result.aggregation_thing_in_context).toContain('value');
    expect(result.projection_variables).toContain('avgValue');
});

it("should handle queries with different aggregation functions", () => {
    const query1 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (AVG(?value) AS ?avgValue)
FROM NAMED WINDOW :w1 ON STREAM <sensor1> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s saref:hasValue ?value .
        ?s saref:relatesToProperty :temperature .
    }
}`;

    const query2 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (MAX(?value) AS ?maxValue)
FROM NAMED WINDOW :w2 ON STREAM <sensor2> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w2 {
        ?s saref:hasValue ?value .
        ?s saref:relatesToProperty :temperature .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);
    const result = combiner.combine();

    // Should not set aggregation function when they differ
    expect(result.aggregation_function).toBe('');
    // Variables should not be unified when aggregation functions differ
    expect(result.aggregation_thing_in_context).toHaveLength(0);
});

it("should handle malformed queries gracefully", () => {
    const malformedQuery = "INVALID QUERY";

    const combiner = new QueryCombiner();
    combiner.addQuery(malformedQuery);

    // Should not crash, but parser might throw error
    expect(() => combiner.combine()).toThrow();
});

it("should handle queries with direct triples outside GRAPH blocks", () => {
    const combiner = new QueryCombiner();

    // Create ParsedQuery manually with SPARQL containing direct triples
    const parsedQuery = new ParsedQuery();
    parsedQuery.sparql = `PREFIX : <http://example.org/>
SELECT (AVG(?value) AS ?avgValue)
WHERE {
    ?sensor :hasValue ?value .
    ?sensor :sensorType :temperatureSensor .
    GRAPH :w1 { ?s :hasValue ?value . }
}`;
    parsedQuery.aggregation_function = 'AVG';
    parsedQuery.aggregation_thing_in_context = ['value'];
    parsedQuery.projection_variables = ['avgValue'];
    parsedQuery.s2r = [{
        window_name: 'http://example.org/w1',
        stream_name: 'sensor',
        width: 60000,
        slide: 60000
    }];

    // Test the extractTriplesFromSparql method directly to cover direct triple extraction
    const triples = (combiner as any).extractTriplesFromSparql(parsedQuery.sparql);

    // Should extract both direct triples and GRAPH triples
    expect(triples.length).toBeGreaterThan(1);
    expect(triples.some((triple: string[]) => triple[0] === '?sensor' && triple[1] === ':hasValue')).toBe(true);
});

it("should handle ontology mapping in semantic context extraction", () => {
    const query1 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (AVG(?temp) AS ?avgTemp)
FROM NAMED WINDOW :w1 ON STREAM <temp-sensor> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s saref:hasValue ?temp .
        ?s :connectedTo :building123 .
    }
}`;

    const query2 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX : <https://rsp.js>
REGISTER RStream <output> AS
SELECT (AVG(?temp) AS ?avgTemp)
FROM NAMED WINDOW :w2 ON STREAM <temp-sensor2> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w2 {
        ?s saref:hasValue ?temp .
        ?s :connectedTo :building456 .
    }
}`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);

    // Ontology mapping that maps entities
    const ontology = {
        'https://saref.etsi.org/core/hasValue': 'measurement',
        'https://rsp.js#connectedTo': 'location',
        ':building123': 'building_a',
        ':building456': 'building_b'
    };

    const result = combiner.combine(false, ontology);

    // Should unify variables despite different entity contexts
    expect(result.aggregation_thing_in_context).toHaveLength(1);
    expect(result.projection_variables).toContain('avgValue');
});

it("should test combineQueries method error handling", () => {
    const combiner = new QueryCombiner();

    // Test with no queries - should throw error
    expect(() => combiner.combineQueries()).toThrow("No queries to combine");

    // Add a query and test that it doesn't throw (even though method is incomplete)
    const query = `
    PREFIX : <http://example.org/>
    REGISTER RStream <output> AS
    SELECT (AVG(?value) AS ?avgValue)
    FROM NAMED WINDOW :w1 ON STREAM <sensor> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w1 {
            ?s :hasValue ?value .
        }
    }`;

    combiner.addQuery(query);
    // This will execute the incomplete method but shouldn't throw
    expect(() => combiner.combineQueries()).not.toThrow();
});

it("should cover different aggregation handling paths", () => {
    // Test case 1: No aggregation functions at all
    const queryNoAgg1 = `
    PREFIX : <http://example.org/>
    REGISTER RStream <output> AS
    SELECT ?value
    FROM NAMED WINDOW :w1 ON STREAM <sensor> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w1 {
            ?s :hasValue ?value .
        }
    }`;

    const queryNoAgg2 = `
    PREFIX : <http://example.org/>
    REGISTER RStream <output> AS
    SELECT ?otherValue
    FROM NAMED WINDOW :w2 ON STREAM <sensor2> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w2 {
            ?s :hasOtherValue ?otherValue .
        }
    }`;

    const combiner1 = new QueryCombiner();
    combiner1.addQuery(queryNoAgg1);
    combiner1.addQuery(queryNoAgg2);
    const result1 = combiner1.combine();

    // Should have empty aggregation function and collect all projection variables
    expect(result1.aggregation_function).toBe('');
    expect(result1.projection_variables).toContain('value');
    expect(result1.projection_variables).toContain('otherValue');

    // Test case 2: Mixed aggregation functions (already covered but ensure path is hit)
    const queryMixed1 = `
    PREFIX : <http://example.org/>
    REGISTER RStream <output> AS
    SELECT (AVG(?val) AS ?avgVal)
    FROM NAMED WINDOW :w1 ON STREAM <sensor> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w1 {
            ?s :hasValue ?val .
        }
    }`;

    const queryMixed2 = `
    PREFIX : <http://example.org/>
    REGISTER RStream <output> AS
    SELECT (MAX(?val) AS ?maxVal)
    FROM NAMED WINDOW :w2 ON STREAM <sensor2> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w2 {
            ?s :hasValue ?val .
        }
    }`;

    const combiner2 = new QueryCombiner();
    combiner2.addQuery(queryMixed1);
    combiner2.addQuery(queryMixed2);
    const result2 = combiner2.combine();

    // Should have empty aggregation function when functions differ
    expect(result2.aggregation_function).toBe('');
    expect(result2.aggregation_thing_in_context).toHaveLength(0);
});

it("should test semantic unification with complex ontology", () => {
    const query1 = `
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX : <https://rsp.js>
    REGISTER RStream <output> AS
    SELECT (AVG(?measurement) AS ?avgMeasurement)
    FROM NAMED WINDOW :w1 ON STREAM <sensor1> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w1 {
            ?sensor saref:hasValue ?measurement .
            ?sensor saref:relatesToProperty :temperature .
        }
    }`;

    const query2 = `
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX : <https://rsp.js>
    REGISTER RStream <output> AS
    SELECT (AVG(?reading) AS ?avgReading)
    FROM NAMED WINDOW :w2 ON STREAM <sensor2> [RANGE 60000 STEP 60000]
    WHERE {
        WINDOW :w2 {
            ?device saref:hasValue ?reading .
            ?device saref:relatesToProperty :temp .
        }
    }`;

    const combiner = new QueryCombiner();
    combiner.addQuery(query1);
    combiner.addQuery(query2);

    // Complex ontology mapping
    const ontology = {
        'https://saref.etsi.org/core/hasValue': 'measures',
        'https://rsp.js#temperature': 'temp_property',
        'https://rsp.js#temp': 'temp_property',
        '?measurement': 'sensor_value',
        '?reading': 'sensor_value'
    };

    const result = combiner.combine(false, ontology);

    // Should unify the semantically equivalent variables
    expect(result.aggregation_thing_in_context).toHaveLength(1);
    expect(result.projection_variables).toContain('avgValue');
});

it("should test ParsedToString with various SPARQL structures", () => {
    const combiner = new QueryCombiner();

    // Test with single WINDOW block
    const parsedQuery1 = new ParsedQuery();
    parsedQuery1.prefixes.set('', 'http://example.org/');
    parsedQuery1.r2s = { operator: 'RStream', name: 'output' };
    parsedQuery1.projection_variables = ['value'];
    parsedQuery1.s2r = [{
        window_name: 'http://example.org/w1',
        stream_name: 'sensor',
        width: 60000,
        slide: 30000
    }];
    parsedQuery1.sparql = `SELECT ?value WHERE {
    WINDOW :w1 { ?s :hasValue ?value . }
}`;

    const result1 = combiner.ParsedToString(parsedQuery1);
    expect(result1).toContain('WINDOW :w1');
    expect(result1).toContain('?s :hasValue ?value .');

    // Test with UNION blocks (different windows)
    const parsedQuery2 = new ParsedQuery();
    parsedQuery2.prefixes.set('', 'http://example.org/');
    parsedQuery2.r2s = { operator: 'RStream', name: 'output' };
    parsedQuery2.projection_variables = ['value'];
    parsedQuery2.s2r = [
        {
            window_name: 'http://example.org/w1',
            stream_name: 'sensor1',
            width: 60000,
            slide: 30000
        },
        {
            window_name: 'http://example.org/w2',
            stream_name: 'sensor2',
            width: 60000,
            slide: 30000
        }
    ];
    parsedQuery2.sparql = `SELECT ?value WHERE {
    { GRAPH :w1 { ?s :hasValue ?value . } } UNION { GRAPH :w2 { ?s :hasValue ?value . } }
}`;

    const result2 = combiner.ParsedToString(parsedQuery2);
    expect(result2).toContain('UNION');
    expect(result2).toContain('FROM NAMED WINDOW :w1');
    expect(result2).toContain('FROM NAMED WINDOW :w2');
});

it("should test IRI shortening functionality", () => {
    const combiner = new QueryCombiner();

    const prefixes = new Map([
        ['saref', 'https://saref.etsi.org/core/'],
        ['', 'https://rsp.js/']
    ]);

    // Test full IRI shortening
    expect((combiner as any).shortenIri('https://saref.etsi.org/core/hasValue', prefixes)).toBe('saref:hasValue');

    // Test default prefix shortening
    expect((combiner as any).shortenIri('https://rsp.js/window1', prefixes)).toBe(':window1');

    // Test no match - should return full IRI
    expect((combiner as any).shortenIri('http://example.org/sensor', prefixes)).toBe('<http://example.org/sensor>');
});

it("should test triple extraction from complex SPARQL", () => {
    const combiner = new QueryCombiner();

    const complexSparql = `
    PREFIX saref: <https://saref.etsi.org/core/>
    PREFIX : <https://rsp.js/>
    SELECT ?value WHERE {
        ?sensor saref:hasType :temperatureSensor .
        GRAPH :w1 {
            ?sensor saref:hasValue ?value .
            ?sensor saref:relatesToProperty :temperature .
        }
        GRAPH :w2 {
            ?device saref:hasValue ?value .
            ?device saref:relatesToProperty :humidity .
        }
    }`;

    const triples = (combiner as any).extractTriplesFromSparql(complexSparql);

    // Should extract direct triples and triples from both GRAPH blocks
    expect(triples.length).toBeGreaterThan(3);

    // Check for direct triple
    expect(triples.some((t: string[]) => t[0] === '?sensor' && t[1] === 'saref:hasType')).toBe(true);

    // Check for GRAPH triples
    expect(triples.some((t: string[]) => t[0] === '?sensor' && t[1] === 'saref:hasValue')).toBe(true);
    expect(triples.some((t: string[]) => t[0] === '?device' && t[1] === 'saref:hasValue')).toBe(true);
});

it("should test semantic context equivalence checking", () => {
    const combiner = new QueryCombiner();

    const contextA = new Set(['predicate:measures', 'entity:temp_sensor']);
    const contextB = new Set(['predicate:measures', 'entity:temp_sensor']);
    const contextC = new Set(['predicate:measures', 'entity:humidity_sensor']);

    // Test equivalent contexts
    expect((combiner as any).contextsAreEquivalent(contextA, contextB)).toBe(true);

    // Test different contexts
    expect((combiner as any).contextsAreEquivalent(contextA, contextC)).toBe(false);

    // Test different sizes
    const contextD = new Set(['predicate:measures']);
    expect((combiner as any).contextsAreEquivalent(contextA, contextD)).toBe(false);
});

it("should test variable semantic context extraction", () => {
    const combiner = new QueryCombiner();

    const query = new ParsedQuery();
    query.sparql = `SELECT ?temp WHERE {
        GRAPH :w1 {
            ?sensor saref:hasValue ?temp .
            ?sensor saref:relatesToProperty :temperature .
        }
    }`;
    query.prefixes.set('saref', 'https://saref.etsi.org/core/');
    query.prefixes.set('', 'https://rsp.js/');

    const ontology = {
        'saref:hasValue': 'measures',
        ':temperature': 'temp_property'
    };

    const context = (combiner as any).getVariableSemanticContext(query, 'temp', ontology);

    // Should contain normalized predicates and entities
    expect(context.has('predicate:measures')).toBe(true);
    // Note: entity:temp_property is not expected because ?temp only appears with saref:hasValue,
    // and the other term (?sensor) is a variable, not an entity
});

it("should test clearQueries functionality", () => {
    const combiner = new QueryCombiner();

    // Add some queries
    combiner.addQuery("SELECT * WHERE { ?s ?p ?o }");
    combiner.addQuery("SELECT ?x WHERE { ?x ?y ?z }");

    // Verify queries were added
    expect((combiner as any).queries.length).toBe(2);

    // Clear queries
    combiner.clearQueries();

    // Verify queries were cleared
    expect((combiner as any).queries.length).toBe(0);

    // Should throw error when trying to combine with no queries
    expect(() => combiner.combine()).toThrow("No queries to combine");
});
