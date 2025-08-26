import { RSPQLParser } from "../parser/RSPQLParser";
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

