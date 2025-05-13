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
});