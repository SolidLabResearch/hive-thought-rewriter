import { QueryDecomposer } from "./QueryDecomposer";

describe("QueryDecomposer", () => {
    it("should decompose a query", () => {
        const decomposer = new QueryDecomposer();
        const query = "SELECT * WHERE { ?s ?p ?o }";
        const result = decomposer.decompose(query);

        expect(result).toBeDefined();
        expect(result.sparql).toBe(query);
    });
});