import { QueryRelationClassifier } from './QueryRelationClassifier';

describe('QueryRelationClassifier', () => {
    let classifier: QueryRelationClassifier;

    beforeEach(() => {
        classifier = new QueryRelationClassifier('', '');
    });

    describe('JOIN scenarios', () => {
        test('should return JOIN when queries share variables', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?person WHERE {
                    ?person ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?person WHERE {
                    ?person ex:age 25 .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('JOIN');
        });

        test('should return JOIN when queries share constants', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:livesIn ex:Paris .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:worksIn ex:Paris .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('JOIN');
        });

        test('should return JOIN when queries share constants through ontology mapping', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?data WHERE {
                    ?data ex:source <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearableX> .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?info WHERE {
                    ?info ex:origin <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphoneX> .
                }
            `;

            const ontology = {
                "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearableX": "PersonX",
                "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphoneX": "PersonX"
            };

            const result = classifier.decideRelation(queryA, queryB, ontology);
            expect(result).toBe('JOIN');
        });

        test('should return JOIN with complex shared variables', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?person ?name WHERE {
                    ?person ex:name ?name .
                    ?person ex:type ex:Student .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?person ?age WHERE {
                    ?person ex:age ?age .
                    ?person ex:grade ex:A .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('JOIN');
        });
    });

    describe('UNION scenarios', () => {
        test('should return UNION when queries share predicates but no variables or constants', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:name "Bob" .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION');
        });

        test('should return UNION for semantically related queries with same predicate structure', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?student WHERE {
                    ?student ex:studies ex:Mathematics .
                    ?student ex:year 2023 .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?pupil WHERE {
                    ?pupil ex:studies ex:Physics .
                    ?pupil ex:year 2024 .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION');
        });

        test('should return UNION when queries have overlapping predicates', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x ?name WHERE {
                    ?x ex:name ?name .
                    ?x ex:department ex:CS .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y ?title WHERE {
                    ?y ex:name ?title .
                    ?y ex:position ex:Professor .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION');
        });
    });

    describe('CARTESIAN scenarios', () => {
        test('should return CARTESIAN when queries are completely unrelated', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?person WHERE {
                    ?person ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX weather: <http://weather.org/>
                SELECT ?temp WHERE {
                    ?temp weather:celsius 25 .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('CARTESIAN');
        });

        test('should return CARTESIAN for completely different domains', () => {
            const queryA = `
                PREFIX book: <http://book.org/>
                SELECT ?book WHERE {
                    ?book book:author "Tolkien" .
                    ?book book:genre book:Fantasy .
                }
            `;
            const queryB = `
                PREFIX car: <http://car.org/>
                SELECT ?vehicle WHERE {
                    ?vehicle car:brand car:Toyota .
                    ?vehicle car:color car:Red .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('CARTESIAN');
        });
    });

    describe('Variable canonicalization', () => {
        test('should handle different variable names correctly for JOIN', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?alice WHERE {
                    ?alice ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?bob WHERE {
                    ?bob ex:age 25 .
                }
            `;

            // After canonicalization, both ?alice and ?bob become ?v0
            // but they don't share constants, so should check predicates
            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('CARTESIAN'); // Different predicates, no shared constants
        });

        test('should canonicalize variables consistently', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x ?y WHERE {
                    ?x ex:knows ?y .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?a ?b WHERE {
                    ?a ex:knows ?b .
                }
            `;

            // After canonicalization, both should be identical
            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION'); // Same structure, same predicates
        });
    });

    describe('Ontology mapping', () => {
        test('should apply ontology mapping correctly', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?data WHERE {
                    ?data ex:from <https://sensor1.example.org> .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?info WHERE {
                    ?info ex:from <https://sensor2.example.org> .
                }
            `;

            const ontology = {
                "https://sensor1.example.org": "Device1",
                "https://sensor2.example.org": "Device1"
            };

            const resultWithOntology = classifier.decideRelation(queryA, queryB, ontology);
            expect(resultWithOntology).toBe('JOIN');

            const resultWithoutOntology = classifier.decideRelation(queryA, queryB);
            expect(resultWithoutOntology).toBe('UNION'); // Same predicate, different constants
        });

        test('should handle partial ontology mappings', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:device <https://sensor1.example.org> .
                    ?x ex:location <https://room1.example.org> .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:device <https://sensor2.example.org> .
                    ?y ex:location <https://room2.example.org> .
                }
            `;

            const partialOntology = {
                "https://sensor1.example.org": "SensorType1",
                "https://sensor2.example.org": "SensorType1"
                // Note: room locations are not mapped
            };

            const result = classifier.decideRelation(queryA, queryB, partialOntology);
            expect(result).toBe('JOIN'); // Should join on the mapped sensor devices
        });
    });

    describe('Instance methods', () => {
        test('should use instance variables with decideInstanceRelation', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:age 25 .
                }
            `;

            const instanceClassifier = new QueryRelationClassifier(queryA, queryB);
            const result = instanceClassifier.decideInstanceRelation();
            expect(result).toBe('JOIN'); // Shared variable ?x
        });

        test('should use instance variables with ontology', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?data WHERE {
                    ?data ex:source <https://wearable.example.org> .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?info WHERE {
                    ?info ex:source <https://smartphone.example.org> .
                }
            `;

            const ontology = {
                "https://wearable.example.org": "PersonDevice",
                "https://smartphone.example.org": "PersonDevice"
            };

            const instanceClassifier = new QueryRelationClassifier(queryA, queryB);
            const result = instanceClassifier.decideInstanceRelation(ontology);
            expect(result).toBe('JOIN');
        });
    });

    describe('Edge cases', () => {
        test('should handle queries with multiple triples', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?person ?name ?age WHERE {
                    ?person ex:name ?name .
                    ?person ex:age ?age .
                    ?person ex:type ex:Student .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?student ?course WHERE {
                    ?student ex:enrolledIn ?course .
                    ?student ex:semester ex:Spring2024 .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('CARTESIAN'); // No shared variables, constants, or predicates
        });

        test('should handle blank nodes', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:hasAddress _:addr1 .
                    _:addr1 ex:street "Main St" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:hasAddress _:addr2 .
                    _:addr2 ex:city "Boston" .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION'); // Same predicate structure
        });

        test('should handle literal values', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    ?x ex:score 95 .
                    ?x ex:subject "Math" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:score 87 .
                    ?y ex:subject "Physics" .
                }
            `;

            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION'); // Same predicates, different literal values
        });

        test('should handle malformed queries gracefully', () => {
            const malformedQuery = `
                PREFIX ex: <http://example.org/>
                SELECT ?x WHERE {
                    INVALID SYNTAX
                }
            `;
            const validQuery = `
                PREFIX ex: <http://example.org/>
                SELECT ?y WHERE {
                    ?y ex:name "Alice" .
                }
            `;

            // Should not crash, should return CARTESIAN for empty BGP
            expect(() => {
                const result = classifier.decideRelation(malformedQuery, validQuery);
                expect(result).toBe('CARTESIAN');
            }).not.toThrow();
        });
    });

    describe('Semantic Variable Binding Analysis', () => {
        test('should detect when same variable names represent different semantic entities', () => {
            const queryA = `
                PREFIX saref: <https://saref.etsi.org/core/>
                PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
                SELECT ?value WHERE {
                    ?s1 saref:hasValue ?value .
                    ?s1 saref:relatesToProperty dahccsensors:wearableX .
                }
            `;
            const queryB = `
                PREFIX saref: <https://saref.etsi.org/core/>
                PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
                SELECT ?value WHERE {
                    ?s2 saref:hasValue ?value .
                    ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
                }
            `;

            // Without ontology: different entities -> UNION
            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('UNION');
        });

        test('should return JOIN when same variable names represent same semantic entities via ontology', () => {
            const queryA = `
                PREFIX saref: <https://saref.etsi.org/core/>
                PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
                SELECT ?value WHERE {
                    ?s1 saref:hasValue ?value .
                    ?s1 saref:relatesToProperty dahccsensors:wearableX .
                }
            `;
            const queryB = `
                PREFIX saref: <https://saref.etsi.org/core/>
                PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
                SELECT ?value WHERE {
                    ?s2 saref:hasValue ?value .
                    ?s2 saref:relatesToProperty dahccsensors:smartphoneX .
                }
            `;

            const ontology = {
                "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/wearableX": "PersonX",
                "https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/smartphoneX": "PersonX"
            };

            // With ontology: same semantic entity -> JOIN
            const result = classifier.decideRelation(queryA, queryB, ontology);
            expect(result).toBe('JOIN');
        });

        test('should handle traditional JOIN when variables truly represent the same concept', () => {
            const queryA = `
                PREFIX ex: <http://example.org/>
                SELECT ?person WHERE {
                    ?person ex:name "Alice" .
                }
            `;
            const queryB = `
                PREFIX ex: <http://example.org/>
                SELECT ?person WHERE {
                    ?person ex:age 25 .
                }
            `;

            // Same variable with no semantic binding context -> traditional JOIN
            const result = classifier.decideRelation(queryA, queryB);
            expect(result).toBe('JOIN');
        });
    });
});
