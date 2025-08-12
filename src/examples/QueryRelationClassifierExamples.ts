import { QueryRelationClassifier } from '../services/QueryRelationClassifier';

// Example usage of QueryRelationClassifier
const main = () => {
    console.log('QueryRelationClassifier Examples\n');

    // Example ontology mapping
    const ontology = {
        "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearableX": "PersonX",
        "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphoneX": "PersonX"
    };

    // Example 1: JOIN due to shared variables
    const queryA1 = `
        PREFIX ex: <http://example.org/>
        SELECT ?person WHERE {
            ?person ex:name "Alice" .
        }
    `;
    const queryB1 = `
        PREFIX ex: <http://example.org/>
        SELECT ?person WHERE {
            ?person ex:age 25 .
        }
    `;

    const classifier1 = new QueryRelationClassifier(queryA1, queryB1);
    console.log('Example 1 - Shared Variables:');
    console.log('Result:', classifier1.decideInstanceRelation());
    console.log('Expected: JOIN\n');

    // Example 2: UNION due to shared predicates
    const queryA2 = `
        PREFIX ex: <http://example.org/>
        SELECT ?x WHERE {
            ?x ex:name "Alice" .
        }
    `;
    const queryB2 = `
        PREFIX ex: <http://example.org/>
        SELECT ?y WHERE {
            ?y ex:name "Bob" .
        }
    `;

    const classifier2 = new QueryRelationClassifier('', '');
    console.log('Example 2 - Shared Predicates:');
    console.log('Result:', classifier2.decideRelation(queryA2, queryB2));
    console.log('Expected: UNION\n');

    // Example 3: JOIN due to ontology mapping
    const queryA3 = `
        PREFIX ex: <http://example.org/>
        SELECT ?data WHERE {
            ?data ex:source <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearableX> .
        }
    `;
    const queryB3 = `
        PREFIX ex: <http://example.org/>
        SELECT ?info WHERE {
            ?info ex:origin <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphoneX> .
        }
    `;

    const classifier3 = new QueryRelationClassifier(queryA3, queryB3);
    console.log('Example 3 - Ontology Mapping:');
    console.log('Without ontology:', classifier3.decideInstanceRelation());
    console.log('With ontology:', classifier3.decideInstanceRelation(ontology));
    console.log('Expected: UNION -> JOIN\n');

    // Example 4: CARTESIAN for unrelated queries
    const queryA4 = `
        PREFIX ex: <http://example.org/>
        SELECT ?person WHERE {
            ?person ex:name "Alice" .
        }
    `;
    const queryB4 = `
        PREFIX weather: <http://weather.org/>
        SELECT ?temp WHERE {
            ?temp weather:celsius 25 .
        }
    `;

    const classifier4 = new QueryRelationClassifier('', '');
    console.log('Example 4 - Unrelated Queries:');
    console.log('Result:', classifier4.decideRelation(queryA4, queryB4));
    console.log('Expected: CARTESIAN\n');

    // Example 5: RSP-QL queries (BGP extracted)
    const rspQuery1_bgp = `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        SELECT ?value WHERE {
            ?s1 saref:hasValue ?value .
            ?s1 saref:relatesToProperty dahccsensors:wearableX .
        }
    `;
    const rspQuery2_bgp = `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        SELECT ?value WHERE {
            ?s2 saref:hasValue ?value .
            ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
        }
    `;

    const classifier5 = new QueryRelationClassifier('', '');
    console.log('Example 5 - RSP-QL Queries (BGP extracted):');
    console.log('Without ontology:', classifier5.decideRelation(rspQuery1_bgp, rspQuery2_bgp));
    console.log('With ontology:', classifier5.decideRelation(rspQuery1_bgp, rspQuery2_bgp, ontology));
    console.log('Expected: JOIN -> JOIN (shared variable ?value)');
    console.log('Note: Both queries share the variable ?value, making them joinable\n');

    // Example 6: Enhanced Semantic Analysis - Same variable names, different entities
    const semanticQuery1 = `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        SELECT ?value WHERE {
            ?s1 saref:hasValue ?value .
            ?s1 saref:relatesToProperty dahccsensors:wearableX .
        }
    `;
    const semanticQuery2 = `
        PREFIX saref: <https://saref.etsi.org/core/>
        PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
        SELECT ?value WHERE {
            ?s2 saref:hasValue ?value .
            ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
        }
    `;

    const classifier6 = new QueryRelationClassifier('', '');
    console.log('Example 6 - Enhanced Semantic Analysis:');
    console.log('Same variable name (?value) but different semantic entities');
    console.log('Without ontology:', classifier6.decideRelation(semanticQuery1, semanticQuery2));
    console.log('With ontology:', classifier6.decideRelation(semanticQuery1, semanticQuery2, ontology));
    console.log('Expected: UNION -> JOIN');
    console.log('Explanation: Algorithm detects that ?value is bound to different entities');
    console.log('(wearableX vs smartphoneX) without ontology, same entity (PersonX) with ontology\n');
};

// Uncomment to run examples
// main();
