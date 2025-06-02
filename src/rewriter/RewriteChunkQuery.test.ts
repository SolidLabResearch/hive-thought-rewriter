import { RewriteChunkQuery } from "./RewriteChunkQuery";

describe("RewriteChunkQuery", () => {
    it("should rewrite the query with new chunk size", () => {
        const originalQuery = `
            PREFIX ex: <http://example.org/>
            REGISTER RStream <output> AS
            SELECT (AVG(?age) AS ?averageAge)
            FROM NAMED WINDOW ex:w ON STREAM ex:stream [RANGE 10 STEP 5]
            WHERE {
                WINDOW ex:w {
                    ?person a ex:Employee.
                    ?person ex:hasAge ?age.
                }
            }
        `;

        const rewriter = new RewriteChunkQuery(15, 30);
        const rewrittenQuery = rewriter.rewriteQueryWithNewChunkSize(originalQuery);        
        expect(rewrittenQuery).toContain("REGISTER RStream <output> AS");
        expect(rewrittenQuery).toContain("SELECT (AVG(?age) AS ?averageAge)");
        expect(rewrittenQuery).toContain("FROM NAMED WINDOW ex:w ON STREAM ex:stream [RANGE 30 STEP 15]");
        expect(rewrittenQuery).toContain("WINDOW ex:w {");
        expect(rewrittenQuery).toContain("?person a ex:Employee.");
        expect(rewrittenQuery).toContain("?person ex:hasAge ?age.");
        expect(rewrittenQuery).toContain("SELECT");
        expect(rewrittenQuery).toContain("FROM NAMED WINDOW");
        expect(rewrittenQuery).toContain("WHERE {");    
        expect(rewrittenQuery).toContain("WINDOW ex:w {");
        expect(rewrittenQuery).toContain("?person a ex:Employee.");
        expect(rewrittenQuery).toContain("?person ex:hasAge ?age.");        
        expect(rewrittenQuery).toContain("RANGE 30");
        expect(rewrittenQuery).toContain("STEP 15");
    });
});