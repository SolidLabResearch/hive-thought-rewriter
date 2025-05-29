import { RSPQLParser } from "../parser/RSPQLParser";
import { QueryCombiner } from "./QueryCombiner";

describe("QueryCombinerClass", () => {

    it("combiningTwoDifferentQueries", () => {
       
        const queryOne = `
            PREFIX ex: <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?age2) AS ?averageAge)
FROM NAMED WINDOW ex:w1 ON STREAM ex:stream1 [RANGE 10 STEP 5]
WHERE {
  WINDOW ex:w1 { 
    ?person a ex:Employee.
    ?person ex:hasAge ?age2.
  }
}
        `;
        const queryTwo = `
        PREFIX ex: <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?age) AS ?avgSubsetAge)
FROM NAMED WINDOW ex:w2 ON STREAM ex:stream1 [RANGE 10 STEP 5]
WHERE {
  WINDOW ex:w2 {
    ?person ex:hasAge ?age.
  }
}
        `;

        const queryThree = `
        
                PREFIX ex: <http://example.org/>
REGISTER RStream <output> AS
SELECT (AVG(?age3) AS ?ageThree)
FROM NAMED WINDOW ex:w3 ON STREAM ex:stream2 [RANGE 10 STEP 5]
WHERE {
  WINDOW ex:w3 {
    ?s ex:hasAge ?age3.
  }
}
        `;

        const combiner = new QueryCombiner();
        combiner.addQuery(queryOne);
        combiner.addQuery(queryTwo);
        combiner.addQuery(queryThree);

        let combined_parsedQuery = combiner.combine()
        
        console.log(combiner.ParsedToString(combined_parsedQuery));
        
        

    });

    it("combiningQueriesForActivityIndex", () => {
      const bigQuery = `PREFIX saref: <https://saref.etsi.org/core/>
PREFIX func: <http://extension.org/functions#> 
PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/>
PREFIX : <https://rsp.js> 
REGISTER RStream <output> AS
SELECT (func:sqrt(?o * ?o + ?o2 * ?o2 + ?o3 * ?o3) AS ?activityIndex)
FROM NAMED WINDOW :w1 ON STREAM <acc-x> [RANGE 60000 STEP 60000]
FROM NAMED WINDOW :w2 ON STREAM <acc-y> [RANGE 60000 STEP 60000]
FROM NAMED WINDOW :w3 ON STREAM <acc-z> [RANGE 60000 STEP 60000]
WHERE {
    WINDOW :w1 {
        ?s saref:hasValue ?o .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
    }
    WINDOW :w2 {
        ?s saref:hasValue ?o2 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .
    }   
    WINDOW :w3 {
        ?s saref:hasValue ?o3 .
        ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x .    
    }
}`;

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
}`;

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

const superQuery = "PREFIX saref: <https://saref.etsi.org/core/> PREFIX dahccsensors: <https://dahcc.idlab.ugent.be/Homelab/SensorsAndActuators/> PREFIX : <https://rsp.js> REGISTER RStream <output> AS SELECT (AVG(?o) AS ?avgX) (AVG(?o2) AS ?avgY) (AVG(?o3) AS ?avgZ) FROM NAMED WINDOW :w1 ON STREAM <acc-x> [RANGE 60000 STEP 60000] FROM NAMED WINDOW :w2 ON STREAM <acc-y> [RANGE 60000 STEP 60000] FROM NAMED WINDOW :w3 ON STREAM <acc-z> [RANGE 60000 STEP 60000] WHERE { { WINDOW :w1 { ?s saref:hasValue ?o . ?s saref:relatesToProperty dahccsensors:wearable.acceleration.x . } } } UNION { { WINDOW :w2 { ?s saref:hasValue ?o2 . ?s saref:relatesToProperty dahccsensors:wearable.acceleration.y . } } } UNION { { WINDOW :w3 { ?s saref:hasValue ?o3 . ?s saref:relatesToProperty dahccsensors:wearable.acceleration.z . } } }"

console.log(superQuery);

console.log(new RSPQLParser().parse(queryThree));

      const combiner = new QueryCombiner();
      combiner.addQuery(queryOne);
      combiner.addQuery(queryTwo);
      combiner.addQuery(queryThree);

      let combined_parsedQuery = combiner.combine()
      
      console.log(combiner.ParsedToString(combined_parsedQuery));
      
      
    });

});