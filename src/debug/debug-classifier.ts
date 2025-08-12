import { QueryRelationClassifier } from '../services/QueryRelationClassifier';

const query1 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
SELECT ?wearableValue WHERE {
    ?s1 saref:hasValue ?wearableValue .
    ?s1 saref:relatesToProperty dahccsensors:wearableX .
}
`;

const query2 = `
PREFIX saref: <https://saref.etsi.org/core/>
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
SELECT ?smartphoneValue WHERE {
    ?s2 saref:hasValue ?smartphoneValue .
    ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
}
`;

// Create a modified classifier for debugging
class DebugQueryRelationClassifier extends QueryRelationClassifier {
    debugDecideRelation(queryA: string, queryB: string, ontology: Record<string, string> = {}): "JOIN" | "UNION" | "CARTESIAN" {
        const bgpA = this.extractBGP(queryA);
        const bgpB = this.extractBGP(queryB);

        console.log('BGP A:', bgpA);
        console.log('BGP B:', bgpB);

        // Check for shared variables BEFORE canonicalization
        const rawVarsA = new Set(bgpA.flat().filter(t => t.startsWith("?")));
        const rawVarsB = new Set(bgpB.flat().filter(t => t.startsWith("?")));
        const sharedRawVars = [...rawVarsA].filter(v => rawVarsB.has(v));

        console.log('Raw variables A:', [...rawVarsA]);
        console.log('Raw variables B:', [...rawVarsB]);
        console.log('Shared raw variables:', sharedRawVars);

        if (sharedRawVars.length > 0) {
            console.log('DECISION: JOIN (shared variables)');
            return "JOIN";
        }

        // Apply ontology normalization to constants
        const normA = bgpA.map(([s, p, o]) => [
            this.normalizeWithOntology(s, ontology),
            this.normalizeWithOntology(p, ontology),
            this.normalizeWithOntology(o, ontology)
        ]) as [string, string, string][];
        const normB = bgpB.map(([s, p, o]) => [
            this.normalizeWithOntology(s, ontology),
            this.normalizeWithOntology(p, ontology),
            this.normalizeWithOntology(o, ontology)
        ]) as [string, string, string][];

        console.log('Normalized A:', normA);
        console.log('Normalized B:', normB);

        // Detect shared constants (subjects and objects only, not predicates) after ontology mapping
        const constantsA = new Set<string>();
        const constantsB = new Set<string>();
        
        // Add non-variable subjects and objects to constants sets
        normA.forEach(([s, p, o]) => {
            if (!s.startsWith("?")) constantsA.add(s);
            if (!o.startsWith("?")) constantsA.add(o);
        });
        normB.forEach(([s, p, o]) => {
            if (!s.startsWith("?")) constantsB.add(s);
            if (!o.startsWith("?")) constantsB.add(o);
        });

        console.log('Constants A (subjects & objects only):', [...constantsA]);
        console.log('Constants B (subjects & objects only):', [...constantsB]);

        const sharedConstants = [...constantsA].filter(c => constantsB.has(c));
        console.log('Shared constants:', sharedConstants);

        if (sharedConstants.length > 0) {
            console.log('DECISION: JOIN (shared constants)');
            return "JOIN";
        }

        // If semantically related (same predicates), UNION
        const predsA = new Set(normA.map(([, p]) => p));
        const predsB = new Set(normB.map(([, p]) => p));
        console.log('Predicates A:', [...predsA]);
        console.log('Predicates B:', [...predsB]);
        
        const sharedPredicates = [...predsA].filter(p => predsB.has(p));
        console.log('Shared predicates:', sharedPredicates);
        
        if (sharedPredicates.length > 0) {
            console.log('DECISION: UNION (shared predicates)');
            return "UNION";
        }

        console.log('DECISION: CARTESIAN (no shared elements)');
        return "CARTESIAN";
    }
}

const debugClassifier = new DebugQueryRelationClassifier('', '');
console.log('=== DEBUGGING SEMANTIC QUERY CLASSIFICATION ===');
const result = debugClassifier.debugDecideRelation(query1, query2, {});
console.log('Final result:', result);
