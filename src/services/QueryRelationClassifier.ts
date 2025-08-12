const sparqlParser = require('sparqljs').Parser;
const SPARQLParser = new sparqlParser();

type OntologyMap = Record<string, string>;
type TriplePattern = [string, string, string];

export class QueryRelationClassifier {
    private queryOne: string;
    private queryTwo: string;
    

    constructor(queryOne: string, queryTwo: string) {
        this.queryOne = queryOne;
        this.queryTwo = queryTwo;
    }

    decideRelation(queryA: string, queryB: string, ontology: OntologyMap = {}): "JOIN" | "UNION" | "CARTESIAN" {
        const bgpA = this.extractBGP(queryA);
        const bgpB = this.extractBGP(queryB);

        const rawVarsA = new Set(bgpA.flat().filter(t => t.startsWith("?")));
        const rawVarsB = new Set(bgpB.flat().filter(t => t.startsWith("?")));
        const sharedRawVars = [...rawVarsA].filter(v => rawVarsB.has(v));

        if (sharedRawVars.length > 0) {
            // Enhanced semantic analysis: Check if shared variables are bound to different entities
            const areVariablesBoundToDifferentEntities = this.checkSemanticVariableBinding(
                bgpA, bgpB, sharedRawVars, ontology
            );
            
            if (areVariablesBoundToDifferentEntities) {
                // Variables have same name but different semantic meaning - treat as UNION
                // Continue to predicate analysis instead of returning JOIN
            } else {
                return "JOIN";
            }
        }

        // Apply ontology normalization to constants
        const normA = bgpA.map(([s, p, o]) => [
            this.normalizeWithOntology(s, ontology),
            this.normalizeWithOntology(p, ontology),
            this.normalizeWithOntology(o, ontology)
        ]) as TriplePattern[];
        const normB = bgpB.map(([s, p, o]) => [
            this.normalizeWithOntology(s, ontology),
            this.normalizeWithOntology(p, ontology),
            this.normalizeWithOntology(o, ontology)
        ]) as TriplePattern[];

        // Detect shared constants (subjects and objects only, not predicates) after ontology mapping
        const constantsA = new Set();
        const constantsB = new Set();
        
        // Add non-variable subjects and objects to constants sets
        normA.forEach(([s, p, o]) => {
            if (!s.startsWith("?")) constantsA.add(s);
            if (!o.startsWith("?")) constantsA.add(o);
        });
        normB.forEach(([s, p, o]) => {
            if (!s.startsWith("?")) constantsB.add(s);
            if (!o.startsWith("?")) constantsB.add(o);
        });

        const sharedConstants = [...constantsA].filter(c => constantsB.has(c));

        if (sharedConstants.length > 0) {
            return "JOIN"; // Now it's joinable because of ontology
        }

        // If semantically related (same predicates), UNION
        const predsA = new Set(normA.map(([, p]) => p));
        const predsB = new Set(normB.map(([, p]) => p));
        const sharedPredicates = [...predsA].filter(p => predsB.has(p));
        if (sharedPredicates.length > 0) {
            return "UNION";
        }

        return "CARTESIAN";
    }

    // Convenience method using instance variables
    decideInstanceRelation(ontology: OntologyMap = {}): "JOIN" | "UNION" | "CARTESIAN" {
        return this.decideRelation(this.queryOne, this.queryTwo, ontology);
    }

    protected extractBGP(query: string): TriplePattern[] {
        try {
            const sparql_parsed = SPARQLParser.parse(query);
            
            if (!sparql_parsed.where || sparql_parsed.where.length === 0) {
                console.warn('Query has no WHERE clause:', query);
                return [];
            }
            
            const firstWhereClause = sparql_parsed.where[0];
            if (!firstWhereClause.triples || firstWhereClause.triples.length === 0) {
                console.warn('Query WHERE clause has no triples:', query);
                return [];
            }
            
            const basicGraphPattern = firstWhereClause.triples;
            
            return basicGraphPattern.map((triple: any) => [
                this.termToString(triple.subject),
                this.termToString(triple.predicate),
                this.termToString(triple.object)
            ]);
        } catch (error) {
            console.error('Error parsing SPARQL query:', query, error);
            return [];
        }
    }

    private termToString(term: any): string {
        if (!term) {
            console.warn('Received null or undefined term');
            return '';
        }
        
        try {
            if (term.termType === 'Variable') {
                return `?${term.value || 'unknown'}`;
            } else if (term.termType === 'NamedNode') {
                return term.value || '';
            } else if (term.termType === 'Literal') {
                return term.value || '';
            } else if (term.termType === 'BlankNode') {
                return `_:${term.value || 'unknown'}`;
            }
            return term.value || term.toString() || '';
        } catch (error) {
            console.error('Error converting term to string:', term, error);
            return '';
        }
    }

    protected normalizeWithOntology(term: string, ontology: OntologyMap): string {
        // If it's a variable, return as-is
        if (term.startsWith('?')) {
            return term;
        }

        // Check if this constant has an ontology mapping
        return ontology[term] || term;
    }

    /**
     * Checks if shared variables are bound to different entities, making them semantically different
     * even though they have the same variable name.
     */
    private checkSemanticVariableBinding(
        bgpA: TriplePattern[], 
        bgpB: TriplePattern[], 
        sharedVars: string[], 
        ontology: OntologyMap
    ): boolean {
        for (const sharedVar of sharedVars) {
            // Get the semantic context of the shared variable in both queries
            const contextA = this.getVariableSemanticContext(bgpA, sharedVar, ontology);
            const contextB = this.getVariableSemanticContext(bgpB, sharedVar, ontology);
            
            if (this.areContextsDifferent(contextA, contextB)) {
                return true; // Same variable name, different semantic contexts
            }
        }
        return false; // Variables have the same semantic context
    }

    /**
     * Gets the semantic context of a variable by analyzing what entities it's connected to
     */
    private getVariableSemanticContext(bgp: TriplePattern[], variable: string, ontology: OntologyMap): Set<string> {
        const context = new Set<string>();
        
        // Find all triples where this variable appears
        const relevantTriples = bgp.filter(([s, p, o]) => s === variable || p === variable || o === variable);
        
        for (const [s, p, o] of relevantTriples) {
            const normalizedPredicate = this.normalizeWithOntology(p, ontology);
            
            if (variable === o) {
                // Variable is the object - look at what subject relates to what property
                // Find triples where the subject relates to specific properties
                const subjectTriples = bgp.filter(([subS, subP, subO]) => subS === s);
                for (const [, subP, subO] of subjectTriples) {
                    if (subP === 'https://saref.etsi.org/core/relatesToProperty' && !subO.startsWith('?')) {
                        context.add(this.normalizeWithOntology(subO, ontology));
                    }
                }
            }
            
            // Also check direct entity binding predicates
            const entityBindingPredicates = [
                'https://saref.etsi.org/core/relatesToProperty',
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
                'https://saref.etsi.org/core/isPropertyOf',
                'https://saref.etsi.org/core/measuresProperty'
            ];
            
            if (entityBindingPredicates.includes(normalizedPredicate)) {
                if (variable === s && !o.startsWith('?')) {
                    context.add(this.normalizeWithOntology(o, ontology));
                } else if (variable === o && !s.startsWith('?')) {
                    context.add(this.normalizeWithOntology(s, ontology));
                }
            }
        }
        
        return context;
    }

    /**
     * Determines if two semantic contexts represent different entities
     */
    private areContextsDifferent(contextA: Set<string>, contextB: Set<string>): boolean {
        // If either context is empty, we can't determine difference
        if (contextA.size === 0 || contextB.size === 0) {
            return false;
        }
        
        // Check if there's no overlap between the contexts
        const intersection = [...contextA].filter(entity => contextB.has(entity));
        return intersection.length === 0;
    }
}